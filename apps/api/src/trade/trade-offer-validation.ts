import { normalizeRarity } from '@tcg-collection/shared'
import type { AuctionFilters, AuctionRequirements, CardFinish } from '@tcg-collection/shared'
import type { TradeCardFilterCandidate } from './trade-types'

export const isSupportedTradeCardFinish = (value: string): value is CardFinish => {
  return value === 'normal' || value === 'holo' || value === 'reverse_holo'
}

export const matchesAuctionRequirements = (
  card: TradeCardFilterCandidate,
  finish: CardFinish,
  requirements: AuctionRequirements,
): boolean => {
  if (requirements.cardIds?.length && !requirements.cardIds.includes(card.id)) {
    return false
  }

  if (requirements.setIds?.length && !requirements.setIds.includes(card.setId)) {
    return false
  }

  if (
    requirements.rarities?.length &&
    !requirements.rarities.some((rarity) => normalizeRarity(rarity) === normalizeRarity(card.rarity ?? ''))
  ) {
    return false
  }

  if (requirements.types?.length && !requirements.types.includes(card.category ?? '')) {
    return false
  }

  if (requirements.finishes?.length && !requirements.finishes.includes(finish)) {
    return false
  }

  return true
}

export const isCardFilteredOutByAuction = (
  card: TradeCardFilterCandidate,
  finish: CardFinish,
  filters: AuctionFilters,
): boolean => {
  if (filters.excludedCardIds?.length && filters.excludedCardIds.includes(card.id)) {
    return true
  }

  if (filters.excludedSetIds?.length && filters.excludedSetIds.includes(card.setId)) {
    return true
  }

  if (
    filters.excludedRarities?.length &&
    filters.excludedRarities.some(
      (rarity) => normalizeRarity(rarity) === normalizeRarity(card.rarity ?? ''),
    )
  ) {
    return true
  }

  if (filters.excludedTypes?.length && filters.excludedTypes.includes(card.category ?? '')) {
    return true
  }

  if (filters.excludedFinishes?.length && filters.excludedFinishes.includes(finish)) {
    return true
  }

  return false
}
