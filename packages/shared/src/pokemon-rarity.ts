import type { CardFinish, PokemonCardSummary } from './index'

export const pokemonRarityOrder = [
  'Common',
  'Uncommon',
  'Rare',
  'Holo Rare',
  'Holo Rare V',
  'Holo Rare VMAX',
  'Holo Rare VSTAR',
  'Double Rare',
  'Radiant Rare',
  'Illustration Rare',
  'Ultra Rare',
  'ACE SPEC Rare',
  'Full Art Trainer',
  'Special Illustration Rare',
  'Secret Rare',
  'Mega Hyper Rare',
  'Hyper Rare',
  'Galarian Gallery',
  'Galarian Gallery Ultra Rare',
  'Galarian Gallery Secret Rare',
] as const

const rarityRank: Record<string, number> = {
  Common: 10,
  Uncommon: 20,
  Rare: 30,
  'Holo Rare': 35,
  'Holo Rare V': 40,
  'Holo Rare VMAX': 45,
  'Holo Rare VSTAR': 45,
  'Double rare': 40,
  'Double Rare': 40,
  'Illustration rare': 50,
  'Illustration Rare': 50,
  'Radiant Rare': 50,
  'Ultra Rare': 60,
  'ACE SPEC Rare': 65,
  'Full Art Trainer': 65,
  'Special illustration rare': 70,
  'Special Illustration Rare': 70,
  'Secret Rare': 75,
  'Mega Hyper Rare': 80,
  'Hyper rare': 80,
  'Hyper Rare': 80,
  'Galarian Gallery': 50,
  'Galarian Gallery Ultra Rare': 70,
  'Galarian Gallery Secret Rare': 80,
}

const normalizeRarityValue = (value: string): string => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

const canonicalRarityAliases: Readonly<Record<string, string>> = {
  commune: 'common',
  'peu commune': 'uncommon',
  'rare holo': 'holo rare',
  'rare holo v': 'holo rare v',
  'rare holo vmax': 'holo rare vmax',
  'rare holo vstar': 'holo rare vstar',
  'rare illustration': 'illustration rare',
  'high tech rare': 'ace spec rare',
  'high-tech rare': 'ace spec rare',
  'high tecg rare': 'ace spec rare',
  'high-tecg rare': 'ace spec rare',
  'illustration speciale rare': 'special illustration rare',
  'rare illustration speciale': 'special illustration rare',
  'dresseur full art': 'full art trainer',
  'radieux rare': 'radiant rare',
  magnifique: 'amazing rare',
  'magnifique rare': 'secret rare',
}

export const normalizeRarity = (value: string | null | undefined): string => {
  return normalizeRarityValue(value ?? '')
}

export const canonicalizeRarity = (value: string | null | undefined): string => {
  const normalized = normalizeRarity(value)
  return canonicalRarityAliases[normalized] ?? normalized
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
  return !['common', 'uncommon'].includes(canonicalizeRarity(rarity))
}

export const getRarityWeight = (rarity: string | null | undefined): number => {
  switch (canonicalizeRarity(rarity)) {
    case 'rare':
      return 64
    case 'double rare':
      return 18
    case 'illustration rare':
      return 12
    case 'ultra rare':
      return 4
    case 'ace spec rare':
      return 3
    case 'special illustration rare':
      return 1.5
    case 'mega hyper rare':
    case 'hyper rare':
      return 0.5
    default:
      return 1
  }
}

export const getPackRarityChance = (rarity: string, cards: PokemonCardSummary[]): number => {
  return getSetPackRarityChance(undefined, rarity, cards)
}

export const getSetPackRarityChance = (
  setId: string | undefined,
  rarity: string,
  cards: PokemonCardSummary[],
): number => {
  const canonicalRarity = canonicalizeRarity(rarity)

  if (canonicalRarity === 'common') {
    return 40
  }

  if (canonicalRarity === 'uncommon') {
    return 30
  }

  const configuredChance = setId
    ? Object.entries(SET_RARITY_CHANCES[setId] ?? {}).find(
        ([candidate]) => canonicalizeRarity(candidate) === canonicalRarity,
      )?.[1]
    : undefined

  if (configuredChance !== undefined) {
    return configuredChance
  }

  switch (canonicalRarity) {
    case 'rare':
      return 100 - 13.76 - 6.57
    case 'double rare':
      return 13.76
    case 'ultra rare':
      return 6.57
    case 'ace spec rare':
      return 4.76
    case 'illustration rare':
      return 7.67
    case 'special illustration rare':
      return 3.15
    case 'mega hyper rare':
    case 'hyper rare':
      return 1.85
    default:
      return getEstimatedRarityChanceFromCards(canonicalRarity, cards)
  }
}

const SET_RARITY_CHANCES: Record<string, Partial<Record<string, number>>> = {
  me04: {
    Rare: 71.41,
    'Double Rare': 20.3,
    'Illustration Rare': 10.66,
    'Ultra Rare': 8.29,
    'Special Illustration Rare': 1.21,
    'Mega Hyper Rare': 0.1,
  },
  me05: {
    Rare: 70.68,
    'Double Rare': 21.02,
    'Illustration Rare': 11.01,
    'Ultra Rare': 8.3,
    'Special Illustration Rare': 1.25,
    'Mega Hyper Rare': 0.09,
  },
  'swsh12.5': {
    Rare: 60.97,
    'Holo Rare': 17.78,
    'Holo Rare V': 12.35,
    'Holo Rare VMAX': 2.04,
    'Holo Rare VSTAR': 3.26,
    'Radiant Rare': 4.55,
    'Ultra Rare': 2.85,
    'Secret Rare': 0.75,
    'Galarian Gallery': 22.4,
    'Galarian Gallery Ultra Rare': 12,
    'Galarian Gallery Secret Rare': 0.8,
  },
}

const getEstimatedRarityChanceFromCards = (rarity: string, cards: PokemonCardSummary[]): number => {
  const rareCards = cards.filter((card) => isRareOrBetter(card.rarity))
  const totalWeight = rareCards.reduce((total, card) => total + getRarityWeight(card.rarity), 0)

  const rarityWeight = rareCards
    .filter((card) => canonicalizeRarity(card.rarity) === rarity)
    .reduce((total, card) => total + getRarityWeight(card.rarity), 0)

  return totalWeight > 0 ? (rarityWeight / totalWeight) * 30 : 0
}
