import { Elysia } from 'elysia'
import { AuthService } from './auth-service'

interface AuthRequiredPluginOptions {
  authService: AuthService
  unauthenticatedMessage?: string
}

const defaultUnauthenticatedMessage = 'Sign in to continue.'

export const createAuthRequiredPlugin = ({
  authService,
  unauthenticatedMessage = defaultUnauthenticatedMessage,
}: AuthRequiredPluginOptions) =>
  new Elysia({ name: 'auth-required' }).onBeforeHandle(async ({ headers, set }) => {
    const currentUser = await authService.getCurrentUser(headers.cookie)

    if (!currentUser) {
      set.status = 401

      return {
        error: 'unauthenticated',
        message: unauthenticatedMessage,
      }
    }
  })
