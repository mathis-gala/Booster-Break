import type { CardFinish, PokemonCardSummary } from './index'
import { canonicalizeRarity, normalizeRarity } from './pokemon-rarity'
import { getSwshGallerySetId } from './pokemon-swsh-gallery'

const COMMON_CARD_SLOTS = 4
const UNCOMMON_CARD_SLOTS = 3
const FIRST_REVERSE_FOIL_SLOTS = 1
const SECOND_REVERSE_OR_SECRET_FOIL_SLOTS = 1
const RARE_OR_BETTER_SLOTS = 1
const PACK_CARD_COUNT =
  COMMON_CARD_SLOTS +
  UNCOMMON_CARD_SLOTS +
  FIRST_REVERSE_FOIL_SLOTS +
  SECOND_REVERSE_OR_SECRET_FOIL_SLOTS +
  RARE_OR_BETTER_SLOTS

const COMMON_RARITIES = ['Common', 'Commune']
const UNCOMMON_RARITIES = ['Uncommon', 'Peu Commune']
const RARE_RARITIES = ['Rare']
const REVERSE_FOIL_RARITIES = [...COMMON_RARITIES, ...UNCOMMON_RARITIES, ...RARE_RARITIES]
const SWSH_REVERSE_FOIL_RARITIES = [...REVERSE_FOIL_RARITIES, 'Holo Rare']

const HISTORICAL_COMMON_CARD_SLOTS = 5
const HISTORICAL_UNCOMMON_CARD_SLOTS = 3
const HISTORICAL_REVERSE_OR_INSERT_SLOTS = 1
const COSMIC_ECLIPSE_SET_ID = 'sm12'
const COSMIC_ECLIPSE_CHARACTER_RARE_CHANCE = 100 / 12
const HISTORICAL_HOLO_RARE_CHANCE = 25
const HISTORICAL_HIT_CHANCE = 100 / 12

const GOD_PACK_CHANCE = 0.16
// Crown Zenith did not have this pack in English. This emulates the VSTAR Universe
// nine-AR pack with its English GG equivalents at the observed estimate of 1 in 700.
const CROWN_ZENITH_GOD_PACK_CHANCE = 100 / 700
const CROWN_ZENITH_GOD_PACK_GG_NUMBERS = [
  'GG26',
  'GG27',
  'GG28',
  'GG29',
  'GG30',
  'GG31',
  'GG32',
  'GG33',
  'GG34',
] as const
const GOD_PACK_RARITIES = [
  'Illustration rare',
  'Illustration Rare',
  'Ultra Rare',
  'ACE SPEC Rare',
  'Ace Spec Rare',
  'ACE SPEC rare',
  'Special illustration rare',
  'Special Illustration Rare',
  'Mega Hyper Rare',
  'Hyper rare',
  'Hyper Rare',
]

const GOD_PACK_SLOT_RULES: ChanceRule[] = [
  {
    chance: 31.96,
    finish: 'holo',
    rarities: ['Illustration rare', 'Illustration Rare'],
  },
  {
    chance: 27.38,
    finish: 'holo',
    rarities: ['Ultra Rare'],
  },
  {
    chance: 19.83,
    finish: 'holo',
    rarities: ['ACE SPEC Rare', 'Ace Spec Rare', 'ACE SPEC rare'],
  },
  {
    chance: 13.13,
    finish: 'holo',
    rarities: ['Special illustration rare', 'Special Illustration Rare'],
  },
  {
    chance: 7.71,
    finish: 'holo',
    rarities: ['Mega Hyper Rare', 'Hyper rare', 'Hyper Rare'],
  },
]

// In Prismatic Evolutions (sv08.5) the ACE SPEC Rare replaces the first reverse holo
// slot ~4.76% of the time (TCGplayer sample) and is additive: the rare slot still yields its own.
const FIRST_FOIL_SLOT_RULES: ChanceRule[] = [
  {
    chance: 4.76,
    finish: 'holo',
    rarities: ['ACE SPEC Rare', 'Ace Spec Rare', 'ACE SPEC rare'],
  },
]

