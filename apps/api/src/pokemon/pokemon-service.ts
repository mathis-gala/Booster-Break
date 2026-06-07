import type {
  CollectionSort,
  CollectionSource,
  OpenPackResponse,
  OwnedCardIdsResponse,
  PackOpenStatusResponse,
  PokemonCardSummary,
  PokemonSetSummary,
  RecycleCardsRequest,
  RecycleCardsResponse,
  SupportedLocale,
  UserCollectionResponse,
} from '@tcg-collection/shared'
import { DEFAULT_LOCALE, getRarityRank, RECYCLE_COST } from '@tcg-collection/shared'
import { AuthService } from '../auth/auth-service'
import type { AuthUser } from '../auth/types'
import { PokemonRepository, RecycleConflictError } from './pokemon-repository'
import {
  PACK_OPEN_COOLDOWN_SECONDS,
  POKEMON_SYNC_START_DATE,
  SYNCED_BOOSTER_LIMIT,
} from './pokemon-config'
import { drawPokemonPackCards } from './pack-draft'
import { getBoosterChargeStatus, PackCooldownError } from './pack-cooldown'
import { drawRecycleRewards } from './recycle-draft'
import { PokemonCatalogSyncService } from './pokemon-catalog-sync-service'
import { ScrydexSealedClient } from './scrydex-sealed-client'
import { TcgDexClient } from './tcgdex-client'

export interface PokemonServiceOptions {
  authService: AuthService
  localizedPokemonClients: Record<SupportedLocale, TcgDexClient>
  pokemonClient: TcgDexClient
  pokemonRepository: PokemonRepository
  sealedClient: ScrydexSealedClient
}

export type PokemonServiceErrorCode =
  | 'pack_cooldown'
  | 'pack_unavailable'
  | 'pokemon_sets_not_synced'
  | 'recycle_conflict'
  | 'recycle_invalid'
  | 'recycle_nothing'
  | 'unauthenticated'

interface RecycleBucket {
  rarityRank: number
  items: Array<{ cardId: string; finish: string; quantity: number }>
  total: number
}

export interface PokemonServiceError {
  error: PokemonServiceErrorCode
  message: string
}

interface PokemonSyncResult {
  ok: true
  sets: number
  cards: number
  syncedAt: string
}

export class PokemonService {
  private syncPromise?: Promise<PokemonSyncResult>
  private readonly catalogSyncService: PokemonCatalogSyncService

  constructor(private readonly options: PokemonServiceOptions) {
    this.catalogSyncService = new PokemonCatalogSyncService(options)
  }

  async listSets(locale: SupportedLocale): Promise<PokemonSetSummary[]> {
    const sets = await this.options.pokemonRepository.listSets(locale)

    if (sets.length > 0) {
      return sets
    }

    await this.ensurePokemonDataSynced()

    return this.options.pokemonRepository.listSets(locale)
  }

  async listCards(
    setId: string | undefined,
    locale: SupportedLocale,
  ): Promise<PokemonCardSummary[]> {
    return this.options.pokemonRepository.listCards(setId, locale)
  }

  async listUserCollection(
    user: AuthUser,
    options: {
      page: number
      pageSize: number
      sort: CollectionSort
      source: CollectionSource
      locale: SupportedLocale
      setId?: string
    },
  ): Promise<UserCollectionResponse> {
    return this.options.pokemonRepository.listUserCollection(user.id, options)
  }

  async listOwnedCardIds(user: AuthUser): Promise<OwnedCardIdsResponse> {
    const cardIds = await this.options.pokemonRepository.listOwnedCardIds(user.id)

    return { cardIds }
  }

  async getPackOpenStatus(cookieHeader: string | undefined): Promise<PackOpenStatusResponse> {
    const user = await this.options.authService.getCurrentUser(cookieHeader)

    if (!user) {
      return {
        authenticated: false,
        canOpen: false,
        cooldownSeconds: 0,
        cooldownDurationSeconds: PACK_OPEN_COOLDOWN_SECONDS,
      }
    }

    return this.getPackOpenStatusForUser(user.id)
  }

  private async syncPokemonData(): Promise<PokemonSyncResult> {
    if (this.syncPromise) {
      return this.syncPromise
    }

    this.syncPromise = this.syncPokemonDataNow().finally(() => {
      this.syncPromise = undefined
    })

    return this.syncPromise
  }

