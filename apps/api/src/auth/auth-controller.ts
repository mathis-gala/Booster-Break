import { Elysia } from 'elysia'
import { z } from 'zod'
import type { ApiConfig } from '../config'
import { parseCookies, serializeCookie } from './cookies'
import { AuthService, isAuthServiceError } from './auth-service'
import type { AuthStore } from './session-store'
import { SlackOAuthClient } from './slack-oauth-client'

interface AuthControllerOptions {
  config: ApiConfig
  service?: AuthService
  store?: AuthStore
}

export const createAuthController = ({ config, service, store }: AuthControllerOptions) => {
  const authService =
    service ??
    new AuthService({
      sessionCookieName: config.sessionCookieName,
      slackClient: createSlackClient(config),
      store: mustProvideStore(store),
    })
  const slackStateCookieName = `${config.sessionCookieName}_slack_state`

  return new Elysia({ prefix: '/auth' })
    .get('/me', async ({ headers, status }) => {
      const user = await authService.getCurrentUser(headers.cookie)

      if (!user) {
        return status(401, { authenticated: false })
      }

      return {
        authenticated: true,
        user,
      }
    })
    .get('/slack/start', ({ status }) => {
      const state = crypto.randomUUID()
      const authorizeUrl = authService.createSlackAuthorizeUrl(state)

      if (typeof authorizeUrl !== 'string') {
        return status(503, authorizeUrl)
      }

      return new Response(null, {
        status: 302,
        headers: {
          Location: authorizeUrl,
          'Set-Cookie': serializeCookie(slackStateCookieName, state, {
            maxAge: 60 * 5,
            secure: config.secureCookies,
          }),
        },
      })
    })
    .get(
      '/slack/callback',
      async ({ headers, query }) => {
        const result = await authService.loginWithSlack(
          query.code,
          query.state,
          parseCookies(headers.cookie).get(slackStateCookieName),
        )

        if (isAuthServiceError(result)) {
          return createOAuthRedirectResponse(config.webOrigin, config, slackStateCookieName)
        }

        return createAuthResponse(result, 302, config, {
          clearCookieName: slackStateCookieName,
          location: config.webOrigin,
        })
      },
      {
        query: slackCallbackQuerySchema,
      },
    )
    .post('/logout', async ({ headers }) => {
      await authService.logout(headers.cookie)

      return new Response(null, {
        status: 204,
        headers: {
          'Set-Cookie': serializeCookie(config.sessionCookieName, '', {
            maxAge: 0,
            secure: config.secureCookies,
          }),
        },
      })
    })
}

const createAuthResponse = (
  result: { user: unknown; sessionId: string; maxAge: number },
  status: number,
  config: ApiConfig,
  options?: { clearCookieName?: string; location?: string },
): Response => {
  const responseHeaders = new Headers({
    'Content-Type': 'application/json',
    'Set-Cookie': serializeCookie(config.sessionCookieName, result.sessionId, {
      maxAge: result.maxAge,
      secure: config.secureCookies,
    }),
  })

  if (options?.location) {
    responseHeaders.set('Location', options.location)
    responseHeaders.delete('Content-Type')
  }

  if (options?.clearCookieName) {
    responseHeaders.append(
      'Set-Cookie',
      serializeCookie(options.clearCookieName, '', {
        maxAge: 0,
        secure: config.secureCookies,
      }),
    )
  }

  return new Response(
    options?.location ? null : JSON.stringify({ authenticated: true, user: result.user }),
    {
      status,
      headers: responseHeaders,
    },
  )
}

const createOAuthRedirectResponse = (
  location: string,
  config: ApiConfig,
  stateCookieName: string,
): Response => {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      'Set-Cookie': serializeCookie(stateCookieName, '', {
        maxAge: 0,
        secure: config.secureCookies,
      }),
    },
  })
}

const createSlackClient = (config: ApiConfig): SlackOAuthClient | undefined => {
  if (!config.slackClientId || !config.slackClientSecret) {
    return undefined
  }

  return new SlackOAuthClient({
    clientId: config.slackClientId,
    clientSecret: config.slackClientSecret,
    redirectUri: config.slackRedirectUri,
  })
}

const slackCallbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
})

const mustProvideStore = (store: AuthStore | undefined): AuthStore => {
  if (!store) {
    throw new Error('createAuthController requires either service or store')
  }

  return store
}
