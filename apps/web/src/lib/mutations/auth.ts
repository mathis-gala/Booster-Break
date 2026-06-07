import { mutationOptions, type QueryClient } from '@tanstack/react-query'

import { logout } from '@/features/dashboard/lib/api'
import { authQueryKeys, pokemonQueryKeys } from '@/features/dashboard/lib/query-keys'

export const useLogoutMutationOption = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(authQueryKeys.me(), { authenticated: false })
      queryClient.removeQueries({ queryKey: pokemonQueryKeys.collection.all })
    },
  })
