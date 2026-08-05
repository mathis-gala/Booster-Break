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

  test('draws localized French Scarlet and Violet common, uncommon, and reverse slots', () => {
    Math.random = () => 0

    const { cards } = drawPokemonPackCards(
      [
        ...makeCards('commune', 'Commune', 6, ['normal', 'reverse_holo']),
        ...makeCards('peu-commune', 'Peu Commune', 5, ['normal', 'reverse_holo']),
        ...makeCards('rare', 'Rare', 4, ['holo', 'reverse_holo']),
      ],
      { enableGodPack: false },
    )

    expect(cards).toHaveLength(10)
    expect(cards.slice(0, 4).every((card) => card.rarity === 'Commune')).toBe(true)
    expect(cards.slice(4, 7).every((card) => card.rarity === 'Peu Commune')).toBe(true)
    expect(cards.slice(7, 9).every((card) => card.rarity === 'Commune')).toBe(true)
    expect(cards.slice(7, 9).every((card) => card.finish === 'reverse_holo')).toBe(true)
  })

  test('uses the observed Chaos Rising rarity bands', () => {
    const allCards = makeModernCards('me04')
    const cases = [
      {
        secondRoll: 0.1,
        rareRoll: 0.1,
        secondRarity: 'Illustration Rare',
        rareRarity: 'Double Rare',
      },
      {
        secondRoll: 0.112,
        rareRoll: 0.25,
        secondRarity: 'Special Illustration Rare',
        rareRarity: 'Ultra Rare',
      },
      {
        secondRoll: 0.119,
        rareRoll: 0.5,
        secondRarity: 'Mega Hyper Rare',
        rareRarity: 'Rare',
      },
    ] as const

    for (const drawCase of cases) {
      useRandomSequence([...Array<number>(9).fill(0), drawCase.secondRoll, 0, drawCase.rareRoll, 0])

      const { cards } = drawPokemonPackCards(allCards, {
        enableGodPack: false,
        setId: 'me04',
      })

      expect(cards[8]?.rarity).toBe(drawCase.secondRarity)
      expect(cards[9]?.rarity).toBe(drawCase.rareRarity)
    }
  })

  test('uses the observed Pitch Black rarity bands', () => {
    useRandomSequence([...Array<number>(9).fill(0), 0.12, 0, 0.25, 0])

    const { cards } = drawPokemonPackCards(makeModernCards('me05'), {
      enableGodPack: false,
      setId: 'me05',
    })

    expect(cards[8]?.rarity).toBe('Special Illustration Rare')
    expect(cards[9]?.rarity).toBe('Ultra Rare')
  })

  test('moves an exact Mega Evolution threshold into the next rarity band', () => {
    useRandomSequence([...Array<number>(9).fill(0), 0.5, 0, 0.203, 0])

    const { cards } = drawPokemonPackCards(makeModernCards('me04'), {
      enableGodPack: false,
      setId: 'me04',
    })

    expect(cards[9]?.rarity).toBe('Ultra Rare')
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

  test('draws Sword and Shield packs with five commons and one reverse slot', () => {
    Math.random = () => 0.99

    const { cards, isGodPack } = drawPokemonPackCards(
      [
        ...makeCards('common', 'Common', 6, ['normal', 'reverse_holo'], 'swsh9'),
        ...makeCards('uncommon', 'Uncommon', 4, ['normal', 'reverse_holo'], 'swsh9'),
        ...makeCards('rare', 'Rare', 2, ['normal', 'reverse_holo'], 'swsh9'),
        ...makeCards('holo-rare', 'Holo Rare', 2, ['holo', 'reverse_holo'], 'swsh9'),
        ...makeCards('v', 'Holo Rare V', 1, ['holo'], 'swsh9'),
        ...makeCards('vmax', 'Holo Rare VMAX', 1, ['holo'], 'swsh9'),
        ...makeCards('vstar', 'Holo Rare VSTAR', 1, ['holo'], 'swsh9'),
        ...makeCards('ultra', 'Ultra Rare', 1, ['holo'], 'swsh9'),
        ...makeCards('secret', 'Secret Rare', 1, ['holo'], 'swsh9'),
        ...makeCards('gallery-secret', 'Secret Rare', 1, ['holo'], 'swsh9.5tg'),
      ],
      { setId: 'swsh9' },
    )

    expect(isGodPack).toBe(false)
    expect(cards).toHaveLength(10)
    expect(cards.slice(0, 5).every((card) => card.rarity === 'Common')).toBe(true)
    expect(cards.slice(0, 5).every((card) => card.finish === 'normal')).toBe(true)
    expect(cards.slice(5, 8).every((card) => card.rarity === 'Uncommon')).toBe(true)
    expect(cards.slice(5, 8).every((card) => card.finish === 'normal')).toBe(true)
    expect(cards[8]?.finish).toBe('reverse_holo')
    expect(cards[8]?.setId).toBe('swsh9')
    expect(cards[9]?.rarity).toBe('Secret Rare')
    expect(cards[9]?.setId).toBe('swsh9')
    expect(cards[9]?.finish).toBe('holo')
  })

  test('uses the configured Sword and Shield rare categories and finishes', () => {
    const rareCases = [
      { roll: 0.3, rarity: 'Rare', finish: 'normal' },
      { roll: 0.7, rarity: 'Holo Rare', finish: 'holo' },
      { roll: 0.84, rarity: 'Holo Rare V', finish: 'holo' },
      { roll: 0.906, rarity: 'Holo Rare VMAX', finish: 'holo' },
      { roll: 0.925, rarity: 'Holo Rare VSTAR', finish: 'holo' },
      { roll: 0.96, rarity: 'Full Art Trainer', finish: 'holo' },
      { roll: 0.99, rarity: 'Secret Rare', finish: 'holo' },
    ] as const
    const allCards = [
      ...makeCards('common', 'Common', 6, ['normal', 'reverse_holo'], 'swsh12'),
      ...makeCards('uncommon', 'Uncommon', 4, ['normal', 'reverse_holo'], 'swsh12'),
      ...makeCards('rare', 'Rare', 1, ['normal', 'reverse_holo'], 'swsh12'),
      ...makeCards('holo-rare', 'Holo Rare', 1, ['holo', 'reverse_holo'], 'swsh12'),
      ...makeCards('v', 'Holo Rare V', 1, ['holo'], 'swsh12'),
      ...makeCards('vmax', 'Holo Rare VMAX', 1, ['holo'], 'swsh12'),
      ...makeCards('vstar', 'Holo Rare VSTAR', 1, ['holo'], 'swsh12'),
      ...makeCards('full-art-trainer', 'Full Art Trainer', 1, ['holo'], 'swsh12'),
      ...makeCards('secret', 'Secret Rare', 1, ['holo'], 'swsh12'),
    ]

    for (const rareCase of rareCases) {
      useRandomSequence([...Array<number>(8).fill(0), 0.99, 0, rareCase.roll, 0])

      const { cards } = drawPokemonPackCards(allCards, { setId: 'swsh12' })

      expect(cards).toHaveLength(10)
      expect(cards[9]?.rarity).toBe(rareCase.rarity)
      expect(cards[9]?.finish).toBe(rareCase.finish)
    }
  })

  test('draws localized French Sword and Shield slots and rare aliases', () => {
    const allCards = [
      ...makeCards('commune', 'Commune', 6, ['normal', 'reverse_holo'], 'swsh12'),
      ...makeCards('peu-commune', 'Peu Commune', 4, ['normal', 'reverse_holo'], 'swsh12'),
      ...makeCards('rare', 'Rare', 1, ['normal', 'reverse_holo'], 'swsh12'),
      ...makeCards('dresseur', 'Dresseur Full Art', 1, ['holo'], 'swsh12'),
      ...makeCards('magnifique', 'Magnifique rare', 1, ['holo'], 'swsh12'),
    ]
    const rareCases = [
      { roll: 0.96, rarity: 'Dresseur Full Art' },
      { roll: 0.99, rarity: 'Magnifique rare' },
    ] as const

    for (const rareCase of rareCases) {
      useRandomSequence([...Array<number>(8).fill(0), 0.99, 0, rareCase.roll, 0])

      const { cards } = drawPokemonPackCards(allCards, { setId: 'swsh12' })

      expect(cards).toHaveLength(10)
      expect(cards.slice(0, 5).every((card) => card.rarity === 'Commune')).toBe(true)
      expect(cards.slice(0, 5).every((card) => card.finish === 'normal')).toBe(true)
      expect(cards.slice(5, 8).every((card) => card.rarity === 'Peu Commune')).toBe(true)
      expect(cards.slice(5, 8).every((card) => card.finish === 'normal')).toBe(true)
      expect(cards[8]?.rarity).toBe('Commune')
      expect(cards[8]?.finish).toBe('reverse_holo')
      expect(cards[9]?.rarity).toBe(rareCase.rarity)
      expect(cards[9]?.finish).toBe('holo')
    }
  })

  test('does not transfer a missing rare category chance into available hits', () => {
    useRandomSequence([...Array<number>(8).fill(0), 0, 0.99, 0])

    const { cards } = drawPokemonPackCards(
      [
        ...makeCards('common', 'Common', 6, ['normal', 'reverse_holo'], 'swsh1'),
        ...makeCards('uncommon', 'Uncommon', 4, ['normal', 'reverse_holo'], 'swsh1'),
        ...makeCards('rare', 'Rare', 1, ['normal', 'reverse_holo'], 'swsh1'),
        ...makeCards('v', 'Holo Rare V', 1, ['holo'], 'swsh1'),
        ...makeCards('child-secret', 'Secret Rare', 1, ['holo'], 'swsh9.5tg'),
      ],
      { setId: 'swsh1' },
    )

    expect(cards).toHaveLength(10)
    expect(cards[9]?.rarity).toBe('Rare')
    expect(cards[9]?.setId).toBe('swsh1')
    expect(cards[9]?.finish).toBe('normal')
  })

  test('selects ordinary, normal, premium, and gold Trainer Gallery cards by rate band', () => {
    const parentCards = [
      ...makeCards('common', 'Common', 6, ['normal', 'reverse_holo'], 'swsh9'),
      ...makeCards('uncommon', 'Uncommon', 4, ['normal', 'reverse_holo'], 'swsh9'),
      ...makeCards('rare', 'Rare', 1, ['normal', 'reverse_holo'], 'swsh9'),
    ]
    const galleryCards = [
      makeCard('swsh9.5tg-TG01', 'swsh9.5tg', 'TG01'),
      makeCard('swsh9.5tg-TG13', 'swsh9.5tg', 'TG13'),
      makeCard('swsh9.5tg-TG29', 'swsh9.5tg', 'TG29'),
    ]
    const slotCases = [
      { roll: 0.01, id: 'swsh9.5tg-TG01', finish: 'holo' },
      { roll: 0.1, id: 'swsh9.5tg-TG13', finish: 'holo' },
      { roll: 0.125, id: 'swsh9.5tg-TG29', finish: 'holo' },
      { roll: 0.5, id: 'common-5', finish: 'reverse_holo' },
    ] as const

    for (const slotCase of slotCases) {
      useRandomSequence([...Array<number>(8).fill(0), slotCase.roll, 0, 0, 0])

      const { cards } = drawPokemonPackCards([...parentCards, ...galleryCards], {
        setId: 'swsh9',
      })

      expect(cards[8]?.id).toBe(slotCase.id)
      expect(cards[8]?.finish).toBe(slotCase.finish)
    }
  })

  test('includes both Astral Radiance gold cards in its aggregate premium band', () => {
    const parentCards = [
      ...makeCards('common', 'Common', 6, ['normal', 'reverse_holo'], 'swsh10'),
      ...makeCards('uncommon', 'Uncommon', 4, ['normal', 'reverse_holo'], 'swsh10'),
      ...makeCards('rare', 'Rare', 1, ['normal', 'reverse_holo'], 'swsh10'),
    ]
    const galleryCards = [
      makeCard('swsh10.5tg-TG13', 'swsh10.5tg', 'TG13'),
      makeCard('swsh10.5tg-TG29', 'swsh10.5tg', 'TG29'),
    ]

    for (const [selectionRoll, expectedId] of [
      [0, 'swsh10.5tg-TG13'],
      [0.99, 'swsh10.5tg-TG29'],
    ] as const) {
      useRandomSequence([...Array<number>(8).fill(0), 0.1, selectionRoll, 0, 0])

      const { cards } = drawPokemonPackCards([...parentCards, ...galleryCards], {
        setId: 'swsh10',
      })

      expect(cards[8]?.id).toBe(expectedId)
      expect(cards[8]?.finish).toBe('holo')
    }
  })

  test('uses the exact Galarian Gallery local-number groups', () => {
    const parentCards = [
      ...makeCards('common', 'Common', 6, ['normal', 'reverse_holo'], 'swsh12.5'),
      ...makeCards('uncommon', 'Uncommon', 4, ['normal', 'reverse_holo'], 'swsh12.5'),
      ...makeCards('rare', 'Rare', 1, ['normal', 'reverse_holo'], 'swsh12.5'),
    ]
    const galleryCards = [
      makeCard('swsh12.5gg-GG34', 'swsh12.5', 'GG34'),
      makeCard('swsh12.5gg-GG35', 'swsh12.5', 'GG35'),
      makeCard('swsh12.5gg-GG67', 'swsh12.5', 'GG67'),
    ]
    const slotCases = [
      { roll: 0.1, id: 'swsh12.5gg-GG34' },
      { roll: 0.25, id: 'swsh12.5gg-GG35' },
      { roll: 0.348, id: 'swsh12.5gg-GG67' },
    ] as const

    for (const slotCase of slotCases) {
      useRandomSequence([...Array<number>(8).fill(0), slotCase.roll, 0, 0, 0])

      const { cards } = drawPokemonPackCards([...parentCards, ...galleryCards], {
        setId: 'swsh12.5',
      })

      expect(cards[8]?.id).toBe(slotCase.id)
      expect(cards[8]?.finish).toBe('holo')
    }
  })

  test('keeps persisted gallery cards out of the Crown Zenith parent rare slot', () => {
    const allCards = [
      ...makeCards('common', 'Common', 6, ['normal', 'reverse_holo'], 'swsh12.5'),
      ...makeCards('uncommon', 'Uncommon', 4, ['normal', 'reverse_holo'], 'swsh12.5'),
      ...makeCards('rare', 'Rare', 1, ['normal', 'reverse_holo'], 'swsh12.5'),
      ...makeCards('secret', 'Secret Rare', 1, ['holo'], 'swsh12.5'),
      makeCard('swsh12.5gg-GG67', 'swsh12.5', 'GG67'),
    ]
    useRandomSequence([...Array<number>(8).fill(0), 0.5, 0, 0.999, 0.999])

    const { cards } = drawPokemonPackCards(allCards, {
      enableGodPack: false,
      setId: 'swsh12.5',
    })

    expect(cards[9]?.id).toBe('secret-0')
  })

  test('draws the Crown Zenith nine-card illustration god pack at one in 700', () => {
    const fixedGalleryCards = Array.from({ length: 9 }, (_, index) => {
      const number = `GG${String(index + 26).padStart(2, '0')}`
      return makeCard(`swsh12.5gg-${number}`, 'swsh12.5', number)
    })
    const vCard = {
      ...makeCard('swsh12.5-016', 'swsh12.5', '016'),
      rarity: 'Holo Rare V',
    }
    useRandomSequence([0, 0, 0])

    const { cards, isGodPack } = drawPokemonPackCards([...fixedGalleryCards, vCard], {
      setId: 'swsh12.5',
    })

    expect(isGodPack).toBe(true)
    expect(cards.map((card) => card.number)).toEqual([
      'GG26',
      'GG27',
      'GG28',
      'GG29',
      'GG30',
      'GG31',
      'GG32',
      'GG33',
      'GG34',
      '016',
    ])
    expect(cards.every((card) => card.finish === 'holo')).toBe(true)
  })

  test('draws Amazing and Radiant Rares from the shared reverse slot', () => {
    const insertCases = [
      { setId: 'swsh4', rarity: 'Amazing Rare', roll: 0.01 },
      { setId: 'swsh4', rarity: 'Magnifique', roll: 0.01 },
      { setId: 'swsh10', rarity: 'Radiant Rare', roll: 0.13 },
      { setId: 'swsh11', rarity: 'Radieux Rare', roll: 0.13 },
      { setId: 'swsh12.5', rarity: 'Radiant Rare', roll: 0.37 },
    ] as const

    for (const insertCase of insertCases) {
      const allCards = [
        ...makeCards('common', 'Common', 6, ['normal', 'reverse_holo'], insertCase.setId),
        ...makeCards('uncommon', 'Uncommon', 4, ['normal', 'reverse_holo'], insertCase.setId),
        ...makeCards('rare', 'Rare', 1, ['normal', 'reverse_holo'], insertCase.setId),
        ...makeCards('insert', insertCase.rarity, 1, ['holo'], insertCase.setId),
      ]
      useRandomSequence([...Array<number>(8).fill(0), insertCase.roll, 0, 0, 0])

      const { cards } = drawPokemonPackCards(allCards, { setId: insertCase.setId })

      expect(cards).toHaveLength(10)
      expect(cards[8]?.rarity).toBe(insertCase.rarity)
      expect(cards[8]?.finish).toBe('holo')
      expect(cards[9]?.rarity).toBe('Rare')
    }
  })
})

