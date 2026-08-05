import { describe, expect, test } from 'bun:test'
import type { Card, Set } from '@tcgdex/sdk'
import {
  PokemonSandboxService,
  type PokemonSandboxServiceOptions,
} from '../../src/pokemon/pokemon-sandbox-service'

describe('PokemonSandboxService SWSH galleries', () => {
  test('merges localized gallery cards for previews and openings and includes their total', async () => {
    const parentSet = makeSet('swsh9', 'Brilliant Stars', '2022-02-25', 11)
    const gallerySet = makeSet('swsh9.5tg', 'Brilliant Stars Trainer Gallery', '2022-02-25', 1)
    const parentCards = [
      ...makeCards(parentSet, 'common', 'Common', 6),
      ...makeCards(parentSet, 'uncommon', 'Uncommon', 4),
      ...makeCards(parentSet, 'rare', 'Rare', 1),
    ]
    const galleryCards = [makeGalleryCard(gallerySet)]
    const getSetByIdCalls: string[] = []
    const getCardsBySetCalls: string[] = []
    const client: PokemonSandboxServiceOptions['pokemonClient'] = {
      getRecentSets: async () => [parentSet],
      getSetById: async (setId) => {
        getSetByIdCalls.push(setId)
        return setId === parentSet.id ? parentSet : setId === gallerySet.id ? gallerySet : undefined
      },
      getCardsBySet: async (set) => {
        getCardsBySetCalls.push(set.id)
        return set.id === gallerySet.id ? galleryCards : parentCards
      },
    }
    const service = new PokemonSandboxService({
      localizedPokemonClients: { en: client, fr: client },
      pokemonClient: client,
      sealedClient: {
        getBoosterImageUrl: async () => 'https://example.com/booster.png',
      },
    })

    const sets = await service.listSets('fr')
    const previewCards = await service.listCards(parentSet.id, 'fr')
    const originalRandom = Math.random
    Math.random = () => 0

    try {
      const opening = await service.openPack({ setId: parentSet.id, locale: 'fr' })

      expect('error' in opening).toBe(false)

      if ('cards' in opening) {
        expect(opening.cards).toHaveLength(10)
        expect(opening.cards.some((card) => card.id === galleryCards[0]?.id)).toBe(true)
        expect(opening.cards.find((card) => card.id === galleryCards[0]?.id)?.setId).toBe(
          gallerySet.id,
        )
      }
    } finally {
      Math.random = originalRandom
    }

    expect(sets).toHaveLength(1)
    expect(sets[0]?.total).toBe(12)
    expect(previewCards).toHaveLength(12)
    expect(previewCards.find((card) => card.id === galleryCards[0]?.id)).toMatchObject({
      setId: gallerySet.id,
      finishes: ['holo'],
      imageSmall: 'https://assets.tcgdex.net/fr/swsh/swsh9/TG01/low.png',
      imageLarge: 'https://assets.tcgdex.net/fr/swsh/swsh9/TG01/high.png',
    })
    expect(getSetByIdCalls.filter((setId) => setId === gallerySet.id)).toHaveLength(1)
    expect(getCardsBySetCalls.filter((setId) => setId === gallerySet.id)).toHaveLength(2)
  })
})

const makeSet = (id: string, name: string, releaseDate: string, total: number): Set =>
  ({
    id,
    name,
    releaseDate,
    serie: { id: 'swsh', name: 'Sword & Shield' },
    cardCount: { total, official: total, normal: total, reverse: total, holo: 0 },
    cards: [],
    legal: { standard: false, expanded: true },
  }) as unknown as Set

const makeCards = (set: Set, prefix: string, rarity: string, count: number): Card[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index}`,
    localId: `${index + 1}`,
    name: `${prefix} ${index}`,
    image: `https://assets.tcgdex.net/en/swsh/${set.id}/${index + 1}`,
    rarity,
    category: 'Pokemon',
    set,
    variants: { normal: true, reverse: true },
  })) as unknown as Card[]

const makeGalleryCard = (set: Set): Card =>
  ({
    id: `${set.id}-TG01`,
    localId: 'TG01',
    name: 'Localized gallery card',
    rarity: 'Rare',
    category: 'Pokemon',
    set,
    variants: { normal: false, holo: true, reverse: false },
  }) as unknown as Card
