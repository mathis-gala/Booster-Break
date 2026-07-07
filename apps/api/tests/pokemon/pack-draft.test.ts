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

    const { cards } = drawPokemonPackCards(
      [
        ...makeCards('common', 'Common', 6, ['normal', 'reverse_holo']),
        ...makeCards('uncommon', 'Uncommon', 5, ['normal', 'reverse_holo']),
        ...makeCards('rare', 'Rare', 4, ['holo', 'reverse_holo']),
        ...makeCards('double-rare', 'Double Rare', 2, ['holo']),
        ...makeCards('ultra-rare', 'Ultra Rare', 2, ['holo']),
        ...makeCards('illustration-rare', 'Illustration Rare', 2, ['holo']),
      ],
      { enableGodPack: false },
    )

    expect(cards).toHaveLength(10)
    expect(cards.slice(0, 4).every((card) => card.rarity === 'Common')).toBe(true)
    expect(cards.slice(4, 7).every((card) => card.rarity === 'Uncommon')).toBe(true)
    expect(cards.filter((card) => card.finish === 'reverse_holo')).toHaveLength(2)
    expect(cards[cards.length - 1]?.finish).toBe('holo')
  })

  test('replaces the first reverse holo slot with an ACE SPEC Rare', () => {
    // Low roll lands in the first-foil slot's ACE SPEC band (0%-4.76%).
    Math.random = () => 0.01

    const { cards } = drawPokemonPackCards(
      [
        ...makeCards('common', 'Common', 6, ['normal', 'reverse_holo']),
        ...makeCards('uncommon', 'Uncommon', 5, ['normal', 'reverse_holo']),
        ...makeCards('rare', 'Rare', 4, ['holo', 'reverse_holo']),
        ...makeCards('ace-spec', 'ACE SPEC Rare', 2, ['holo']),
      ],
      { enableGodPack: false },
    )

    expect(cards).toHaveLength(10)
    const aceSpec = cards.find((card) => card.rarity === 'ACE SPEC Rare')
    expect(aceSpec).toBeDefined()
    expect(aceSpec?.finish).toBe('holo')
    // The ACE SPEC is additive: the rare slot still yields a rare-or-better card.
    expect(cards.some((card) => card.rarity === 'Rare')).toBe(true)
  })

  test('can replace the second reverse slot with an illustration rare', () => {
    Math.random = () => 0

    const { cards } = drawPokemonPackCards(
      [
        ...makeCards('common', 'Common', 6, ['normal', 'reverse_holo']),
        ...makeCards('uncommon', 'Uncommon', 5, ['normal', 'reverse_holo']),
        ...makeCards('rare', 'Rare', 4, ['holo', 'reverse_holo']),
        ...makeCards('double-rare', 'Double Rare', 2, ['holo']),
        ...makeCards('illustration-rare', 'Illustration Rare', 2, ['holo']),
      ],
      { enableGodPack: false },
    )

    expect(cards).toHaveLength(10)
    expect(cards.some((card) => card.rarity === 'Illustration Rare')).toBe(true)
    expect(cards.some((card) => card.rarity === 'Double Rare')).toBe(true)
  })

  test('does not upgrade the Illustration Rare band to a Special Illustration Rare when the set has no Illustration Rare', () => {
    // Roll lands in the second foil slot's Illustration Rare band (0%-7.67%).
    // Prismatic Evolutions (sv08.5) has no plain Illustration Rare, so this band
    // must fall back to a reverse holo rather than cascading into the rarer
    // Special Illustration Rare band (7.67%-10.82%).
    Math.random = () => 0.05

    const { cards } = drawPokemonPackCards(
      [
        ...makeCards('common', 'Common', 6, ['normal', 'reverse_holo']),
        ...makeCards('uncommon', 'Uncommon', 5, ['normal', 'reverse_holo']),
        ...makeCards('rare', 'Rare', 4, ['holo', 'reverse_holo']),
        ...makeCards('double-rare', 'Double Rare', 2, ['holo']),
        ...makeCards('special-illustration-rare', 'Special Illustration Rare', 2, ['holo']),
      ],
      { enableGodPack: false },
    )

    expect(cards).toHaveLength(10)
    expect(cards.some((card) => card.rarity === 'Special Illustration Rare')).toBe(false)
    expect(cards.filter((card) => card.finish === 'reverse_holo')).toHaveLength(2)
  })

  test('upgrades to a god pack of Illustration Rare or better when the roll hits', () => {
    Math.random = () => 0

    const { cards, isGodPack } = drawPokemonPackCards([
      ...makeCards('common', 'Common', 6, ['normal', 'reverse_holo']),
      ...makeCards('uncommon', 'Uncommon', 5, ['normal', 'reverse_holo']),
      ...makeCards('illustration-rare', 'Illustration Rare', 6, ['holo']),
      ...makeCards('special-illustration-rare', 'Special Illustration Rare', 4, ['holo']),
      ...makeCards('hyper-rare', 'Hyper Rare', 2, ['holo']),
    ])

    expect(isGodPack).toBe(true)
    expect(cards).toHaveLength(10)
    expect(cards.every((card) => card.finish === 'holo')).toBe(true)
    expect(
      cards.every((card) =>
        ['Illustration Rare', 'Special Illustration Rare', 'Hyper Rare'].includes(
          card.rarity ?? '',
        ),
      ),
    ).toBe(true)
  })

  test('does not upgrade to a god pack when the rare pool is too small to fill it', () => {
    Math.random = () => 0

    const { cards, isGodPack } = drawPokemonPackCards([
      ...makeCards('common', 'Common', 6, ['normal', 'reverse_holo']),
      ...makeCards('uncommon', 'Uncommon', 5, ['normal', 'reverse_holo']),
      ...makeCards('rare', 'Rare', 4, ['holo', 'reverse_holo']),
      ...makeCards('illustration-rare', 'Illustration Rare', 2, ['holo']),
    ])

    expect(isGodPack).toBe(false)
    expect(cards).toHaveLength(10)
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
