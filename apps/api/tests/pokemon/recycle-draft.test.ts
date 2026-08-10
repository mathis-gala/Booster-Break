import { afterEach, describe, expect, test } from 'bun:test'
import type { PokemonCardSummary } from '@tcg-collection/shared'
import { getRarityRank } from '@tcg-collection/shared'
import { drawRecycleRewards } from '../../src/pokemon/recycle-draft'

const originalRandom = Math.random

afterEach(() => {
  Math.random = originalRandom
})

const catalog: PokemonCardSummary[] = [
  ...makeCards('common', 'Common', 3, ['normal']),
  ...makeCards('uncommon', 'Uncommon', 3, ['normal']),
  ...makeCards('rare', 'Rare', 3, ['holo']),
  ...makeCards('double-rare', 'Double Rare', 2, ['holo']),
]

describe('drawRecycleRewards', () => {
  test('crafts exactly the requested number of rewards', () => {
    const rewards = drawRecycleRewards(getRarityRank('Common'), 3, catalog)

    expect(rewards).toHaveLength(3)
  })

  test('never returns a reward below the recycled rarity', () => {
    const uncommonRank = getRarityRank('Uncommon')

    for (let roll = 0; roll < 1; roll += 0.05) {
      Math.random = () => roll
      const rewards = drawRecycleRewards(uncommonRank, 5, catalog)

      expect(rewards.length).toBe(5)
      expect(rewards.every((card) => getRarityRank(card.rarity) >= uncommonRank)).toBe(true)
    }
  })

  test('stays on the same rarity when the roll favours no upgrade', () => {
    Math.random = () => 0

    const rewards = drawRecycleRewards(getRarityRank('Common'), 4, catalog)

    expect(rewards.every((card) => card.rarity === 'Common')).toBe(true)
  })

  test('can upgrade to a higher rarity when the roll is high', () => {
    Math.random = () => 0.999

    const rewards = drawRecycleRewards(getRarityRank('Common'), 1, catalog)

    expect(getRarityRank(rewards[0]?.rarity)).toBeGreaterThan(getRarityRank('Common'))
  })

  test('assigns a holo finish to rare-or-better rewards', () => {
    Math.random = () => 0

    const rewards = drawRecycleRewards(getRarityRank('Rare'), 2, catalog)

    expect(rewards.every((card) => card.finish === 'holo')).toBe(true)
  })

  test('returns nothing when no candidate meets the rarity floor', () => {
    const onlyCommons = makeCards('common', 'Common', 2, ['normal'])

    expect(drawRecycleRewards(getRarityRank('Rare'), 3, onlyCommons)).toHaveLength(0)
  })

  test('returns nothing for a non-positive count', () => {
    expect(drawRecycleRewards(getRarityRank('Common'), 0, catalog)).toHaveLength(0)
  })
})

function makeCards(
  prefix: string,
  rarity: string,
  count: number,
  finishes: PokemonCardSummary['finishes'],
): PokemonCardSummary[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index}`,
    setId: 'set-test',
    imageLarge: `https://example.com/${prefix}-${index}.png`,
    imageSmall: `https://example.com/${prefix}-${index}.png`,
    name: `${prefix} ${index}`,
    number: `${index}`,
    rarity,
    finishes,
  }))
}
