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

const magicTokenQueryError = 'magic-link-error'

export const createAuthController = ({ config, service, store }: AuthControllerOptions) => {
  const authService =
    service ??
    new AuthService({
      sessionCookieName: config.sessionCookieName,
      slackClient: createSlackClient(config),
      magicLinkTtlDays: config.magicLinkTtlDays,
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
          return createOAuthRedirectResponse(config.webAppUrl, config, slackStateCookieName)
        }

        return createAuthResponse(result, 302, config, {
          clearCookieName: slackStateCookieName,
          location: config.webAppUrl,
        })
      },
      {
        query: slackCallbackQuerySchema,
      },
    )
    .post(
      '/magic/generate',
      async ({ body, headers, status }) => {
        if (!config.magicLinkAdminSecret) {
          return status(503, {
            error: 'magic_link_admin_secret_missing',
            message: 'Set MAGIC_LINK_ADMIN_SECRET to enable magic link generation.',
          })
        }

        if (!isMagicAdminRequestAuthorized(headers, config.magicLinkAdminSecret)) {
          return status(401, {
            error: 'magic_link_not_authorized',
            message: 'Invalid magic-link admin secret.',
          })
        }

        const result = await authService.createMagicUserAndToken(body)

        if (isAuthServiceError(result)) {
          return status(400, result)
        }

        return {
          ...result,
          link: createMagicLinkCallbackUrl(config, result.token),
          expiresAt: result.expiresAt.toISOString(),
        }
      },
      {
        body: magicLinkGenerateBodySchema,
      },
    )
    .get(
      '/magic/callback',
      async ({ query }) => {
        const result = await authService.loginWithMagicToken(query.token)

        if (isAuthServiceError(result)) {
          return createMagicLinkRedirectResponse(config.webAppUrl, config)
        }

        return createAuthResponse(result, 302, config, {
          location: config.webAppUrl,
        })
      },
      {
        query: magicLinkCallbackQuerySchema,
      },
    )
    .post(
      '/dev/login',
      async ({ body, set, status }) => {
        if (!config.devAuthEnabled) {
          return status(404, {
            error: 'dev_auth_disabled',
            message: 'Local development sign-in is not enabled for this API origin.',
          })
        }

        const result = await authService.loginForDevelopment(body)

        if (isAuthServiceError(result)) {
          return status(400, result)
        }

        set.headers['Set-Cookie'] = serializeCookie(config.sessionCookieName, result.sessionId, {
          maxAge: result.maxAge,
          sameSite: config.sessionCookieSameSite,
          secure: config.secureCookies,
        })

        return {
          authenticated: true,
          user: result.user,
        }
      },
      {
        body: devLoginBodySchema,
      },
    )
    .post('/logout', async ({ headers }) => {
      await authService.logout(headers.cookie)

      return new Response(null, {
        status: 204,
        headers: {
          'Set-Cookie': serializeCookie(config.sessionCookieName, '', {
            maxAge: 0,
            sameSite: config.sessionCookieSameSite,
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
      sameSite: config.sessionCookieSameSite,
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

const createMagicLinkRedirectResponse = (location: string, config: ApiConfig): Response => {
  const separator = location.includes('?') ? '&' : '?'
  const redirectUrl = `${location}${separator}${magicTokenQueryError}=invalid`

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectUrl,
      'Set-Cookie': serializeCookie(config.sessionCookieName, '', {
        maxAge: 0,
        secure: config.secureCookies,
      }),
    },
  })
}

const createMagicLinkCallbackUrl = (config: ApiConfig, token: string): string => {
  const callbackUrl = new URL(`${config.apiOrigin.replace(/\/$/, '')}/auth/magic/callback`)
  callbackUrl.searchParams.set('token', token)

  return callbackUrl.toString()
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

const magicLinkGenerateBodySchema = z.object({
  pseudo: z.string().trim().min(1),
  displayName: z.string().trim().optional(),
  avatarUrl: z.string().trim().url().optional(),
  expiresInDays: z.number().positive().int().optional(),
})

const magicLinkCallbackQuerySchema = z.object({
  token: z.string().optional(),
})

const devLoginBodySchema = z.object({
  pseudo: z.string().trim().min(1),
  displayName: z.string().trim().optional(),
  avatarUrl: z.string().trim().url().optional(),
})

const isMagicAdminRequestAuthorized = (
  headers: Record<string, string | undefined>,
  secret: string,
): boolean => {
  const bearerSecret = parseBearerSecret(headers.authorization)

  return (
    headers['x-magic-admin-secret'] === secret ||
    headers['x-admin-secret'] === secret ||
    bearerSecret === secret
  )
}

const parseBearerSecret = (authorizationHeader: string | undefined): string | undefined => {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return undefined
  }

  return authorizationHeader.slice(7)
}

const mustProvideStore = (store: AuthStore | undefined): AuthStore => {
  if (!store) {
    throw new Error('createAuthController requires either service or store')
  }

  return store
}
