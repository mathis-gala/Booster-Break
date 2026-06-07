import type { QueryClient } from '@tanstack/react-query'

export const refreshTradeMarketQueries = async (queryClient: QueryClient): Promise<void> => {
  await queryClient.invalidateQueries({
    predicate: (query) => {
      const [domain, resource] = query.queryKey

      return domain === 'trade' && resource !== 'notifications' && resource !== 'notification'
    },
  })
}
