import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CollectionSort, OpenPackResponse, SupportedLocale } from '@tcg-collection/shared'

import {
  fetchPackOpenStatus,
  fetchPokemonCards,
  fetchPokemonSets,
  fetchUserCollection,
  openPokemonPack,
} from '../lib/api'
import { preloadPackImages } from '../lib/preload-pack-images'
import { pokemonQueryKeys } from '../lib/query-keys'

interface CollectionQueryParams {
  page: number
  pageSize: number
  sort: CollectionSort
  locale: SupportedLocale
}

interface OpenPackMutationOptions {
  locale: SupportedLocale
  onPreparingChange: (isPreparing: boolean) => void
  onPrepared: (pack: OpenPackResponse) => void
}

export function usePokemonSetsQuery(locale: SupportedLocale) {
  return useQuery({
    queryKey: pokemonQueryKeys.sets(locale),
    queryFn: () => fetchPokemonSets(locale),
  })
}

export function usePokemonCollectionQuery(params: CollectionQueryParams) {
  return useQuery({
    queryKey: pokemonQueryKeys.collection.page(params),
    queryFn: () => fetchUserCollection(params),
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
  return useQuery({
    queryKey: pokemonQueryKeys.packStatus(),
    queryFn: fetchPackOpenStatus,
    refetchInterval: (query) => {
      const status = query.state.data

      return status?.authenticated && !status.canOpen ? 1_000 : false
    },
  })
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
      onPrepared(pack)
      onPreparingChange(false)
      queryClient.invalidateQueries({ queryKey: pokemonQueryKeys.collection.all })
      queryClient.invalidateQueries({ queryKey: pokemonQueryKeys.packStatus() })
    },
    onError: () => {
      onPreparingChange(false)
    },
  })
}
