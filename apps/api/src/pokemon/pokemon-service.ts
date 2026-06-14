import type {
  CollectionSort,
  CollectionSource,
  OpenPackResponse,
  OwnedCardIdsResponse,
  PackOpenStatusResponse,
  PokemonCardSummary,
  PokemonSetSummary,
  SupportedLocale,
  UserCollectionResponse,
} from '@tcg-collection/shared'
import { DEFAULT_LOCALE } from '@tcg-collection/shared'
import { AuthService } from '../auth/auth-service'
import type { AuthUser } from '../auth/types'
import { PokemonRepository } from './pokemon-repository'
import {
  PACK_OPEN_COOLDOWN_SECONDS,
  POKEMON_SYNC_START_DATE,
  SYNCED_BOOSTER_LIMIT,
} from './pokemon-config'
import { drawPokemonPackCards } from './pack-draft'
import { getBoosterChargeStatus, PackCooldownError } from './pack-cooldown'
import { PokemonCatalogSyncService } from './pokemon-catalog-sync-service'
import type { PokemonServiceError } from './pokemon-service-error'
import { ScrydexSealedClient } from './scrydex-sealed-client'
import { TcgDexClient } from './tcgdex-client'

export { isPokemonServiceError } from './pokemon-service-error'
export type { PokemonServiceError, PokemonServiceErrorCode } from './pokemon-service-error'

export interface PokemonServiceOptions {
  authService: AuthService
  localizedPokemonClients: Record<SupportedLocale, TcgDexClient>
  pokemonClient: TcgDexClient
  pokemonRepository: PokemonRepository
  sealedClient: ScrydexSealedClient
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

const toPokemonDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
