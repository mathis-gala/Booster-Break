import { api } from '@/lib/api-client'
import { edenQueryOption } from './eden-query-option'
import { m } from '@/paraglide/messages'

export const serverStatusQueryKey = ['server-status'] as const

export const useHealthQueryOption = (enabled: boolean) =>
  edenQueryOption({
    edenQuery: api.health.get,
    queryKey: serverStatusQueryKey,
    mapData: (data) => data,
    enabled,
    refetchOnWindowFocus: true,
    retry: false,
    staleTime: 0,
    meta: {
      suppressToast: true,
    },
    toError: () => new Error(m.api_unable_reach()),
  })
