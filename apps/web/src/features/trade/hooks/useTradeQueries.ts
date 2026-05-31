import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  SupportedLocale,
  CreateAuctionRequest,
  CreateOfferRequest,
  TradeAuctionListResponse,
  TradeAuctionResponse,
  TradeOfferResponse,
} from '@tcg-collection/shared'
import { DEFAULT_LOCALE } from '@tcg-collection/shared'

import { tradeQueryKeys } from '../lib/query-keys'
import { pokemonQueryKeys } from '@/features/dashboard/lib/query-keys'
import {
  fetchTradeNotifications,
  acceptTradeOffer,
  cancelTradeAuction,
  cancelTradeOffer,
  createTradeAuction,
  createTradeOffer,
  markTradeNotificationViewed,
  fetchTradeAuction,
  fetchTradeAuctions,
} from '../lib/api'

const refreshTradeQueries = async (
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<void> => {
  await queryClient.invalidateQueries({ queryKey: tradeQueryKeys.all })
}

const invalidatedNotificationSignatures = new Map<SupportedLocale, string>()

const refreshTradeMarketQueries = async (
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<void> => {
  await queryClient.invalidateQueries({
    predicate: (query) => {
      const [domain, resource] = query.queryKey

      return domain === 'trade' && resource !== 'notifications' && resource !== 'notification'
    },
  })
}

export function useTradeAuctionsQuery(locale: SupportedLocale = DEFAULT_LOCALE) {
  return useQuery({
    queryKey: tradeQueryKeys.auctions(locale),
    queryFn: () => fetchTradeAuctions(locale),
  })
}

export function useTradeAuctionQuery(
  auctionId: string | undefined,
  locale: SupportedLocale = DEFAULT_LOCALE,
  enabled = true,
) {
  const hasAuctionId = Boolean(auctionId)
  const effectiveAuctionId = auctionId ?? '__no_selection__'

  return useQuery({
    queryKey: tradeQueryKeys.auction(effectiveAuctionId, locale),
    queryFn: () => fetchTradeAuction(effectiveAuctionId, locale),
    enabled: enabled && hasAuctionId,
    retry: false,
  })
}

export function useCreateTradeAuctionMutation(
  locale: SupportedLocale = DEFAULT_LOCALE,
  options?: {
    onSuccess?: (auction: TradeAuctionResponse) => void
    onError?: (error: Error) => void
  },
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateAuctionRequest) => createTradeAuction(input, locale),
    onSuccess: async (auction) => {
      queryClient.setQueryData<TradeAuctionListResponse>(
        tradeQueryKeys.auctions(locale),
        (previous) => {
          if (!previous) {
            return {
              auctions: [auction],
            }
          }

          if (previous.auctions.some((entry) => entry.id === auction.id)) {
            return previous
          }

          return {
            ...previous,
            auctions: [auction, ...previous.auctions],
          }
        },
      )
      await queryClient.setQueryData(tradeQueryKeys.auction(auction.id, locale), auction)
      options?.onSuccess?.(auction)
    },
    onError: options?.onError,
  })
}

export function useCreateTradeOfferMutation(options?: {
  locale?: SupportedLocale
  onSuccess?: (offer: TradeOfferResponse) => void
  onError?: (error: Error) => void
}) {
  const queryClient = useQueryClient()
  const targetLocale = options?.locale ?? DEFAULT_LOCALE

  return useMutation({
    mutationFn: (input: { auctionId: string; payload: CreateOfferRequest }) =>
      createTradeOffer(input.auctionId, input.payload, targetLocale),
    onSuccess: async (offer) => {
      await refreshTradeQueries(queryClient)
      options?.onSuccess?.(offer)
    },
    onError: options?.onError,
  })
}

export function useCancelTradeOfferMutation(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (offerId: string) => cancelTradeOffer(offerId),
    onSuccess: async () => {
      await refreshTradeQueries(queryClient)
      options?.onSuccess?.()
    },
  })
}

export function useCancelTradeAuctionMutation(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (auctionId: string) => cancelTradeAuction(auctionId),
    onSuccess: async () => {
      await refreshTradeQueries(queryClient)
      options?.onSuccess?.()
    },
  })
}

export function useAcceptTradeOfferMutation(options?: {
  onSuccess?: () => void
  onError?: (error: Error) => void
}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { auctionId: string; offerId: string }) =>
      acceptTradeOffer(payload.auctionId, payload.offerId),
    onSuccess: async () => {
      await refreshTradeQueries(queryClient)
      await queryClient.invalidateQueries({ queryKey: pokemonQueryKeys.collection.all })
      options?.onSuccess?.()
    },
    onError: options?.onError,
  })
}

export function useTradeNotificationsQuery(locale: SupportedLocale = DEFAULT_LOCALE, enabled = true) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: tradeQueryKeys.notifications(locale),
    queryFn: async () => {
      const notifications = await fetchTradeNotifications(locale)
      const signature = notifications.notifications.map((notification) => notification.id).join('|')

      if (
        signature.length > 0 &&
        invalidatedNotificationSignatures.get(locale) !== signature
      ) {
        invalidatedNotificationSignatures.set(locale, signature)
        await refreshTradeMarketQueries(queryClient)
      }

      return notifications
    },
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 20_000,
  })
}

export function useTradeNotificationViewedMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId: string) => markTradeNotificationViewed(notificationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tradeQueryKeys.notificationsAll })
    },
  })
}
