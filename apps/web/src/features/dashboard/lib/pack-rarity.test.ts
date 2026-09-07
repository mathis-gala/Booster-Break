import { describe, expect, test } from 'bun:test'
import { getRarityRank, pokemonRarityOrder, type PokemonCardSummary } from '@tcg-collection/shared'
import { getNewCardChance, getRarityChanceLabel, groupCardsByRarity } from './pack-rarity'

describe('pack rarity details', () => {
  test('orders Crown Zenith main rarities and separates every Galarian Gallery tier', () => {
    const cards = [
      makeCard('swsh12.5gg-GG67', 'GG67', 'Secret Rare'),
      makeCard('swsh12.5-010', '010', 'Rare'),
      makeCard('swsh12.5gg-GG35', 'GG35', 'Ultra Rare'),
      makeCard('swsh12.5-001', '001', 'Common'),
      makeCard('swsh12.5gg-GG26', 'GG26', 'Rare'),
      makeCard('swsh12.5-020', '020', 'Holo Rare V'),
      makeCard('swsh12.5-015', '015', 'Holo Rare'),
      makeCard('swsh12.5-030', '030', 'Radiant Rare'),
    ]

    expect(groupCardsByRarity(cards, 'swsh12.5').map(([rarity]) => rarity)).toEqual([
      'Common',
      'Rare',
      'Holo Rare',
      'Holo Rare V',
      'Radiant Rare',
      'Galarian Gallery',
      'Galarian Gallery Ultra Rare',
      'Galarian Gallery Secret Rare',
    ])
  })

  test('shows set-specific Crown Zenith and Mega Evolution rates', () => {
    expect(getRarityChanceLabel('Common', [], 'swsh12.5')).toContain('5')
    expect(getRarityChanceLabel('Galarian Gallery', [], 'swsh12.5')).toContain('22.4%')
    expect(getRarityChanceLabel('Special Illustration Rare', [], 'me04')).toContain('1.21%')
    expect(getRarityChanceLabel('Mega Hyper Rare', [], 'me05')).toContain('0.09%')
  })

  test('coalesces localized and capitalization aliases', () => {
    const cards = [
      makeCard('common-en', '001', 'Common'),
      makeCard('common-fr', '002', 'Commune'),
      makeCard('double-lower', '003', 'Double rare'),
      makeCard('double-title', '004', 'Double Rare'),
      makeCard('ace-spec-fr', '005', 'HIGH-TECH rare'),
      makeCard('sir-fr', '006', 'Illustration spéciale rare'),
      makeCard('mhr-fr', '007', 'Méga Hyper Rare'),
    ]
    const groups = groupCardsByRarity(cards)

    expect(groups.map(([rarity]) => rarity)).toEqual([
      'Common',
      'Double Rare',
      'ACE SPEC Rare',
      'Special Illustration Rare',
      'Mega Hyper Rare',
    ])
    expect(groups[0]?.[1]).toHaveLength(2)
    expect(groups[1]?.[1]).toHaveLength(2)
  })

  test('assigns a collection sort rank to every preview rarity', () => {
    for (const rarity of pokemonRarityOrder) {
      expect(getRarityRank(rarity)).not.toBe(999)
    }
  })

  test('estimates the chance of getting a new card from the owned cards', () => {
    const cards = [
      ...Array.from({ length: 10 }, (_, index) =>
        makeCard(`common-${index}`, `${index}`, 'Common'),
      ),
      ...Array.from({ length: 6 }, (_, index) =>
        makeCard(`uncommon-${index}`, `${index}`, 'Uncommon'),
      ),
      makeCard('rare', '999', 'Rare'),
    ]

    expect(getNewCardChance(cards, new Set(), 'me05')).toBe(100)
    expect(getNewCardChance(cards, new Set(cards.map((card) => card.id)), 'me05')).toBe(0)
    expect(
      getNewCardChance(cards, new Set(cards.slice(0, -1).map((card) => card.id)), 'me05'),
    ).toBeGreaterThan(0)
  })
})

const makeCard = (id: string, number: string, rarity: string): PokemonCardSummary => ({
  id,
  name: id,
  number,
  rarity,
  setId: 'swsh12.5',
})
