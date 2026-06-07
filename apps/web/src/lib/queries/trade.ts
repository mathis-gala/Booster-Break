import { api } from '@/lib/api-client'
import { tradeQueryKeys } from '@/features/trade/lib/query-keys'
import { edenQueryOption, type EdenError } from './eden-query-option'
import { m } from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'

export const useTradeAuctionsQueryOption = () => {
  const locale = getLocale()

  return edenQueryOption({
    edenQuery: api.trade.auctions.get,
    queryKey: tradeQueryKeys.auctions(locale),
    mapData: (data) => data,
    toError: (error, response, status) =>
      new Error(readTradeError(error, response, status, m.trade_fetch_auctions_error())),
  })
}

export const useTradeAuctionQueryOption = (auctionId: string | undefined, enabled = true) => {
  const locale = getLocale()
  const hasAuctionId = Boolean(auctionId)
  const effectiveAuctionId = auctionId ?? '__no_selection__'

  return edenQueryOption({
    edenQuery: api.trade.auctions({ auctionId: effectiveAuctionId }).get,
    queryKey: tradeQueryKeys.auction(effectiveAuctionId, locale),
    mapData: (data) => data,
    enabled: enabled && hasAuctionId,
    retry: false,
    toError: (error, response, status) =>
      new Error(readTradeError(error, response, status, m.trade_fetch_auction_error())),
  })
}

export const useTradeNotificationsQueryOption = (enabled = true) => {
  const locale = getLocale()

  return edenQueryOption({
    edenQuery: api.trade.notifications.get,
    queryKey: tradeQueryKeys.notifications(locale),
    mapData: (data) => data,
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 20_000,
    toError: (error, response, status) =>
      new Error(readTradeError(error, response, status, m.trade_fetch_notifications_error())),
  })
}

export const readTradeError = (
  error: EdenError,
  response: Response,
  status: number,
  fallbackMessage: string,
): string => {
  if (error.value.error === 'duplicate_offer') {
    return m.trade_duplicate_offer_error()
  }

  if (error.value.message || error.value.error) {
    return error.value.message ?? error.value.error ?? fallbackMessage
  }

  return `${fallbackMessage} (${status} ${response.statusText})`
}
