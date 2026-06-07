import { mutationOptions, type QueryClient } from '@tanstack/react-query'
import type {
  CreateAuctionRequest,
  CreateOfferRequest,
  TradeAuctionListResponse,
  TradeAuctionResponse,
  TradeOfferResponse,
} from '@tcg-collection/shared'

import { pokemonQueryKeys } from '@/features/dashboard/lib/query-keys'
import {
  acceptTradeOffer,
  cancelTradeAuction,
  cancelTradeOffer,
  createTradeAuction,
  createTradeOffer,
  markTradeNotificationViewed,
} from '@/features/trade/lib/api'
import { tradeQueryKeys } from '@/features/trade/lib/query-keys'
import { getLocale } from '@/paraglide/runtime'

const refreshTradeQueries = async (queryClient: QueryClient): Promise<void> => {
  await queryClient.invalidateQueries({ queryKey: tradeQueryKeys.all })
}

export const useCreateTradeAuctionMutationOption = (
  queryClient: QueryClient,
  options?: {
    onSuccess?: (auction: TradeAuctionResponse) => void
    onError?: (error: Error) => void
  },
) => {
  const locale = getLocale()

  return mutationOptions({
    mutationFn: (input: CreateAuctionRequest) => createTradeAuction(input),
    meta: {
      suppressToast: Boolean(options?.onError),
    },
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

export const useCreateTradeOfferMutationOption = (
  queryClient: QueryClient,
  options?: {
    onSuccess?: (offer: TradeOfferResponse) => void
    onError?: (error: Error) => void
  },
) => {
  return mutationOptions({
    mutationFn: (input: { auctionId: string; payload: CreateOfferRequest }) =>
      createTradeOffer(input.auctionId, input.payload),
    meta: {
      suppressToast: Boolean(options?.onError),
    },
    onSuccess: async (offer) => {
      await refreshTradeQueries(queryClient)
      options?.onSuccess?.(offer)
    },
    onError: options?.onError,
  })
}

export const useCancelTradeOfferMutationOption = (
  queryClient: QueryClient,
  options?: { onSuccess?: () => void },
) =>
  mutationOptions({
    mutationFn: (offerId: string) => cancelTradeOffer(offerId),
    onSuccess: async () => {
      await refreshTradeQueries(queryClient)
      options?.onSuccess?.()
    },
  })

export const useCancelTradeAuctionMutationOption = (
  queryClient: QueryClient,
  options?: { onSuccess?: () => void },
) =>
  mutationOptions({
    mutationFn: (auctionId: string) => cancelTradeAuction(auctionId),
    onSuccess: async () => {
      await refreshTradeQueries(queryClient)
      options?.onSuccess?.()
    },
  })

export const useAcceptTradeOfferMutationOption = (
  queryClient: QueryClient,
  options?: {
    onSuccess?: () => void
    onError?: (error: Error) => void
  },
) =>
  mutationOptions({
    mutationFn: (payload: { auctionId: string; offerId: string }) =>
      acceptTradeOffer(payload.auctionId, payload.offerId),
    meta: {
      suppressToast: Boolean(options?.onError),
    },
    onSuccess: async () => {
      await refreshTradeQueries(queryClient)
      await queryClient.invalidateQueries({ queryKey: pokemonQueryKeys.collection.all })
      options?.onSuccess?.()
    },
    onError: options?.onError,
  })

export const useTradeNotificationViewedMutationOption = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: (notificationId: string) => markTradeNotificationViewed(notificationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tradeQueryKeys.notificationsAll })
    },
  })