const SECOND_FOIL_SLOT_RULES: ChanceRule[] = [
  {
    chance: 7.67,
    finish: 'holo',
    rarities: ['Illustration rare', 'Illustration Rare'],
  },
  {
    chance: 3.15,
    finish: 'holo',
    rarities: ['Special illustration rare', 'Special Illustration Rare'],
  },
  {
    chance: 1.85,
    finish: 'holo',
    rarities: ['Mega Hyper Rare', 'Hyper rare', 'Hyper Rare'],
  },
]

const RARE_SLOT_RULES: ChanceRule[] = [
  {
    chance: 13.76,
    finish: 'holo',
    rarities: ['Double rare', 'Double Rare'],
  },
  {
    chance: 6.57,
    finish: 'holo',
    rarities: ['Ultra Rare'],
  },
]

const MODERN_SET_SLOT_RULES: Partial<
  Record<string, { secondFoil: ChanceRule[]; rare: ChanceRule[] }>
> = {
  // Observed TCGplayer samples: 8,500+ Chaos Rising and 4,000+ Pitch Black packs.
  me04: {
    secondFoil: [
      { chance: 10.66, finish: 'holo', rarities: ['Illustration rare', 'Illustration Rare'] },
      {
        chance: 1.21,
        finish: 'holo',
        rarities: ['Special illustration rare', 'Special Illustration Rare'],
      },
      { chance: 0.1, finish: 'holo', rarities: ['Mega Hyper Rare'] },
    ],
    rare: [
      { chance: 20.3, finish: 'holo', rarities: ['Double rare', 'Double Rare'] },
      { chance: 8.29, finish: 'holo', rarities: ['Ultra Rare'] },
    ],
  },
  me05: {
    secondFoil: [
      { chance: 11.01, finish: 'holo', rarities: ['Illustration rare', 'Illustration Rare'] },
      {
        chance: 1.25,
        finish: 'holo',
        rarities: ['Special illustration rare', 'Special Illustration Rare'],
      },
      { chance: 0.09, finish: 'holo', rarities: ['Mega Hyper Rare'] },
    ],
    rare: [
      { chance: 21.02, finish: 'holo', rarities: ['Double rare', 'Double Rare'] },
      { chance: 8.3, finish: 'holo', rarities: ['Ultra Rare'] },
    ],
  },
}

interface ChanceRule {
  chance: number
  finish: CardFinish
  rarities: string[]
}

type SwshRareSlotChances = readonly [number, number, number, number, number, number, number]

const SWSH_RARE_SLOT_CHANCES = {
  swsh1: [59.94, 17.78, 14.2, 2.2, 0, 3.74, 2.14],
  swsh2: [59.96, 17.78, 12.65, 3.4, 0, 3.76, 2.45],
  swsh3: [59.88, 17.78, 12.58, 3.85, 0, 3.85, 2.06],
  swsh4: [60.12, 16.76, 12.41, 4.17, 0, 4.07, 2.47],
  swsh5: [60.23, 17.78, 12.1, 4.34, 0, 3.63, 1.92],
  swsh6: [58.8, 17.78, 13.2, 4.18, 0, 4, 2.04],
  swsh7: [60.13, 17.78, 10.56, 5.6, 0, 3.88, 2.05],
  swsh8: [60.18, 17.78, 12.82, 3.57, 0, 3.63, 2.02],
  swsh9: [58.14, 17.78, 13.89, 1.06, 2.41, 4.31, 2.41],
  swsh10: [60.14, 17.78, 12.77, 0.77, 2.7, 3.79, 2.05],
  swsh11: [60.22, 17.78, 11.63, 0.63, 3.79, 3.9, 2.05],
  swsh12: [61.04, 17.78, 11.55, 0.53, 3.19, 3.71, 2.2],
  'swsh12.5': [60.97, 17.78, 12.35, 2.04, 3.26, 2.85, 0.75],
} satisfies Record<string, SwshRareSlotChances>

type SwshSetId = keyof typeof SWSH_RARE_SLOT_CHANCES

const SWSH_RARE_SLOT_CATEGORIES: Array<Omit<ChanceRule, 'chance'>> = [
  { finish: 'normal', rarities: ['Rare'] },
  { finish: 'holo', rarities: ['Holo Rare'] },
  { finish: 'holo', rarities: ['Holo Rare V'] },
  { finish: 'holo', rarities: ['Holo Rare VMAX'] },
  { finish: 'holo', rarities: ['Holo Rare VSTAR'] },
  { finish: 'holo', rarities: ['Ultra Rare', 'Full Art Trainer', 'Dresseur Full Art'] },
  { finish: 'holo', rarities: ['Secret Rare', 'Magnifique rare'] },
]

