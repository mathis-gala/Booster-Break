import type { CardFinish, PokemonCardSummary } from './index'

export const pokemonRarityOrder = [
  'Common',
  'Uncommon',
  'Rare',
  'Double rare',
  'Double Rare',
  'Illustration rare',
  'Illustration Rare',
  'Ultra Rare',
  'ACE SPEC Rare',
  'Special illustration rare',
  'Special Illustration Rare',
  'Mega Hyper Rare',
  'Hyper rare',
  'Hyper Rare',
] as const

const rarityRank: Record<string, number> = {
  Common: 10,
  Uncommon: 20,
  Rare: 30,
  'Double rare': 40,
  'Double Rare': 40,
  'Illustration rare': 50,
  'Illustration Rare': 50,
  'Ultra Rare': 60,
  'ACE SPEC Rare': 65,
  'Special illustration rare': 70,
  'Special Illustration Rare': 70,
  'Mega Hyper Rare': 80,
  'Hyper rare': 80,
  'Hyper Rare': 80,
}

const normalizeRarityValue = (value: string): string => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export const normalizeRarity = (value: string | null | undefined): string => {
  return normalizeRarityValue(value ?? '')
}

const finishRank: Record<CardFinish, number> = {
  normal: 10,
  reverse_holo: 20,
  holo: 30,
}

export const getRarityRank = (rarity: string | null | undefined): number => {
  return rarity ? (rarityRank[rarity] ?? 999) : 999
}

export const getFinishRank = (finish: string | null | undefined): number => {
  return finishRank[finish as CardFinish] ?? 999
}

export const isRareOrBetter = (rarity: string | null | undefined): boolean => {
  return !['Common', 'Uncommon'].includes(rarity ?? '')
}

export interface PackChanceRule {
  chance: number
  finish: CardFinish
  rarities: string[]
}

// ---------------------------------------------------------------------------
// Canonical pack composition — the SINGLE source of truth for booster odds.
// Consumed both by the draw logic (apps/api/src/pokemon/pack-draft.ts) and by
// the preview odds (getPackRarityChances below). Do not duplicate these values.
// ---------------------------------------------------------------------------

export const PACK_SLOT_COUNTS = {
  common: 4,
  uncommon: 3,
  firstReverseFoil: 1,
  secondReverseOrSecretFoil: 1,
  rareOrBetter: 1,
} as const

export const PACK_CARD_COUNT =
  PACK_SLOT_COUNTS.common +
  PACK_SLOT_COUNTS.uncommon +
  PACK_SLOT_COUNTS.firstReverseFoil +
  PACK_SLOT_COUNTS.secondReverseOrSecretFoil +
  PACK_SLOT_COUNTS.rareOrBetter

export const COMMON_RARITIES = ['Common']
export const UNCOMMON_RARITIES = ['Uncommon']
export const RARE_RARITIES = ['Rare']
export const REVERSE_FOIL_RARITIES = [...COMMON_RARITIES, ...UNCOMMON_RARITIES, ...RARE_RARITIES]

// In Prismatic Evolutions (sv08.5) the ACE SPEC Rare replaces the first reverse holo
// slot ~4.76% of the time (TCGplayer sample) and is additive: the rare slot still yields its own.
export const FIRST_FOIL_SLOT_RULES: PackChanceRule[] = [
  { chance: 4.76, finish: 'holo', rarities: ['ACE SPEC Rare', 'Ace Spec Rare', 'ACE SPEC rare'] },
]

export const SECOND_FOIL_SLOT_RULES: PackChanceRule[] = [
  { chance: 7.67, finish: 'holo', rarities: ['Illustration rare', 'Illustration Rare'] },
  {
    chance: 3.15,
    finish: 'holo',
    rarities: ['Special illustration rare', 'Special Illustration Rare'],
  },
  { chance: 1.85, finish: 'holo', rarities: ['Mega Hyper Rare', 'Hyper rare', 'Hyper Rare'] },
]

export const RARE_SLOT_RULES: PackChanceRule[] = [
  { chance: 13.76, finish: 'holo', rarities: ['Double rare', 'Double Rare'] },
  { chance: 6.57, finish: 'holo', rarities: ['Ultra Rare'] },
]

// What a slot draws when none of its chance rules fire.
//  - 'reverse-foil': a Common/Uncommon/Rare card with a reverse_holo finish (preferred),
//    matching getReverseFoilCandidates in pack-draft.ts.
//  - 'rarities': a guaranteed draw from a fixed rarity pool (e.g. the plain Rare slot).
export type PackSlotFallback =
  | { kind: 'reverse-foil'; finish: CardFinish }
  | { kind: 'rarities'; rarities: string[]; finish: CardFinish }

export interface PackSlot {
  /** Number of cards this slot contributes to the pack. */
  count: number
  /** Chance rules tried in order (cumulative bands). Empty for plain common/uncommon slots. */
  rules: PackChanceRule[]
  /** What to draw when no chance rule fires (or the rolled rule has no card). */
  fallback: PackSlotFallback
}

