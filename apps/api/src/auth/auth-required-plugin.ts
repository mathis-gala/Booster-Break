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
  new Elysia({ name: 'auth-required' })
    .resolve(async ({ headers, status }) => {
      const currentUser = await authService.getCurrentUser(headers.cookie)

      if (!currentUser) {
        return status(401, {
          error: 'unauthenticated',
          message: unauthenticatedMessage,
        })
      }

      return { currentUser }
    })
    .as('scoped')