interface SwshGallerySlotChances {
  normal: number
  premium: number
  gold: number
}

const SWSH_GALLERY_SLOT_CHANCES: Partial<Record<SwshSetId, SwshGallerySlotChances>> = {
  swsh9: { normal: 8.74, premium: 3.36, gold: 0.87 },
  swsh10: { normal: 8.48, premium: 4.1, gold: 0 },
  swsh11: { normal: 8.29, premium: 3.16, gold: 0.86 },
  swsh12: { normal: 8.25, premium: 3.08, gold: 0.9 },
  'swsh12.5': { normal: 22.4, premium: 12, gold: 0.8 },
}

type SwshGalleryCategory = keyof SwshGallerySlotChances

interface SwshReverseInsertRule {
  chance: number
  rarities: string[]
}

// Amazing and Radiant Rares replace the reverse card rather than the rare slot.
const SWSH_REVERSE_INSERT_RULES: Partial<Record<SwshSetId, SwshReverseInsertRule>> = {
  swsh4: { chance: 5.17, rarities: ['Amazing Rare', 'Magnifique'] },
  swsh10: { chance: 4.88, rarities: ['Radiant Rare', 'Radieux Rare'] },
  swsh11: { chance: 5.01, rarities: ['Radiant Rare', 'Radieux Rare'] },
  swsh12: { chance: 4.55, rarities: ['Radiant Rare', 'Radieux Rare'] },
  'swsh12.5': { chance: 4.55, rarities: ['Radiant Rare', 'Radieux Rare'] },
}

type SwshReverseSlotCategory = SwshGalleryCategory | 'insert'

interface SwshGalleryCardRanges {
  prefix: 'TG' | 'GG'
  normal: readonly [number, number]
  premium: readonly [number, number]
  gold: readonly [number, number]
}

const SWSH_GALLERY_CARD_RANGES: Record<string, SwshGalleryCardRanges> = {
  'swsh9.5tg': { prefix: 'TG', normal: [1, 12], premium: [13, 28], gold: [29, 30] },
  // The Astral Radiance sample reports one aggregate TG13-TG30 premium rate.
  'swsh10.5tg': { prefix: 'TG', normal: [1, 12], premium: [13, 30], gold: [0, 0] },
  'swsh11.5tg': { prefix: 'TG', normal: [1, 11], premium: [12, 28], gold: [29, 30] },
  'swsh12.5tg': { prefix: 'TG', normal: [1, 11], premium: [12, 28], gold: [29, 30] },
  'swsh12.5gg': { prefix: 'GG', normal: [1, 34], premium: [35, 66], gold: [67, 70] },
}

interface WeightedCardRule {
  cards: PokemonCardSummary[]
  chance: number
  finish: CardFinish
}

export interface PokemonPackDrawResult {
  cards: PokemonCardSummary[]
  isGodPack: boolean
}

export const drawPokemonPackCards = (
  allCards: PokemonCardSummary[],
  options: { enableGodPack?: boolean; setId?: string } = {},
): PokemonPackDrawResult => {
  const { enableGodPack = true, setId } = options

  if (setId && isSwshSetId(setId)) {
    return drawSwshPack(allCards, setId, enableGodPack)
  }

  if (setId && isHistoricalSetId(setId)) {
    return drawHistoricalPack(allCards, setId)
  }

  const godPack = enableGodPack && !setId?.startsWith('me') ? drawGodPack(allCards) : undefined

  if (godPack) {
    return { cards: godPack, isGodPack: true }
  }

  const selectedCards = new Set<string>()
  const slotRules = (setId ? MODERN_SET_SLOT_RULES[setId] : undefined) ?? {
    secondFoil: SECOND_FOIL_SLOT_RULES,
    rare: RARE_SLOT_RULES,
  }

  const cards = [
    ...drawManyUnique(
      getCardsByRarity(allCards, COMMON_RARITIES),
      COMMON_CARD_SLOTS,
      selectedCards,
      'normal',
    ),
    ...drawManyUnique(
      getCardsByRarity(allCards, UNCOMMON_RARITIES),
      UNCOMMON_CARD_SLOTS,
      selectedCards,
      'normal',
    ),
    ...drawFirstFoilSlot(allCards, selectedCards),
    ...drawSecondFoilSlot(allCards, selectedCards, slotRules.secondFoil),
    ...drawRareSlot(allCards, selectedCards, slotRules.rare),
  ]

  if (cards.length < PACK_CARD_COUNT) {
    cards.push(...drawManyUnique(allCards, PACK_CARD_COUNT - cards.length, selectedCards))
  }

  return { cards, isGodPack: false }
}

