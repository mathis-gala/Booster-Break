import { afterEach, describe, expect, test } from 'bun:test'
import type { PokemonCardSummary } from '@tcg-collection/shared'
import { drawPokemonPackCards } from '../../src/pokemon/pack-draft'

const originalRandom = Math.random

afterEach(() => {
  Math.random = originalRandom
})

describe('drawPokemonPackCards', () => {
  test('draws Scarlet and Violet style booster slots', () => {
    Math.random = () => 0.99

    const cards = drawPokemonPackCards([
      ...makeCards('common', 'Common', 6, ['normal', 'reverse_holo']),
      ...makeCards('uncommon', 'Uncommon', 5, ['normal', 'reverse_holo']),
      ...makeCards('rare', 'Rare', 4, ['holo', 'reverse_holo']),
      ...makeCards('double-rare', 'Double Rare', 2, ['holo']),
      ...makeCards('ultra-rare', 'Ultra Rare', 2, ['holo']),
      ...makeCards('illustration-rare', 'Illustration Rare', 2, ['holo']),
    ])

    expect(cards).toHaveLength(10)
    expect(cards.slice(0, 4).every((card) => card.rarity === 'Common')).toBe(true)
    expect(cards.slice(4, 7).every((card) => card.rarity === 'Uncommon')).toBe(true)
    expect(cards.filter((card) => card.finish === 'reverse_holo')).toHaveLength(2)
    expect(cards[cards.length - 1]?.finish).toBe('holo')
  })

  test('can pull an ACE SPEC Rare in the rare slot', () => {
    // Roll lands in the rare slot's thin ACE SPEC band: 20.33% (Double Rare + Ultra Rare) to 20.42%.
    Math.random = () => 0.204

    const cards = drawPokemonPackCards([
      ...makeCards('common', 'Common', 6, ['normal', 'reverse_holo']),
      ...makeCards('uncommon', 'Uncommon', 5, ['normal', 'reverse_holo']),
      ...makeCards('rare', 'Rare', 4, ['holo', 'reverse_holo']),
      ...makeCards('ace-spec', 'ACE SPEC Rare', 2, ['holo']),
    ])

    expect(cards).toHaveLength(10)
    const aceSpec = cards.find((card) => card.rarity === 'ACE SPEC Rare')
    expect(aceSpec).toBeDefined()
    expect(aceSpec?.finish).toBe('holo')
  })

  test('can replace the second reverse slot with an illustration rare', () => {
    Math.random = () => 0

    const cards = drawPokemonPackCards([
      ...makeCards('common', 'Common', 6, ['normal', 'reverse_holo']),
      ...makeCards('uncommon', 'Uncommon', 5, ['normal', 'reverse_holo']),
      ...makeCards('rare', 'Rare', 4, ['holo', 'reverse_holo']),
      ...makeCards('double-rare', 'Double Rare', 2, ['holo']),
      ...makeCards('illustration-rare', 'Illustration Rare', 2, ['holo']),
    ])

    expect(cards).toHaveLength(10)
    expect(cards.some((card) => card.rarity === 'Illustration Rare')).toBe(true)
    expect(cards.some((card) => card.rarity === 'Double Rare')).toBe(true)
  })
})

const makeCards = (
  prefix: string,
  rarity: string,
  count: number,
  finishes: PokemonCardSummary['finishes'],
): PokemonCardSummary[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index}`,
    imageLarge: `https://example.com/${prefix}-${index}.png`,
    imageSmall: `https://example.com/${prefix}-${index}.png`,
    name: `${prefix} ${index}`,
    number: `${index}`,
    rarity,
    setId: 'test-set',
    finishes,
  }))
