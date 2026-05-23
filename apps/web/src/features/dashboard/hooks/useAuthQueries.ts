import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { fetchCurrentUser, logout } from '../lib/api'
import { authQueryKeys, pokemonQueryKeys } from '../lib/query-keys'

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: authQueryKeys.me(),
    queryFn: fetchCurrentUser,
    retry: 1,
  })
}

export function useLogoutMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(authQueryKeys.me(), { authenticated: false })
      queryClient.removeQueries({ queryKey: pokemonQueryKeys.collection.all })
    },
  })
}