const drawHistoricalPack = (
  allCards: PokemonCardSummary[],
  setId: string,
): PokemonPackDrawResult => {
  const selectedCards = new Set<string>()
  const setCards = allCards.filter((card) => card.setId === setId)
  const cards = [
    ...drawManyUnique(
      getCardsByRarity(setCards, COMMON_RARITIES),
      HISTORICAL_COMMON_CARD_SLOTS,
      selectedCards,
      'normal',
    ),
    ...drawManyUnique(
      getCardsByRarity(setCards, UNCOMMON_RARITIES),
      HISTORICAL_UNCOMMON_CARD_SLOTS,
      selectedCards,
      'normal',
    ),
    ...drawHistoricalReverseOrInsertSlot(setCards, setId, selectedCards),
    ...drawHistoricalRareSlot(setCards, selectedCards),
  ]

  if (cards.length < PACK_CARD_COUNT) {
    const fillerCards = getCardsByRarity(setCards, [...COMMON_RARITIES, ...UNCOMMON_RARITIES])
    cards.push(
      ...drawManyUnique(fillerCards, PACK_CARD_COUNT - cards.length, selectedCards, 'normal'),
    )
  }

  return { cards, isGodPack: false }
}

const drawHistoricalReverseOrInsertSlot = (
  cards: PokemonCardSummary[],
  setId: string,
  selectedCards: Set<string>,
): PokemonCardSummary[] => {
  if (
    setId === COSMIC_ECLIPSE_SET_ID &&
    Math.random() * 100 < COSMIC_ECLIPSE_CHARACTER_RARE_CHANCE
  ) {
    const characterRare = drawUniqueCard(cards.filter(isCosmicEclipseCharacterRare), selectedCards)

    if (characterRare) {
      return [withFinish(characterRare, 'holo')]
    }
  }

  return drawManyUnique(
    getHistoricalReverseCandidates(cards),
    HISTORICAL_REVERSE_OR_INSERT_SLOTS,
    selectedCards,
    'reverse_holo',
  )
}

const drawHistoricalRareSlot = (
  cards: PokemonCardSummary[],
  selectedCards: Set<string>,
): PokemonCardSummary[] => {
  const normalRares = cards.filter(isHistoricalNormalRare)
  const explicitlyLabeledHoloRares = cards.filter((card) => {
    const rarity = canonicalizeRarity(card.rarity)
    return (rarity === 'rare holo' || rarity === 'holo rare') && !isHistoricalNamedHit(card)
  })
  const holoRares = explicitlyLabeledHoloRares.length > 0 ? explicitlyLabeledHoloRares : normalRares
  const hits = cards.filter(isHistoricalHit)
  const roll = Math.random() * 100
  const category =
    roll < HISTORICAL_HIT_CHANCE
      ? { cards: hits, finish: 'holo' as const }
      : roll < HISTORICAL_HIT_CHANCE + HISTORICAL_HOLO_RARE_CHANCE
        ? { cards: holoRares, finish: 'holo' as const }
        : { cards: normalRares, finish: 'normal' as const }
  const selectedCard = drawUniqueCard(category.cards, selectedCards)
  const fallbackCard = selectedCard ?? drawUniqueCard(normalRares, selectedCards)

  if (fallbackCard) {
    return [withFinish(fallbackCard, selectedCard ? category.finish : 'normal')]
  }

  const availableRare = drawUniqueCard([...holoRares, ...hits], selectedCards)
  return availableRare ? [withFinish(availableRare, 'holo')] : []
}