  private async syncPokemonDataNow(): Promise<PokemonSyncResult> {
    const syncedAt = new Date().toISOString()
    const recentSets = await this.options.pokemonClient.getRecentSets(
      POKEMON_SYNC_START_DATE,
      toPokemonDate(new Date()),
    )
    let cardCount = 0
    let setCount = 0

    for (const set of recentSets) {
      if (setCount >= SYNCED_BOOSTER_LIMIT) {
        break
      }

      const boosterImageUrl = await this.options.sealedClient.getBoosterImageUrl(set)

      if (!boosterImageUrl) {
        continue
      }

      const syncedSet = await this.catalogSyncService.syncSet(set, {
        syncedAt,
        boosterImageUrl,
      })
      cardCount += syncedSet.cards
      setCount += 1
    }

    return {
      ok: true,
      sets: setCount,
      cards: cardCount,
      syncedAt,
    }
  }

  private async ensurePokemonDataSynced(): Promise<void> {
    await this.syncPokemonData()
  }

  async openPack(
    user: AuthUser,
    input: { setId?: string; locale?: SupportedLocale },
  ): Promise<OpenPackResponse | PokemonServiceError> {
    const locale = input.locale ?? DEFAULT_LOCALE
    const setId = input.setId ?? (await this.options.pokemonRepository.listSets(locale))[0]?.id

    if (!setId) {
      return {
        error: 'pokemon_sets_not_synced',
        message: 'Sync Pokemon sets before opening a booster.',
      }
    }

    const set = await this.options.pokemonRepository.getSet(setId, locale)

    if (!set) {
      return {
        error: 'pack_unavailable',
        message: 'No cards are available for this booster set.',
      }
    }

    const packOpenStatus = await this.getPackOpenStatusForUser(user.id)

    if (!packOpenStatus.canOpen) {
      return {
        error: 'pack_cooldown',
        message: `Next booster available in ${packOpenStatus.cooldownSeconds}s.`,
      }
    }

    const cards = await this.drawPackCards(setId, locale)

    if (cards.length === 0) {
      return {
        error: 'pack_unavailable',
        message: 'No cards are available for this booster set.',
      }
    }

    let openingId: string
    let newCardIds: string[]

    try {
      ;({ openingId, newCardIds } = await this.options.pokemonRepository.recordPackOpening(
        user.id,
        set.id,
        cards,
      ))
    } catch (error) {
      if (error instanceof PackCooldownError) {
        return { error: 'pack_cooldown', message: error.message }
      }
      throw error
    }

    const newCardIdSet = new Set(newCardIds)

    return {
      openingId,
      set,
      cards: cards.map((card) => ({ ...card, isNew: newCardIdSet.has(card.id) })),
    }
  }

