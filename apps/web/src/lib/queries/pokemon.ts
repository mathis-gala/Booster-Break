import { keepPreviousData } from '@tanstack/react-query'
import type {
  CollectionSort,
  CollectionSource,
  UserCollectionResponse,
} from '@tcg-collection/shared'

import { api } from '@/lib/api-client'
import { pokemonQueryKeys } from '@/features/dashboard/lib/query-keys'
import { edenQueryOption } from './eden-query-option'
import { m } from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'

export interface CollectionQueryParams {
  page: number
  pageSize: number
  sort: CollectionSort
  source?: CollectionSource
  setId?: string
  enabled?: boolean
  keepPreviousData?: boolean
}

export interface CollectionAllQueryParams {
  sort: CollectionSort
  source?: CollectionSource
  setId?: string
  enabled?: boolean
}

const COLLECTION_PAGE_SIZE = 60

export const usePokemonSetsQueryOption = () => {
  const locale = getLocale()

  return edenQueryOption({
    edenQuery: api.pokemon.sets.get,
    queryKey: pokemonQueryKeys.sets(locale),
    mapData: (data) => data.sets,
    toError: () => new Error(m.api_unable_load_sets()),
  })
}

export const useSandboxPokemonSetsQueryOption = () => {
  const locale = getLocale()

  return edenQueryOption({
    edenQuery: api.pokemon.packs.sandbox.sets.get,
    queryKey: pokemonQueryKeys.sandboxSets(locale),
    mapData: (data) => data.sets,
    toError: () => new Error(m.api_unable_load_sandbox_sets()),
  })
}

export const usePokemonCollectionQueryOption = (
  params: CollectionQueryParams,
  options: { enabled?: boolean; keepPreviousData?: boolean } = {},
) => {
  const locale = getLocale()

  return edenQueryOption({
    edenQuery: api.pokemon.collection.get,
    edenOptions: {
      query: {
        page: params.page,
        pageSize: params.pageSize,
        sort: params.sort,
        source: params.source,
        setId: params.setId,
      },
    },
    queryKey: pokemonQueryKeys.collection.page({ ...params, locale }),
    mapData: (data) => data,
    enabled: options.enabled ?? true,
    placeholderData: options.keepPreviousData ? keepPreviousData : undefined,
    mapErrorData: (error) => (error.status === 401 ? emptyCollection(params) : undefined),
    toError: () => new Error(m.api_unable_load_collection()),
  })
}

export const usePokemonCollectionAllQueryOption = (
  params: CollectionAllQueryParams,
  options: { enabled?: boolean } = {},
) => {
  const locale = getLocale()

  return edenQueryOption({
    edenQuery: api.pokemon.collection.get,
    edenOptions: {
      query: {
        page: 1,
        pageSize: COLLECTION_PAGE_SIZE,
        sort: params.sort,
        source: params.source,
        setId: params.setId,
      },
    },
    queryKey: pokemonQueryKeys.collection.allCards(
      locale,
      params.sort,
      params.source,
      params.setId,
    ),
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
    mapErrorData: (error) =>
      error.status === 401
        ? emptyCollection({
            ...params,
            page: 1,
            pageSize: COLLECTION_PAGE_SIZE,
          })
        : undefined,
    mapData: async (firstPage) => {
      if (firstPage.pagination.pageCount <= 1) {
        return firstPage
      }

      const remainingPages = Array.from(
        { length: firstPage.pagination.pageCount - 1 },
        (_, index) =>
          loadUserCollectionPage({
            ...params,
            page: index + 2,
            pageSize: COLLECTION_PAGE_SIZE,
          }),
      )

      const extraPages = await Promise.all(remainingPages)

      return {
        ...firstPage,
        cards: [...firstPage.cards, ...extraPages.flatMap((page) => page.cards)],
      }
    },
    toError: () => new Error(m.api_unable_load_collection()),
  })
}

export const usePokemonCollectionCountQueryOption = () =>
  usePokemonCollectionQueryOption({
    page: 1,
    pageSize: 1,
    sort: 'recent',
  })

export const useOwnedCardIdsQueryOption = (enabled = true) =>
  edenQueryOption({
    edenQuery: api.pokemon.collection['owned-ids'].get,
    queryKey: pokemonQueryKeys.collection.ownedIds(),
    enabled,
    mapData: (data) => data.cardIds,
    mapErrorData: (error) => (error.status === 401 ? [] : undefined),
    toError: () => new Error(m.api_unable_load_collection()),
  })

export const usePokemonLeaderboardQueryOption = () =>
  edenQueryOption({
    edenQuery: api.pokemon.leaderboard.get,
    queryKey: pokemonQueryKeys.leaderboard(),
    mapData: (data) => data,
    toError: () => new Error(m.api_unable_load_leaderboard()),
  })

export const usePokemonPreviewCardsQueryOption = (setId: string | undefined) => {
  const locale = getLocale()

  return edenQueryOption({
    edenQuery: api.pokemon.cards.get,
    edenOptions: { query: { setId: setId ?? '' } },
    queryKey: pokemonQueryKeys.cards(setId, locale),
    enabled: Boolean(setId),
    mapData: (data) => data.cards,
    toError: () => new Error(m.api_unable_load_cards()),
  })
}

export const useSandboxPokemonPreviewCardsQueryOption = (setId: string | undefined) => {
  const locale = getLocale()

  return edenQueryOption({
    edenQuery: api.pokemon.packs.sandbox.cards.get,
    edenOptions: { query: { setId: setId ?? '' } },
    queryKey: pokemonQueryKeys.sandboxCards(setId, locale),
    enabled: Boolean(setId),
    mapData: (data) => data.cards,
    toError: () => new Error(m.api_unable_load_cards()),
  })
}

export const usePackOpenStatusQueryOption = () =>
  edenQueryOption({
    edenQuery: api.pokemon.packs.status.get,
    queryKey: pokemonQueryKeys.packStatus(),
    mapData: (data) => data,
    refetchInterval: false,
    toError: () => new Error(m.api_unable_load_pack_status()),
  })

const loadUserCollectionPage = async (
  params: CollectionQueryParams,
): Promise<UserCollectionResponse> => {
  const result = await api.pokemon.collection.get({
    query: {
      page: params.page,
      pageSize: params.pageSize,
      sort: params.sort,
      source: params.source,
      setId: params.setId,
    },
  })

  if (result.error) {
    if (result.error.status === 401) {
      return emptyCollection(params)
    }

    throw new Error(m.api_unable_load_collection())
  }

  return result.data
}

const emptyCollection = (params: CollectionQueryParams): UserCollectionResponse => ({
  cards: [],
  pagination: {
    page: params.page,
    pageSize: params.pageSize,
    total: 0,
    totalCards: 0,
    pageCount: 1,
  },
  sort: params.sort,
  sets: [],
})