const isCosmicEclipseCharacterRare = (card: PokemonCardSummary): boolean => {
  const number = Number(card.number)
  return number >= 237 && number <= 248
}

const isHistoricalNormalRare = (card: PokemonCardSummary): boolean =>
  canonicalizeRarity(card.rarity) === 'rare' && !isHistoricalNamedHit(card)

const isHistoricalHit = (card: PokemonCardSummary): boolean => {
  if (card.setId === COSMIC_ECLIPSE_SET_ID && isCosmicEclipseCharacterRare(card)) {
    return false
  }

  const rarity = canonicalizeRarity(card.rarity)
  return (
    isHistoricalNamedHit(card) ||
    (rarity.length > 0 &&
      !['common', 'commune', 'uncommon', 'peu commune', 'rare', 'rare holo', 'holo rare'].includes(
        rarity,
      ))
  )
}

const isHistoricalNamedHit = (card: PokemonCardSummary): boolean => {
  const name = normalizeRarity(card.name)
  return /\b(?:ex|gx|break|legend)\b|\blv x\b/.test(name) || /[☆★]/.test(card.name)
}

const getHistoricalReverseCandidates = (cards: PokemonCardSummary[]): PokemonCardSummary[] => {
  const advertisedCandidates = cards.filter((card) => card.finishes?.includes('reverse_holo'))

  return advertisedCandidates.length > 0
    ? advertisedCandidates
    : getCardsByRarity(cards, REVERSE_FOIL_RARITIES)
}

const isHistoricalSetId = (setId: string): boolean =>
  /^(?:ecard|ex|dp|pl|hgss|bw|xy|sm)\d+(?:\.\d+)?$/i.test(setId)

const drawSwshPack = (
  allCards: PokemonCardSummary[],
  parentSetId: SwshSetId,
  enableGodPack: boolean,
): PokemonPackDrawResult => {
  const godPack =
    enableGodPack && parentSetId === 'swsh12.5'
      ? drawCrownZenithGodPack(allCards, parentSetId)
      : undefined

  if (godPack) {
    return { cards: godPack, isGodPack: true }
  }

  const selectedCards = new Set<string>()
  const parentCards = getSwshParentCards(allCards, parentSetId)
  const cards = [
    ...drawManyUnique(getCardsByRarity(parentCards, COMMON_RARITIES), 5, selectedCards, 'normal'),
    ...drawManyUnique(getCardsByRarity(parentCards, UNCOMMON_RARITIES), 3, selectedCards, 'normal'),
    ...drawSwshReverseOrGallerySlot(allCards, parentSetId, selectedCards),
    ...drawSwshRareSlot(parentCards, parentSetId, selectedCards),
  ]

  if (cards.length < PACK_CARD_COUNT) {
    cards.push(...drawManyUnique(parentCards, PACK_CARD_COUNT - cards.length, selectedCards))
  }

  return { cards, isGodPack: false }
}

const drawSwshReverseOrGallerySlot = (
  allCards: PokemonCardSummary[],
  parentSetId: SwshSetId,
  selectedCards: Set<string>,
): PokemonCardSummary[] => {
  const reverseCandidates = allCards.filter(
    (card) =>
      card.setId === parentSetId &&
      hasRarity(card, SWSH_REVERSE_FOIL_RARITIES) &&
      card.finishes?.includes('reverse_holo'),
  )
  const galleryChances = SWSH_GALLERY_SLOT_CHANCES[parentSetId]
  const gallerySetId = getSwshGallerySetId(parentSetId)
  const insertRule = SWSH_REVERSE_INSERT_RULES[parentSetId]

  if (!galleryChances && !insertRule) {
    return drawManyUnique(reverseCandidates, 1, selectedCards, 'reverse_holo')
  }

  const galleryCards = gallerySetId
    ? allCards.filter((card) => isCardFromSourceSet(card, gallerySetId))
    : []
  const insertCards = insertRule
    ? allCards.filter((card) => card.setId === parentSetId && hasRarity(card, insertRule.rarities))
    : []
  const category = drawSwshReverseSlotCategory(galleryChances, insertRule?.chance ?? 0)

  if (category === 'insert' && insertRule) {
    const insertCard = drawUniqueCard(insertCards, selectedCards)

    if (insertCard) {
      return [withFinish(insertCard, 'holo')]
    }
  }

  if (category && category !== 'insert') {
    const galleryCard = drawUniqueCard(
      galleryCards.filter((card) => getSwshGalleryCardCategory(card) === category),
      selectedCards,
    )

    if (galleryCard) {
      return [withFinish(galleryCard, 'holo')]
    }
  }

  const reverseCard = drawUniqueCard(reverseCandidates, selectedCards)

  if (reverseCard) {
    return [withFinish(reverseCard, 'reverse_holo')]
  }

  const galleryFallback = drawWeightedAvailableCard(
    [
      ...(['normal', 'premium', 'gold'] as const).map((galleryCategory) => ({
        cards: galleryCards.filter((card) => getSwshGalleryCardCategory(card) === galleryCategory),
        chance: galleryChances?.[galleryCategory] ?? 0,
        finish: 'holo' as const,
      })),
      { cards: insertCards, chance: insertRule?.chance ?? 0, finish: 'holo' },
    ],
    selectedCards,
  )

  return galleryFallback ? [galleryFallback] : []
}

