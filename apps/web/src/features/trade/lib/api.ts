import type {
  CreateAuctionRequest,
  CreateOfferRequest,
  TradeAuctionResponse,
  TradeOfferResponse,
} from '@tcg-collection/shared'
import { m } from '@/paraglide/messages'

import { api } from '@/lib/api-client'
import type { EdenError } from '@/lib/queries/eden-query-option'
import { readTradeError } from '@/lib/queries/trade'

export async function createTradeAuction(
  input: CreateAuctionRequest,
): Promise<TradeAuctionResponse> {
  const { data, error, response, status } = await api.trade.auctions.post(input)

  if (error || !data) {
    throw new Error(toRequiredEdenError(error, response, status, m.trade_create_auction_error()))
  }

  return data
}

export async function createTradeOffer(
  auctionId: string,
  input: CreateOfferRequest,
): Promise<TradeOfferResponse> {
  const { data, error, response, status } = await api.trade
    .auctions({ auctionId })
    .offers.post(input)

  if (error || !data) {
    throw new Error(toRequiredEdenError(error, response, status, m.trade_create_offer_error()))
  }

  return data
}

export async function cancelTradeAuction(auctionId: string): Promise<void> {
  const { error, response, status } = await api.trade.auctions({ auctionId }).delete()

  if (error) {
    throw new Error(toRequiredEdenError(error, response, status, m.trade_cancel_auction_error()))
  }
}

export async function cancelTradeOffer(offerId: string): Promise<void> {
  const { error, response, status } = await api.trade.offers({ offerId }).delete()

  if (error) {
    throw new Error(toRequiredEdenError(error, response, status, m.trade_cancel_offer_error()))
  }
}

export async function markTradeNotificationViewed(notificationId: string): Promise<void> {
  const { error, response, status } = await api.trade
    .notifications({ notificationId })
    .viewed.post()

  if (error) {
    throw new Error(
      toRequiredEdenError(error, response, status, m.trade_mark_notification_viewed_error()),
    )
  }
}

export async function acceptTradeOffer(auctionId: string, offerId: string): Promise<void> {
  const { error, response, status } = await api.trade
    .auctions({ auctionId })
    .offer({ offerId })
    .accept.post()

  if (error) {
    throw new Error(toRequiredEdenError(error, response, status, m.trade_accept_offer_error()))
  }
}

const toRequiredEdenError = (
  error: EdenError | null,
  response: Response,
  status: number,
  fallbackMessage: string,
): string => {
  if (!error) {
    return `${fallbackMessage} (${status} ${response.statusText})`
  }

  return readTradeError(error, response, status, fallbackMessage)
}
