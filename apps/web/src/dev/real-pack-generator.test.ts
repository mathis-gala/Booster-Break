import { describe, expect, test } from 'bun:test'
import type { PokemonCardSummary, PokemonSetSummary } from '@tcg-collection/shared'

import { createRealPack, getForcedPullOptions } from './real-pack-generator'

const modernSet: PokemonSetSummary = {
  id: 'sv10',
  name: 'Destined Rivals',
  series: 'Scarlet & Violet',
  total: 20,
  releaseDate: '2025-05-30',
  boosterImageUrl: 'https://example.com/sv10.png',
}

describe('real development packs', () => {
  test('forces a random real Illustration Rare into the penultimate modern slot', () => {
    const cards = createModernPool()
    const firstPack = createRealPack(modernSet, cards, 'illustration-rare', () => 0)
    const secondPack = createRealPack(modernSet, cards, 'illustration-rare', () => 0.999)

    expect(firstPack.cards).toHaveLength(10)
    expect(firstPack.cards[8].rarity).toBe('Illustration Rare')
    expect(firstPack.cards[8].finish).toBe('holo')
    expect(firstPack.cards[9].rarity).not.toBe('Illustration Rare')
    expect(firstPack.cards[8].id).not.toBe(secondPack.cards[8].id)
    expect(new Set(firstPack.cards.map((card) => card.id)).size).toBe(10)
  })

  test('only exposes forced pulls represented in the selected set', () => {
    const options = getForcedPullOptions('sv10', createModernPool()).map((option) => option.id)

    expect(options).toContain('random')
    expect(options).toContain('illustration-rare')
    expect(options).toContain('double-rare')
    expect(options).not.toContain('ace-spec')
  })

  test('forces Galarian Gallery cards into the Sword and Shield reverse slot', () => {
    const set = { ...modernSet, id: 'swsh12.5', name: 'Crown Zenith' }
    const pack = createRealPack(set, createSwshPool(), 'gallery-premium', () => 0)

    expect(pack.cards[8].id).toBe('swsh12.5gg-GG35')
    expect(pack.cards[8].finish).toBe('holo')
    expect(pack.cards[9].id).not.toContain('GG')
  })
})

const createModernPool = (): PokemonCardSummary[] => [
  ...createRarityCards('Common', 7),
  ...createRarityCards('Uncommon', 6),
  ...createRarityCards('Rare', 4),
  createCard('ir-a', 'Illustration Rare'),
  createCard('ir-b', 'Illustration Rare'),
  createCard('rr-a', 'Double Rare'),
]

const createSwshPool = (): PokemonCardSummary[] => [
  ...createRarityCards('Common', 7, 'swsh12.5'),
  ...createRarityCards('Uncommon', 5, 'swsh12.5'),
  ...createRarityCards('Rare', 4, 'swsh12.5'),
  createCard('holo-a', 'Holo Rare', 'swsh12.5'),
  createCard('swsh12.5gg-GG35', 'Ultra Rare', 'swsh12.5gg'),
  createCard('swsh12.5gg-GG36', 'Ultra Rare', 'swsh12.5gg'),
]

const createRarityCards = (rarity: string, count: number, setId = 'sv10') =>
  Array.from({ length: count }, (_, index) => createCard(`${rarity}-${index}`, rarity, setId))

const createCard = (id: string, rarity: string, setId = 'sv10'): PokemonCardSummary => ({
  id,
  setId,
  name: id,
  number: id,
  rarity,
  finishes: ['normal', 'holo', 'reverse_holo'],
})
