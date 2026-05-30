import type { AuthService } from '../auth/auth-service'
import type { AuthUser } from '../auth/types'
import type { TradeServiceError } from './trade-types'

export const resolveAuthenticatedTradeUser = async (
  authService: AuthService,
  cookieHeader: string | undefined,
  unauthenticatedMessage: string,
): Promise<AuthUser | TradeServiceError> => {
  const user = await authService.getCurrentUser(cookieHeader)

  if (!user) {
    return {
      error: 'unauthenticated',
      message: unauthenticatedMessage,
    }
  }

  return user
}
