import type { Set as TcgDexSet } from '@tcgdex/sdk'
import type { SupportedLocale } from '@tcg-collection/shared'
import type { PokemonRepository } from './pokemon-repository'
import { getSetSeriesName, type TcgDexCard } from './tcgdex-client'

interface PokemonCatalogClient {
  getCardsBySet(set: TcgDexSet): Promise<TcgDexCard[]>
}

interface LocalizedPokemonCatalogClient {
  getSetById(setId: string): Promise<TcgDexSet | undefined>
  getCardsByIds(cardIds: string[]): Promise<TcgDexCard[]>
}

interface PokemonCatalogRepository {
  upsertSet: PokemonRepository['upsertSet']
  replaceSetCards: PokemonRepository['replaceSetCards']
}

export interface PokemonCatalogSyncServiceOptions {
  pokemonClient: PokemonCatalogClient
  localizedPokemonClients: Pick<Record<SupportedLocale, LocalizedPokemonCatalogClient>, 'fr'>
  pokemonRepository: PokemonCatalogRepository
}

export interface SyncPokemonCatalogSetOptions {
  syncedAt: string
  boosterImageUrl?: string
}

export interface SyncPokemonCatalogSetResult {
  setId: string
  cards: number
}

export class PokemonCatalogSyncService {
  constructor(private readonly options: PokemonCatalogSyncServiceOptions) {}

  async syncSet(
    set: TcgDexSet,
    { syncedAt, boosterImageUrl }: SyncPokemonCatalogSetOptions,
  ): Promise<SyncPokemonCatalogSetResult> {
    const localizedSet = await this.localizedClient.getSetById(set.id)

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
    const localizedCards = await this.localizedClient.getCardsByIds(cards.map((card) => card.id))
    const localizedCardNames = new Map(
      localizedCards.map((card) => [
        card.id,
        {
          fr: card.name,
        },
      ]),
    )

    await this.options.pokemonRepository.replaceSetCards(
      set.id,
      cards,
      syncedAt,
      localizedCardNames,
    )

    return {
      setId: set.id,
      cards: cards.length,
    }
  }

  private get localizedClient(): LocalizedPokemonCatalogClient {
    return this.options.localizedPokemonClients.fr
  }
}