  async recycleCards(
    user: AuthUser,
    input: RecycleCardsRequest,
  ): Promise<RecycleCardsResponse | PokemonServiceError> {
    const locale = input.locale ?? DEFAULT_LOCALE
    const items = mergeRecycleItems(input.items)

    if (items.length === 0) {
      return {
        error: 'recycle_invalid',
        message: 'Select cards to recycle.',
      }
    }

    const cardIds = [...new Set(items.map((item) => item.cardId))]
    const [ownedRows, reservedRows] = await Promise.all([
      this.options.pokemonRepository.listOwnedRecycleRows(user.id, cardIds),
      this.options.pokemonRepository.listRecycleReservedQuantities(user.id, cardIds),
    ])
    const ownedByKey = new Map(ownedRows.map((row) => [`${row.cardId}:${row.finish}`, row]))
    // Copies committed to a live trade are not recyclable: trades settle against
    // user_cards later, so spending them here would leave a dangling trade.
    const reservedByKey = new Map(
      reservedRows.map((row) => [`${row.cardId}:${row.finish}`, row.quantity]),
    )

    const buckets = new Map<number, RecycleBucket>()

    for (const item of items) {
      const owned = ownedByKey.get(`${item.cardId}:${item.finish}`)
      const reserved = reservedByKey.get(`${item.cardId}:${item.finish}`) ?? 0
      const available = (owned?.quantity ?? 0) - reserved

      if (!owned || available < item.quantity) {
        // Distinguish "you never had enough" from "enough, but reserved for trade"
        // so the player knows to cancel the trade rather than hunt for copies.
        const blockedByTrade = owned !== undefined && owned.quantity >= item.quantity
        return {
          error: 'recycle_invalid',
          message: blockedByTrade
            ? 'Some selected cards are reserved for an active trade. Cancel the trade or deselect them.'
            : 'You do not own enough copies of a selected card.',
        }
      }

      const rarityRank = getRarityRank(owned.rarity)

      if (rarityRank >= UNKNOWN_RARITY_RANK) {
        continue
      }

      const bucket = buckets.get(rarityRank) ?? { rarityRank, items: [], total: 0 }
      bucket.items.push(item)
      bucket.total += item.quantity
      buckets.set(rarityRank, bucket)
    }

    let candidates: PokemonCardSummary[] | undefined
    const consumed: Array<{ cardId: string; finish: string; quantity: number }> = []
    const awardedCards: PokemonCardSummary[] = []

    // Lowest rarity first so awarded cards line up with the client's animation order.
    const orderedBuckets = [...buckets.values()].sort(
      (first, second) => first.rarityRank - second.rarityRank,
    )

    for (const bucket of orderedBuckets) {
      const maxReward = Math.floor(bucket.total / RECYCLE_COST)

      if (maxReward <= 0) {
        continue
      }

      if (!candidates) {
        candidates = await this.options.pokemonRepository.listRecycleRewardCandidates(locale)
      }

      const rewards = drawRecycleRewards(bucket.rarityRank, maxReward, candidates)

      if (rewards.length === 0) {
        continue
      }

      consumed.push(...planRecycleConsumption(bucket.items, rewards.length * RECYCLE_COST))
      awardedCards.push(...rewards)
    }

    if (awardedCards.length === 0) {
      return {
        error: 'recycle_nothing',
        message: `Recycle at least ${RECYCLE_COST} cards sharing the same rarity.`,
      }
    }

    let newCardIds: string[]

    try {
      ;({ newCardIds } = await this.options.pokemonRepository.recycleCards(
        user.id,
        consumed,
        awardedCards,
      ))
    } catch (error) {
      if (error instanceof RecycleConflictError) {
        return {
          error: 'recycle_conflict',
          message: 'Your collection changed while recycling. Please try again.',
        }
      }

      throw error
    }

    const newCardIdSet = new Set(newCardIds)

    return {
      recycledCount: consumed.reduce((total, item) => total + item.quantity, 0),
      rewardCount: awardedCards.length,
      awardedCards: awardedCards.map((card) => ({
        ...card,
        isNew: newCardIdSet.has(card.id),
      })),
    }
  }

  private async getPackOpenStatusForUser(userId: string): Promise<PackOpenStatusResponse> {
    const anchor = await this.options.pokemonRepository.getBoosterCooldownAnchor(userId)
    const status = getBoosterChargeStatus(anchor, new Date())

    return {
      authenticated: true,
      canOpen: status.canOpen,
      cooldownSeconds: status.cooldownSeconds,
      cooldownDurationSeconds: status.cooldownDurationSeconds,
      availableBoosters: status.availableBoosters,
      ...(status.nextOpenAt ? { nextOpenAt: status.nextOpenAt.toISOString() } : {}),
    }
  }

  private async drawPackCards(
    setId: string,
    locale: SupportedLocale,
  ): Promise<PokemonCardSummary[]> {
    const allCards = await this.options.pokemonRepository.listCards(setId, locale)

    return drawPokemonPackCards(allCards)
  }
}

const UNKNOWN_RARITY_RANK = 999

const mergeRecycleItems = (
  items: RecycleCardsRequest['items'],
): Array<{ cardId: string; finish: string; quantity: number }> => {
  const merged = new Map<string, { cardId: string; finish: string; quantity: number }>()

  for (const item of items) {
    if (!item.cardId || item.quantity <= 0) {
      continue
    }

    const key = `${item.cardId}:${item.finish}`
    const existing = merged.get(key)

    if (existing) {
      existing.quantity += item.quantity
      continue
    }

    merged.set(key, { cardId: item.cardId, finish: item.finish, quantity: item.quantity })
  }

  return [...merged.values()]
}

const planRecycleConsumption = (
  items: Array<{ cardId: string; finish: string; quantity: number }>,
  amount: number,
): Array<{ cardId: string; finish: string; quantity: number }> => {
  const consumed: Array<{ cardId: string; finish: string; quantity: number }> = []
  let remaining = amount

  for (const item of items) {
    if (remaining <= 0) {
      break
    }

    const take = Math.min(remaining, item.quantity)
    consumed.push({ cardId: item.cardId, finish: item.finish, quantity: take })
    remaining -= take
  }

  return consumed
}

export const isPokemonServiceError = <T>(
  result: T | PokemonServiceError,
): result is PokemonServiceError => {
  return typeof result === 'object' && result !== null && 'error' in result
}

const toPokemonDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
