import { mutationOptions, type QueryClient } from '@tanstack/react-query'
import type { RecycleCardsRequest, RecycleCardsResponse } from '@tcg-collection/shared'

import { openPokemonPack, openPokemonPackSandbox } from '@/features/dashboard/lib/api'
import { preloadPackImages } from '@/features/dashboard/lib/preload-pack-images'
import { pokemonQueryKeys } from '@/features/dashboard/lib/query-keys'
import { recycleCards } from '@/features/recycle/lib/api'

interface OpenPackMutationOptionParams {
  onPreparingChange: (isPreparing: boolean) => void
  onPrepared: () => void
}

export const useOpenPokemonPackMutationOption = (
  queryClient: QueryClient,
  { onPreparingChange, onPrepared }: OpenPackMutationOptionParams,
) =>
  mutationOptions({
    mutationFn: (setId?: string) => openPokemonPack(setId),
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

interface RecycleCardsMutationOptionParams {
  onSuccess: (result: RecycleCardsResponse) => void
  onError: (error: Error) => void
}

export const useRecyclePokemonCardsMutationOption = (
  queryClient: QueryClient,
  { onSuccess, onError }: RecycleCardsMutationOptionParams,
) =>
  mutationOptions({
    mutationFn: (input: RecycleCardsRequest) => recycleCards(input),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: pokemonQueryKeys.collection.all })
      onSuccess(result)
    },
    onError,
  })

export const useOpenPokemonPackSandboxMutationOption = ({
  onPreparingChange,
  onPrepared,
}: OpenPackMutationOptionParams) =>
  mutationOptions({
    mutationFn: (setId?: string) => openPokemonPackSandbox(setId),
    onSuccess: async (pack) => {
      onPreparingChange(true)
      await preloadPackImages(pack)
      onPrepared()
      onPreparingChange(false)
    },
    onError: () => {
      onPreparingChange(false)
    },
  })
