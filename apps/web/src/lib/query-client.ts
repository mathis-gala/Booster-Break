import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'

import { toast } from '@/features/toast/toast-store'
import { m } from '@/paraglide/messages'

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      showBackendError(error, query.meta)
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      showBackendError(error, mutation.meta)
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
  },
})

function showBackendError(error: unknown, meta?: Record<string, unknown>) {
  if (meta?.suppressToast) {
    return
  }

  toast.show(toErrorMessage(error))
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return m.toast_unexpected_backend_error()
}
