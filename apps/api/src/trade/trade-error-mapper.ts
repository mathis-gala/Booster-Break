import type { TradeServiceError } from './trade-types'

export const toTradeServiceError = (error: string): TradeServiceError => {
  switch (error) {
    case 'max_auctions_reached':
      return {
        error: 'max_auctions_reached',
        message: 'You already reached the maximum number of active auctions.',
      }
    case 'card_in_auction':
      return {
        error: 'card_in_auction',
        message: 'This card is already locked in another active auction.',
      }
    case 'max_offers_reached':
      return {
        error: 'max_offers_reached',
        message: 'You reached the maximum number of offers for this auction.',
      }
    case 'duplicate_offer':
      return {
        error: 'duplicate_offer',
        message: 'You already sent this exact offer.',
      }
    case 'auction_not_found':
      return {
        error: 'auction_not_found',
        message: 'The selected auction does not exist.',
      }
    case 'auction_expired':
      return {
        error: 'auction_expired',
        message: 'The selected auction has expired.',
      }
    case 'auction_closed':
      return {
        error: 'auction_closed',
        message: 'The selected auction is closed.',
      }
    case 'auction_not_owned':
      return {
        error: 'auction_not_owned',
        message: 'Only the auction creator can accept an offer.',
      }
    case 'cannot_trade_self':
      return {
        error: 'cannot_trade_self',
        message: 'You cannot offer cards on your own auction.',
      }
    case 'offer_not_found':
      return {
        error: 'offer_not_found',
        message: 'This offer does not exist anymore.',
      }
    case 'offer_not_owned':
      return {
        error: 'offer_not_owned',
        message: 'You cannot cancel this offer.',
      }
    case 'offer_invalid':
      return {
        error: 'offer_invalid',
        message: 'This offer cannot be accepted right now.',
      }
    case 'trade_unavailable':
      return {
        error: 'trade_unavailable',
        message: 'This trade is temporarily unavailable. Please retry in a moment.',
      }
    case 'card_not_owned':
      return {
        error: 'card_not_owned',
        message: 'A player does not have enough cards for this trade anymore.',
      }
    case 'notification_not_found':
      return {
        error: 'notification_not_found',
        message: 'Notification not found.',
      }
    case 'notification_not_owned':
      return {
        error: 'notification_not_owned',
        message: 'This notification does not belong to your account.',
      }
    default:
      return {
        error: 'trade_unavailable',
        message: 'Trade operation is not available right now.',
      }
  }
}