const drawSwshReverseSlotCategory = (
  galleryChances: SwshGallerySlotChances | undefined,
  insertChance: number,
): SwshReverseSlotCategory | undefined => {
  const roll = Math.random() * 100
  let cursor = 0

  for (const category of ['normal', 'premium', 'gold'] as const) {
    cursor += galleryChances?.[category] ?? 0

    if (roll < cursor) {
      return category
    }
  }

  if (roll < cursor + insertChance) {
    return 'insert'
  }

  return undefined
}

const getSwshGalleryCardCategory = (card: PokemonCardSummary): SwshGalleryCategory | undefined => {
  const sourceSetId = getCardSourceSetId(card)
  const ranges = SWSH_GALLERY_CARD_RANGES[sourceSetId] ?? SWSH_GALLERY_CARD_RANGES[card.setId]
  const localId = /^([A-Z]{2})(\d+)$/.exec(card.number.toUpperCase())

  if (!ranges || !localId || localId[1] !== ranges.prefix) {
    return undefined
  }

  const localNumber = Number(localId[2])

  for (const category of ['normal', 'premium', 'gold'] as const) {
    const [minimum, maximum] = ranges[category]

    if (localNumber >= minimum && localNumber <= maximum) {
      return category
    }
  }

  return undefined
}

const drawCrownZenithGodPack = (
  allCards: PokemonCardSummary[],
  parentSetId: SwshSetId,
): PokemonCardSummary[] | undefined => {
  const galleryCards = CROWN_ZENITH_GOD_PACK_GG_NUMBERS.map((number) =>
    allCards.find((card) => card.number.toUpperCase() === number),
  )
  const parentCards = getSwshParentCards(allCards, parentSetId)
  const rareSlotRules: WeightedCardRule[] = [
    { cards: getCardsByRarity(parentCards, ['Holo Rare V']), chance: 12.35, finish: 'holo' },
    { cards: getCardsByRarity(parentCards, ['Holo Rare VMAX']), chance: 2.04, finish: 'holo' },
    { cards: getCardsByRarity(parentCards, ['Holo Rare VSTAR']), chance: 3.26, finish: 'holo' },
  ]

  if (
    galleryCards.some((card) => !card) ||
    rareSlotRules.every((rule) => rule.cards.length === 0)
  ) {
    return undefined
  }

  if (Math.random() * 100 >= CROWN_ZENITH_GOD_PACK_CHANCE) {
    return undefined
  }

  const selectedCards = new Set(galleryCards.flatMap((card) => (card ? [card.id] : [])))
  const rareSlotCard = drawWeightedAvailableCard(rareSlotRules, selectedCards)

  if (!rareSlotCard) {
    return undefined
  }

  return [
    ...(galleryCards as PokemonCardSummary[]).map((card) => withFinish(card, 'holo')),
    rareSlotCard,
  ]
}

const getSwshParentCards = (
  cards: PokemonCardSummary[],
  parentSetId: SwshSetId,
): PokemonCardSummary[] => {
  const gallerySetId = getSwshGallerySetId(parentSetId)

  return cards.filter(
    (card) =>
      card.setId === parentSetId && (!gallerySetId || !isCardFromSourceSet(card, gallerySetId)),
  )
}

