import type { AuthMeResponse } from '@tcg-collection/shared'

import { api } from '@/lib/api-client'
import { authQueryKeys } from '@/features/dashboard/lib/query-keys'
import { edenQueryOption } from './eden-query-option'
import { m } from '@/paraglide/messages'

export const useCurrentUserQueryOption = () =>
  edenQueryOption({
    edenQuery: api.auth.me.get,
    queryKey: authQueryKeys.me(),
    mapData: (data): AuthMeResponse => data,
    retry: 1,
    mapErrorData: (error) => {
      if (error.status === 401) {
        return { authenticated: false as const }
      }

      return undefined
    },
    toError: () => new Error(m.api_unable_auth_session()),
  })
