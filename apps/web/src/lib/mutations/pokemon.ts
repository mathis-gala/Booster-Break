import { mutationOptions, type QueryClient } from '@tanstack/react-query'

import { openPokemonPack, openPokemonPackSandbox } from '@/features/dashboard/lib/api'
import { preloadPackImages } from '@/features/dashboard/lib/preload-pack-images'
import { pokemonQueryKeys } from '@/features/dashboard/lib/query-keys'

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