const isCardFromSourceSet = (card: PokemonCardSummary, setId: string): boolean => {
  return card.setId === setId || getCardSourceSetId(card) === setId
}

const getCardSourceSetId = (card: PokemonCardSummary): string => {
  const separatorIndex = card.id.lastIndexOf('-')
  return separatorIndex >= 0 ? card.id.slice(0, separatorIndex) : card.setId
}

const drawSwshRareSlot = (
  parentCards: PokemonCardSummary[],
  parentSetId: SwshSetId,
  selectedCards: Set<string>,
): PokemonCardSummary[] => {
  const chances = SWSH_RARE_SLOT_CHANCES[parentSetId]
  const rules = SWSH_RARE_SLOT_CATEGORIES.map((category, index) => ({
    cards: getCardsByRarity(parentCards, category.rarities),
    chance: chances[index],
    finish: category.finish,
  }))
  const roll = Math.random() * 100
  let cursor = 0
  let selectedRule = rules[rules.length - 1]

  for (const rule of rules) {
    cursor += rule.chance

    if (roll < cursor) {
      selectedRule = rule
      break
    }
  }

  const selectedCard = selectedRule ? drawUniqueCard(selectedRule.cards, selectedCards) : undefined
  const normalRareRule = rules[0]
  let rareCard =
    selectedCard && selectedRule ? withFinish(selectedCard, selectedRule.finish) : undefined

  if (!rareCard && normalRareRule) {
    const normalRareCard = drawUniqueCard(normalRareRule.cards, selectedCards)
    rareCard = normalRareCard ? withFinish(normalRareCard, normalRareRule.finish) : undefined
  }

  return rareCard ? [rareCard] : []
}

const drawWeightedAvailableCard = (
  rules: WeightedCardRule[],
  selectedCards: Set<string>,
): PokemonCardSummary | undefined => {
  const availableRules = rules.filter(
    (rule) => rule.chance > 0 && rule.cards.some((card) => !selectedCards.has(card.id)),
  )
  const totalChance = availableRules.reduce((total, rule) => total + rule.chance, 0)

  if (totalChance === 0) {
    return undefined
  }

  let roll = Math.random() * totalChance
  let selectedRule = availableRules[availableRules.length - 1]

  for (const rule of availableRules) {
    if (roll < rule.chance) {
      selectedRule = rule
      break
    }

    roll -= rule.chance
  }

  const card = selectedRule ? drawUniqueCard(selectedRule.cards, selectedCards) : undefined

  return card && selectedRule ? withFinish(card, selectedRule.finish) : undefined
}

const isSwshSetId = (setId: string): setId is SwshSetId => {
  return Object.prototype.hasOwnProperty.call(SWSH_RARE_SLOT_CHANCES, setId)
}

const drawGodPack = (allCards: PokemonCardSummary[]): PokemonCardSummary[] | undefined => {
  const candidates = getCardsByRarity(allCards, GOD_PACK_RARITIES)

  if (candidates.length < PACK_CARD_COUNT) {
    return undefined
  }

  if (Math.random() * 100 >= GOD_PACK_CHANCE) {
    return undefined
  }

  const selectedCards = new Set<string>()
  const cards: PokemonCardSummary[] = []

  for (let slot = 0; slot < PACK_CARD_COUNT; slot += 1) {
    const card = drawGodPackSlot(allCards, selectedCards)

    if (card) {
      cards.push(card)
    }
  }

  return cards
}

const drawGodPackSlot = (
  allCards: PokemonCardSummary[],
  selectedCards: Set<string>,
): PokemonCardSummary | undefined => {
  const availableRules = GOD_PACK_SLOT_RULES.filter((rule) =>
    getCardsByRarity(allCards, rule.rarities).some((card) => !selectedCards.has(card.id)),
  )

  const totalChance = availableRules.reduce((sum, rule) => sum + rule.chance, 0)

  if (totalChance === 0) {
    return undefined
  }

  let roll = Math.random() * totalChance

  for (const rule of availableRules) {
    roll -= rule.chance

    if (roll <= 0) {
      const card = drawUniqueCard(getCardsByRarity(allCards, rule.rarities), selectedCards)

      if (card) {
        return withFinish(card, rule.finish)
      }
    }
  }

  return undefined
}

