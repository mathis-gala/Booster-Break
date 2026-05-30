import { useSyncExternalStore } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CollectionSort,
  PackOpenStatusResponse,
  SupportedLocale,
} from '@tcg-collection/shared'

import {
  fetchPackOpenStatus,
  fetchPokemonCards,
  fetchPokemonSets,
  fetchUserCollection,
  openPokemonPack,
} from '../lib/api'
import { preloadPackImages } from '../lib/preload-pack-images'
import { packOpenClock } from '../lib/pack-open-clock'
import { pokemonQueryKeys } from '../lib/query-keys'

interface CollectionQueryParams {
  page: number
  pageSize: number
  sort: CollectionSort
  locale: SupportedLocale
  enabled?: boolean
  keepPreviousData?: boolean
}

interface CollectionAllQueryParams {
  sort: CollectionSort
  locale: SupportedLocale
  enabled?: boolean
}

const COLLECTION_PAGE_SIZE = 60

interface OpenPackMutationOptions {
  locale: SupportedLocale
  onPreparingChange: (isPreparing: boolean) => void
  onPrepared: () => void
}

export function usePokemonSetsQuery(locale: SupportedLocale) {
  return useQuery({
    queryKey: pokemonQueryKeys.sets(locale),
    queryFn: () => fetchPokemonSets(locale),
  })
}

export function usePokemonCollectionQuery(params: CollectionQueryParams) {
  const {
    enabled = true,
    keepPreviousData: shouldKeepPreviousData = false,
    ...queryParams
  } = params

  return useQuery({
    queryKey: pokemonQueryKeys.collection.page(queryParams),
    queryFn: () => fetchUserCollection(queryParams),
    enabled,
    placeholderData: shouldKeepPreviousData ? keepPreviousData : undefined,
  })
}

export function usePokemonCollectionAllQuery(params: CollectionAllQueryParams) {
  const { sort, locale, enabled = true } = params

  return useQuery({
    queryKey: pokemonQueryKeys.collection.allCards(locale, sort),
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const firstPage = await fetchUserCollection({
        page: 1,
        pageSize: COLLECTION_PAGE_SIZE,
        sort,
        locale,
      })

      if (firstPage.pagination.pageCount <= 1) {
        return firstPage
      }

      const remainingPages = Array.from(
        { length: firstPage.pagination.pageCount - 1 },
        (_, index) => {
          return fetchUserCollection({
            page: index + 2,
            pageSize: COLLECTION_PAGE_SIZE,
            sort,
            locale,
          })
        },
      )

      const extraPages = await Promise.all(remainingPages)

      return {
        ...firstPage,
        cards: [...firstPage.cards, ...extraPages.flatMap((page) => page.cards)],
      }
    },
  })
}

export function usePokemonCollectionCountQuery(locale: SupportedLocale) {
  return useQuery({
    queryKey: pokemonQueryKeys.collection.packCount(locale),
    queryFn: () => fetchUserCollection({ page: 1, pageSize: 1, sort: 'recent', locale }),
  })
}

export function usePokemonPreviewCardsQuery(setId: string | undefined, locale: SupportedLocale) {
  return useQuery({
    queryKey: pokemonQueryKeys.cards(setId, locale),
    queryFn: () => fetchPokemonCards(setId ?? '', locale),
    enabled: Boolean(setId),
  })
}

export function usePackOpenStatusQuery() {
  const query = useQuery({
    queryKey: pokemonQueryKeys.packStatus(),
    queryFn: fetchPackOpenStatus,
    refetchInterval: false,
  })

  return {
    ...query,
    data: usePackOpenStatusClock(query.data),
  }
}

export function useOpenPokemonPackMutation({
  locale,
  onPreparingChange,
  onPrepared,
}: OpenPackMutationOptions) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (setId?: string) => openPokemonPack(setId, locale),
    onSuccess: async (pack) => {
      onPreparingChange(true)
      await preloadPackImages(pack)
      onPrepared()
      onPreparingChange(false)
      queryClient.invalidateQueries({ queryKey: pokemonQueryKeys.collection.all })
      queryClient.invalidateQueries({ queryKey: pokemonQueryKeys.packStatus() })
    },
    onError: () => {
      onPreparingChange(false)
    },
  })
}

const usePackOpenStatusClock = (
  status: PackOpenStatusResponse | undefined,
): PackOpenStatusResponse | undefined => {
  const isCooldownActive =
    status?.authenticated === true && !status.canOpen && Boolean(status.nextOpenAt)

  const now = usePackOpenClock(isCooldownActive)

  if (!isCooldownActive || !status?.nextOpenAt) {
    return status
  }

  const cooldownSeconds = getRemainingCooldownSeconds(status.nextOpenAt, now)

  if (cooldownSeconds <= 0) {
    return {
      ...status,
      canOpen: true,
      cooldownSeconds: 0,
    }
  }

  return {
    ...status,
    canOpen: false,
    cooldownSeconds,
  }
}

const usePackOpenClock = (enabled: boolean) => {
  return useSyncExternalStore(
    enabled ? packOpenClock.subscribe : noOpSubscribe,
    packOpenClock.getSnapshot,
    packOpenClock.getSnapshot,
  )
}

const noOpSubscribe = () => () => {}

const getRemainingCooldownSeconds = (nextOpenAt: string, now = Date.now()): number => {
  return Math.max(0, Math.ceil((new Date(nextOpenAt).getTime() - now) / 1000))
}
