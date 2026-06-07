import type { AuthUser } from '../auth/types'
import type { TradeServiceError } from './trade-types'

export const resolveAuthenticatedTradeUser = async (
  user: AuthUser | undefined,
  unauthenticatedMessage: string,
): Promise<AuthUser | TradeServiceError> => {
  if (!user) {
    return {
      error: 'unauthenticated',
      message: unauthenticatedMessage,
    }
  }

  return user
}
