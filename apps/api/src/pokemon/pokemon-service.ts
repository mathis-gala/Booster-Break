import type {
  CollectionSort,
  OpenPackResponse,
  PackOpenStatusResponse,
  PokemonCardSummary,
  PokemonSetSummary,
  SupportedLocale,
  UserCollectionResponse,
} from '@tcg-collection/shared'
import { DEFAULT_LOCALE } from '@tcg-collection/shared'
import { AuthService } from '../auth/auth-service'
import { PokemonRepository } from './pokemon-repository'
import {
  PACK_OPEN_COOLDOWN_SECONDS,
  POKEMON_SYNC_START_DATE,
  SYNCED_BOOSTER_LIMIT,
} from './pokemon-config'
import { drawPokemonPackCards } from './pack-draft'
import { ScrydexSealedClient } from './scrydex-sealed-client'
import { getSetSeriesName, TcgDexClient } from './tcgdex-client'

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
  | 'unauthenticated'

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

  constructor(private readonly options: PokemonServiceOptions) {}

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
    cookieHeader: string | undefined,
    options: { page: number; pageSize: number; sort: CollectionSort; locale: SupportedLocale },
  ): Promise<UserCollectionResponse | PokemonServiceError> {
    const user = await this.options.authService.getCurrentUser(cookieHeader)

    if (!user) {
      return {
        error: 'unauthenticated',
        message: 'Sign in to view your collection.',
      }
    }

    return this.options.pokemonRepository.listUserCollection(user.id, options)
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

      const localizedSet = await this.options.localizedPokemonClients.fr.getSetById(set.id)

      await this.options.pokemonRepository.upsertSet(set, syncedAt, boosterImageUrl, {
        en: {
          name: set.name,
          series: getSetSeriesName(set),
        },
        fr: localizedSet
          ? {
              name: localizedSet.name,
              series: getSetSeriesName(localizedSet),
            }
          : undefined,
      })

      const cards = await this.options.pokemonClient.getCardsBySet(set)
      const localizedCards = await this.options.localizedPokemonClients.fr.getCardsByIds(
        cards.map((card) => card.id),
      )
      const localizedCardNames = new Map(
        localizedCards.map((card) => [
          card.id,
          {
            fr: card.name,
          },
        ]),
      )
      cardCount += cards.length
      setCount += 1

      await this.options.pokemonRepository.replaceSetCards(
        set.id,
        cards,
        syncedAt,
        localizedCardNames,
      )
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
    cookieHeader: string | undefined,
    input: { setId?: string; locale?: SupportedLocale },
  ): Promise<OpenPackResponse | PokemonServiceError> {
    const user = await this.options.authService.getCurrentUser(cookieHeader)

    if (!user) {
      return {
        error: 'unauthenticated',
        message: 'Sign in to open booster packs and save cards to your collection.',
      }
    }

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

    const openingId = await this.options.pokemonRepository.recordPackOpening(user.id, set.id, cards)

    return {
      openingId,
      set,
      cards,
    }
  }

  private async getPackOpenStatusForUser(userId: string): Promise<PackOpenStatusResponse> {
    const latestOpening = await this.options.pokemonRepository.getLatestPackOpening(userId)

    if (!latestOpening) {
      return {
        authenticated: true,
        canOpen: true,
        cooldownSeconds: 0,
        cooldownDurationSeconds: PACK_OPEN_COOLDOWN_SECONDS,
      }
    }

    const lastOpenedAt = latestOpening.openedAt
    const nextOpenAt = new Date(lastOpenedAt.getTime() + PACK_OPEN_COOLDOWN_SECONDS * 1000)
    const cooldownSeconds = Math.max(0, Math.ceil((nextOpenAt.getTime() - Date.now()) / 1000))

    return {
      authenticated: true,
      canOpen: cooldownSeconds === 0,
      cooldownSeconds,
      cooldownDurationSeconds: PACK_OPEN_COOLDOWN_SECONDS,
      lastOpenedAt: lastOpenedAt.toISOString(),
      nextOpenAt: nextOpenAt.toISOString(),
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