const drawFirstFoilSlot = (
  allCards: PokemonCardSummary[],
  selectedCards: Set<string>,
): PokemonCardSummary[] => {
  const aceSpec = drawChanceRule(allCards, FIRST_FOIL_SLOT_RULES, selectedCards)

  if (aceSpec) {
    return [aceSpec]
  }

  return drawManyUnique(
    getReverseFoilCandidates(allCards),
    FIRST_REVERSE_FOIL_SLOTS,
    selectedCards,
    'reverse_holo',
  )
}

const drawSecondFoilSlot = (
  allCards: PokemonCardSummary[],
  selectedCards: Set<string>,
  rules: ChanceRule[],
): PokemonCardSummary[] => {
  const secretCard = drawChanceRule(allCards, rules, selectedCards)

  if (secretCard) {
    return [secretCard]
  }

  return drawManyUnique(
    getReverseFoilCandidates(allCards),
    SECOND_REVERSE_OR_SECRET_FOIL_SLOTS,
    selectedCards,
    'reverse_holo',
  )
}

const drawRareSlot = (
  allCards: PokemonCardSummary[],
  selectedCards: Set<string>,
  rules: ChanceRule[],
): PokemonCardSummary[] => {
  const rareHit = drawChanceRule(allCards, rules, selectedCards)

  if (rareHit) {
    return [rareHit]
  }

  return drawManyUnique(
    getCardsByRarity(allCards, RARE_RARITIES),
    RARE_OR_BETTER_SLOTS,
    selectedCards,
    'holo',
  )
}

const drawChanceRule = (
  allCards: PokemonCardSummary[],
  rules: ChanceRule[],
  selectedCards: Set<string>,
): PokemonCardSummary | undefined => {
  const roll = Math.random() * 100
  let chanceCursor = 0

  for (const rule of rules) {
    chanceCursor += rule.chance

    if (roll >= chanceCursor) {
      continue
    }

    const card = drawUniqueCard(getCardsByRarity(allCards, rule.rarities), selectedCards)

    return card ? withFinish(card, rule.finish) : undefined
  }

  return undefined
}

const getReverseFoilCandidates = (cards: PokemonCardSummary[]): PokemonCardSummary[] => {
  const reverseCandidates = getCardsByRarity(cards, REVERSE_FOIL_RARITIES).filter((card) =>
    card.finishes?.includes('reverse_holo'),
  )

  return reverseCandidates.length > 0
    ? reverseCandidates
    : getCardsByRarity(cards, REVERSE_FOIL_RARITIES)
}

const getCardsByRarity = (
  cards: PokemonCardSummary[],
  rarities: string[],
): PokemonCardSummary[] => {
  return cards.filter((card) => hasRarity(card, rarities))
}

const hasRarity = (card: PokemonCardSummary, rarities: readonly string[]): boolean => {
  const rarity = canonicalizeRarity(card.rarity)
  return rarities.some((candidate) => canonicalizeRarity(candidate) === rarity)
}

const drawManyUnique = (
  items: PokemonCardSummary[],
  count: number,
  selectedCards: Set<string>,
  finish?: CardFinish,
): PokemonCardSummary[] => {
  const results: PokemonCardSummary[] = []

  for (let index = 0; index < count; index += 1) {
    const card = drawUniqueCard(items, selectedCards)

    if (!card) {
      break
    }

    results.push(withFinish(card, finish ?? getDefaultFinish(card)))
  }

  return results
}

const drawUniqueCard = (
  items: PokemonCardSummary[],
  selectedCards: Set<string>,
): PokemonCardSummary | undefined => {
  const remainingItems = items.filter((item) => !selectedCards.has(item.id))

  if (remainingItems.length === 0) {
    return undefined
  }

  const item = remainingItems[Math.floor(Math.random() * remainingItems.length)]
  selectedCards.add(item.id)

  return item
}

const withFinish = (card: PokemonCardSummary, finish: CardFinish): PokemonCardSummary => ({
  ...card,
  finish,
})

const getDefaultFinish = (card: PokemonCardSummary): CardFinish => {
  const finishes = card.finishes ?? ['normal']

  if (finishes.includes('normal')) {
    return 'normal'
  }

  return finishes[0] ?? 'normal'
}