// The full pack, slot by slot — the single structural source of truth. Both the draw
// logic (pack-draft.ts) and the odds calculation iterate this list, so adding, removing
// or reordering a slot/rule stays consistent across both.
export const PACK_SLOTS: PackSlot[] = [
  {
    count: PACK_SLOT_COUNTS.common,
    rules: [],
    fallback: { kind: 'rarities', rarities: COMMON_RARITIES, finish: 'normal' },
  },
  {
    count: PACK_SLOT_COUNTS.uncommon,
    rules: [],
    fallback: { kind: 'rarities', rarities: UNCOMMON_RARITIES, finish: 'normal' },
  },
  {
    count: PACK_SLOT_COUNTS.firstReverseFoil,
    rules: FIRST_FOIL_SLOT_RULES,
    fallback: { kind: 'reverse-foil', finish: 'reverse_holo' },
  },
  {
    count: PACK_SLOT_COUNTS.secondReverseOrSecretFoil,
    rules: SECOND_FOIL_SLOT_RULES,
    fallback: { kind: 'reverse-foil', finish: 'reverse_holo' },
  },
  {
    count: PACK_SLOT_COUNTS.rareOrBetter,
    rules: RARE_SLOT_RULES,
    fallback: { kind: 'rarities', rarities: RARE_RARITIES, finish: 'holo' },
  },
]

const cardsMatchingRarities = (
  cards: PokemonCardSummary[],
  rarities: string[],
): PokemonCardSummary[] => {
  const normalized = rarities.map(normalizeRarity)

  return cards.filter((card) => normalized.includes(normalizeRarity(card.rarity)))
}

const countByNormalizedRarity = (cards: PokemonCardSummary[]): Map<string, number> => {
  const counts = new Map<string, number>()

  for (const card of cards) {
    const key = normalizeRarity(card.rarity)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return counts
}

// The reverse-foil candidate pool, mirroring getReverseFoilCandidates in pack-draft.ts
// (reverse_holo cards preferred, falling back to the unfiltered Common/Uncommon/Rare pool).
const getReverseFoilPool = (cards: PokemonCardSummary[]): PokemonCardSummary[] => {
  const candidates = cardsMatchingRarities(cards, REVERSE_FOIL_RARITIES)
  const foilCandidates = candidates.filter(
    (card) => card.finishes?.includes('reverse_holo') ?? false,
  )

  return foilCandidates.length > 0 ? foilCandidates : candidates
}

export interface PackRarityChance {
  rarity: string
  /** Probability (0-100) of pulling at least one card of this rarity in a single pack. */
  chancePerPack: number
}

// Probability of pulling AT LEAST ONE card of each rare-or-better rarity in a single pack,
// derived live from the set's cards by iterating PACK_SLOTS. Each chance rule's probability
// is split across the matching cards of that set, and the leftover (no rule fired) flows to
// the slot's fallback. Rarities absent from the set are omitted.
//
// Modelling notes: each rare-bearing slot is treated as one independent draw (true for the
// current pack — only Common/Uncommon slots have count > 1, and those never yield rare+),
// and a rule whose rarities are absent from the set is treated as flowing to the fallback
// (the real draw cascades to the next rule first — a negligible difference in practice).
export const getPackRarityChances = (cards: PokemonCardSummary[]): PackRarityChance[] => {
  const reverseFoilPool = getReverseFoilPool(cards)

  // Per normalized rarity: probability of NOT getting it (multiplied across slots), plus a
  // representative display label taken from the set's own card spelling.
  const missProbability = new Map<string, number>()
  const displayRarity = new Map<string, string>()

  const addSlotChance = (label: string, slotChance: number): void => {
    if (slotChance <= 0) {
      return
    }

    const normalized = normalizeRarity(label)
    const currentMiss = missProbability.get(normalized) ?? 1

    missProbability.set(normalized, currentMiss * (1 - slotChance))

    if (!displayRarity.has(normalized)) {
      displayRarity.set(normalized, label)
    }
  }

  // Spreads a probability mass uniformly across a pool of cards, by rarity.
  const distributeAcrossPool = (pool: PokemonCardSummary[], mass: number): void => {
    if (pool.length === 0 || mass <= 0) {
      return
    }

    for (const [normalized, count] of countByNormalizedRarity(pool)) {
      const sample = pool.find((card) => normalizeRarity(card.rarity) === normalized)
      addSlotChance(sample?.rarity ?? normalized, mass * (count / pool.length))
    }
  }

  for (const slot of PACK_SLOTS) {
    let firedChance = 0

    for (const rule of slot.rules) {
      const matching = cardsMatchingRarities(cards, rule.rarities)

      if (matching.length === 0) {
        continue
      }

      firedChance += rule.chance
      distributeAcrossPool(matching, rule.chance / 100)
    }

    const fallbackFraction = Math.max(0, (100 - firedChance) / 100)
    const fallbackPool =
      slot.fallback.kind === 'reverse-foil'
        ? reverseFoilPool
        : cardsMatchingRarities(cards, slot.fallback.rarities)

    distributeAcrossPool(fallbackPool, fallbackFraction)
  }

  const chances: PackRarityChance[] = []

  for (const [normalized, miss] of missProbability) {
    const label = displayRarity.get(normalized) ?? normalized

    if (!isRareOrBetter(label)) {
      continue
    }

    const chancePerPack = (1 - miss) * 100

    if (chancePerPack > 0) {
      chances.push({ rarity: label, chancePerPack })
    }
  }

  return chances.sort((first, second) => getRarityRank(first.rarity) - getRarityRank(second.rarity))
}
