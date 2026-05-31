import {
  isCardExcludedFromTrade,
  matchesTradeRequirements,
} from '@tcg-collection/shared'
import type { AuctionFilters, AuctionRequirements, CardFinish } from '@tcg-collection/shared'
import type { TradeCardFilterCandidate } from './trade-types'

export const isSupportedTradeCardFinish = (value: string): value is CardFinish => {
  return value === 'normal' || value === 'holo' || value === 'reverse_holo'
}

export const matchesAuctionRequirements = (
  card: TradeCardFilterCandidate,
  finish: CardFinish,
  requirements: AuctionRequirements,
): boolean =>
  matchesTradeRequirements(
    {
      id: card.id,
      setId: card.setId,
      rarity: card.rarity,
      type: card.category,
    },
    finish,
    requirements,
  )

export const isCardFilteredOutByAuction = (
  card: TradeCardFilterCandidate,
  finish: CardFinish,
  filters: AuctionFilters,
): boolean =>
  isCardExcludedFromTrade(
    {
      id: card.id,
      setId: card.setId,
      rarity: card.rarity,
      type: card.category,
    },
    finish,
    filters,
  )
