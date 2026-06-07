import type { CardFinish, PokemonCardSummary } from '@tcg-collection/shared'

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

const COMMON_RARITIES = ['Common']
const UNCOMMON_RARITIES = ['Uncommon']
const RARE_RARITIES = ['Rare']
const REVERSE_FOIL_RARITIES = [...COMMON_RARITIES, ...UNCOMMON_RARITIES, ...RARE_RARITIES]

// In Prismatic Evolutions (sv08.5) the ACE SPEC Rare replaces the first reverse
// holo slot ~1 in 21 packs (~4.76%, TCGplayer 1,200-pack sample) and is additive:
// the rare slot still yields its Double/Ultra Rare independently.
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

interface ChanceRule {
  chance: number
  finish: CardFinish
  rarities: string[]
}

export const drawPokemonPackCards = (allCards: PokemonCardSummary[]): PokemonCardSummary[] => {
  const selectedCards = new Set<string>()

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
    ...drawSecondFoilSlot(allCards, selectedCards),
    ...drawRareSlot(allCards, selectedCards),
  ]

  if (cards.length < PACK_CARD_COUNT) {
    cards.push(...drawManyUnique(allCards, PACK_CARD_COUNT - cards.length, selectedCards))
  }

  return cards
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
): PokemonCardSummary[] => {
  const secretCard = drawChanceRule(allCards, SECOND_FOIL_SLOT_RULES, selectedCards)

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
): PokemonCardSummary[] => {
  const rareHit = drawChanceRule(allCards, RARE_SLOT_RULES, selectedCards)

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

    if (roll > chanceCursor) {
      continue
    }

    const card = drawUniqueCard(getCardsByRarity(allCards, rule.rarities), selectedCards)

    if (card) {
      return withFinish(card, rule.finish)
    }
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
  return cards.filter((card) => rarities.includes(card.rarity ?? ''))
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
