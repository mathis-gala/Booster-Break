import { describe, expect, test } from 'bun:test'
import type { Set as TcgDexSet } from '@tcgdex/sdk'
import type { TcgDexCard } from '../../src/pokemon/tcgdex-client'
import { PokemonCatalogSyncService } from '../../src/pokemon/pokemon-catalog-sync-service'

describe('PokemonCatalogSyncService', () => {
  test('syncs localized set and card data through the repository', async () => {
    const set = makeSet('sv10', 'Destined Rivals', 'Scarlet & Violet')
    const localizedSet = makeSet('sv10', 'Rivaux Destines', 'Ecarlate et Violet')
    const cards = [makeCard('sv10-001', 'Bulbasaur'), makeCard('sv10-002', 'Ivysaur')]
    const localizedCards = [makeCard('sv10-001', 'Bulbizarre')]
    const calls: Array<{ name: string; args: unknown[] }> = []
    const service = new PokemonCatalogSyncService({
      pokemonClient: {
        getCardsBySet: async () => cards,
      },
      localizedPokemonClients: {
        fr: {
          getSetById: async () => localizedSet,
          getCardsByIds: async (cardIds) => {
            calls.push({ name: 'getCardsByIds', args: [cardIds] })
            return localizedCards
          },
        },
      },
      pokemonRepository: {
        upsertSet: async (...args) => {
          calls.push({ name: 'upsertSet', args })
        },
        replaceSetCards: async (...args) => {
          calls.push({ name: 'replaceSetCards', args })
        },
      },
    })

    const result = await service.syncSet(set, {
      syncedAt: '2026-06-06T00:00:00.000Z',
      boosterImageUrl: 'https://example.com/booster.png',
    })

    expect(result).toEqual({ setId: 'sv10', cards: 2 })
    expect(calls[0]).toEqual({
      name: 'upsertSet',
      args: [
        set,
        '2026-06-06T00:00:00.000Z',
        'https://example.com/booster.png',
        {
          en: {
            name: 'Destined Rivals',
            series: 'Scarlet & Violet',
          },
          fr: {
            name: 'Rivaux Destines',
            series: 'Ecarlate et Violet',
          },
        },
      ],
    })
    expect(calls[1]).toEqual({
      name: 'getCardsByIds',
      args: [['sv10-001', 'sv10-002']],
    })

    const replaceSetCardsCall = calls[2]
    expect(replaceSetCardsCall?.name).toBe('replaceSetCards')
    expect(replaceSetCardsCall?.args[0]).toBe('sv10')
    expect(replaceSetCardsCall?.args[1]).toEqual(cards)
    expect(replaceSetCardsCall?.args[2]).toBe('2026-06-06T00:00:00.000Z')
    expect(replaceSetCardsCall?.args[3]).toEqual(
      new Map([
        [
          'sv10-001',
          {
            fr: 'Bulbizarre',
          },
        ],
      ]),
    )
  })

  test('keeps French set text optional when localization is missing', async () => {
    const set = makeSet('sv11', 'Black Bolt', 'Scarlet & Violet')
    const calls: Array<{ name: string; args: unknown[] }> = []
    const service = new PokemonCatalogSyncService({
      pokemonClient: {
        getCardsBySet: async () => [],
      },
      localizedPokemonClients: {
        fr: {
          getSetById: async () => undefined,
          getCardsByIds: async () => [],
        },
      },
      pokemonRepository: {
        upsertSet: async (...args) => {
          calls.push({ name: 'upsertSet', args })
        },
        replaceSetCards: async (...args) => {
          calls.push({ name: 'replaceSetCards', args })
        },
      },
    })

    await service.syncSet(set, { syncedAt: '2026-06-06T00:00:00.000Z' })

    expect(calls[0]?.args[3]).toEqual({
      en: {
        name: 'Black Bolt',
        series: 'Scarlet & Violet',
      },
      fr: undefined,
    })
  })
})

const makeSet = (id: string, name: string, series: string): TcgDexSet =>
  ({
    id,
    name,
    serie: {
      name: series,
    },
    cardCount: {
      total: 2,
    },
    releaseDate: '2026-06-06',
    cards: [],
  }) as unknown as TcgDexSet

const makeCard = (id: string, name: string): TcgDexCard =>
  ({
    id,
    name,
    set: {
      id: 'sv10',
    },
    localId: id.split('-')[1] ?? id,
    image: `https://example.com/${id}`,
  }) as TcgDexCard
