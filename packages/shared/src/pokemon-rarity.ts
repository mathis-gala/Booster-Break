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

export const UNKNOWN_RARITY_RANK = 999

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
  return rarity ? (rarityRank[rarity] ?? UNKNOWN_RARITY_RANK) : UNKNOWN_RARITY_RANK
}

export const getRaritiesAtOrAboveRank = (minRank: number): string[] => {
  return Object.entries(rarityRank)
    .filter(([, rank]) => rank >= minRank)
    .map(([rarity]) => rarity)
}

export const getFinishRank = (finish: string | null | undefined): number => {
  return finishRank[finish as CardFinish] ?? 999
}

export const isRareOrBetter = (rarity: string | null | undefined): boolean => {
  return !['Common', 'Uncommon'].includes(rarity ?? '')
}

export const getRarityWeight = (rarity: string | null | undefined): number => {
  switch (rarity) {
    case 'Rare':
      return 64
    case 'Double rare':
    case 'Double Rare':
      return 18
    case 'Illustration rare':
    case 'Illustration Rare':
      return 12
    case 'Ultra Rare':
      return 4
    case 'ACE SPEC Rare':
      return 3
    case 'Special illustration rare':
    case 'Special Illustration Rare':
      return 1.5
    case 'Mega Hyper Rare':
    case 'Hyper rare':
    case 'Hyper Rare':
      return 0.5
    default:
      return 1
  }
}

export const getPackRarityChance = (rarity: string, cards: PokemonCardSummary[]): number => {
  if (rarity === 'Common') {
    return 40
  }

  if (rarity === 'Uncommon') {
    return 30
  }

  switch (rarity) {
    case 'Rare':
      return 100 - 13.76 - 6.57
    case 'Double rare':
    case 'Double Rare':
      return 13.76
    case 'Ultra Rare':
      return 6.57
    case 'ACE SPEC Rare':
      return 4.76
    case 'Illustration rare':
    case 'Illustration Rare':
      return 7.67
    case 'Special illustration rare':
    case 'Special Illustration Rare':
      return 3.15
    case 'Mega Hyper Rare':
    case 'Hyper rare':
    case 'Hyper Rare':
      return 1.85
    default:
      return getEstimatedRarityChanceFromCards(rarity, cards)
  }
}

const getEstimatedRarityChanceFromCards = (rarity: string, cards: PokemonCardSummary[]): number => {
  const rareCards = cards.filter((card) => isRareOrBetter(card.rarity))
  const totalWeight = rareCards.reduce((total, card) => total + getRarityWeight(card.rarity), 0)

  const rarityWeight = rareCards
    .filter((card) => (card.rarity ?? 'Other') === rarity)
    .reduce((total, card) => total + getRarityWeight(card.rarity), 0)

  return totalWeight > 0 ? (rarityWeight / totalWeight) * 30 : 0
}