const makeCards = (
  prefix: string,
  rarity: string,
  count: number,
  finishes: PokemonCardSummary['finishes'],
  setId = 'test-set',
): PokemonCardSummary[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index}`,
    imageLarge: `https://example.com/${prefix}-${index}.png`,
    imageSmall: `https://example.com/${prefix}-${index}.png`,
    name: `${prefix} ${index}`,
    number: `${index}`,
    rarity,
    setId,
    finishes,
  }))

const makeCard = (id: string, setId: string, number: string): PokemonCardSummary => ({
  id,
  imageLarge: `https://example.com/${id}.png`,
  imageSmall: `https://example.com/${id}.png`,
  name: `Localized gallery card ${number}`,
  number,
  rarity: 'Secret Rare',
  setId,
  finishes: ['holo'],
})

const makeModernCards = (setId: string): PokemonCardSummary[] => [
  ...makeCards('common', 'Common', 6, ['normal', 'reverse_holo'], setId),
  ...makeCards('uncommon', 'Uncommon', 5, ['normal', 'reverse_holo'], setId),
  ...makeCards('rare', 'Rare', 2, ['holo', 'reverse_holo'], setId),
  ...makeCards('double-rare', 'Double Rare', 2, ['holo'], setId),
  ...makeCards('illustration-rare', 'Illustration Rare', 2, ['holo'], setId),
  ...makeCards('ultra-rare', 'Ultra Rare', 2, ['holo'], setId),
  ...makeCards('special-illustration-rare', 'Special Illustration Rare', 2, ['holo'], setId),
  ...makeCards('mega-hyper-rare', 'Mega Hyper Rare', 1, ['holo'], setId),
]

const useRandomSequence = (values: number[]): void => {
  let index = 0

  Math.random = () => {
    const value = values[index]
    index += 1

    if (value === undefined) {
      throw new Error('Random sequence exhausted')
    }

    return value
  }
}
