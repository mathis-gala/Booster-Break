import { mutationOptions, type QueryClient } from '@tanstack/react-query'

import { devLogin, logout } from '@/features/dashboard/lib/api'
import { authQueryKeys, pokemonQueryKeys } from '@/features/dashboard/lib/query-keys'

export const useDevLoginMutationOption = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: devLogin,
    onSuccess: (auth) => {
      queryClient.setQueryData(authQueryKeys.me(), auth)
      void queryClient.invalidateQueries({ queryKey: pokemonQueryKeys.collection.all })
      void queryClient.invalidateQueries({ queryKey: pokemonQueryKeys.packStatus() })
      void queryClient.invalidateQueries({ queryKey: pokemonQueryKeys.leaderboard() })
    },
  })

export const useLogoutMutationOption = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(authQueryKeys.me(), { authenticated: false })
      queryClient.removeQueries({ queryKey: pokemonQueryKeys.collection.all })
    },
  })
