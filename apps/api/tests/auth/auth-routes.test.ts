import { describe, expect, test } from 'bun:test'
import { Elysia } from 'elysia'
import { AuthService } from '../../src/auth/auth-service'
import { createAuthController } from '../../src/auth/auth-controller'
import { createAuthRoutes } from '../../src/auth/auth-routes'
import { MemoryAuthStore } from '../../src/auth/session-store'
import type { ApiConfig } from '../../src/config'

const config: ApiConfig = {
  port: 3100,
  host: '127.0.0.1',
  webOrigin: 'http://127.0.0.1:5173',
  webAppUrl: 'http://127.0.0.1:5173',
  apiOrigin: 'http://127.0.0.1:3100',
  sessionCookieName: 'tcg_session',
  sessionCookieSameSite: 'Lax',
  secureCookies: false,
  slackRedirectUri: 'http://127.0.0.1:3100/auth/slack/callback',
  githubRedirectUri: 'http://127.0.0.1:3100/auth/github/callback',
  magicLinkAdminSecret: 'unit-magic-secret',
  magicLinkTtlDays: 30,
  devAuthEnabled: false,
}

describe('auth routes', () => {
  test('reports whether development sign-in is enabled', async () => {
    const app = new Elysia().use(createAuthController({ config, store: new MemoryAuthStore() }))
    const response = await app.handle(new Request('http://localhost/auth/providers'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ developmentAuthEnabled: false })
  })

  test('returns unauthenticated without a session cookie', async () => {
    const app = new Elysia().use(createAuthRoutes({ config, store: new MemoryAuthStore() }))
    const response = await app.handle(new Request('http://localhost/auth/me'))

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ authenticated: false })
  })

  test('reports clear Slack setup error when OAuth is not configured', async () => {
    const app = new Elysia().use(createAuthRoutes({ config, store: new MemoryAuthStore() }))
    const response = await app.handle(new Request('http://localhost/auth/slack/start'))
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.error).toBe('slack_auth_not_configured')
  })

  test('redirects to Slack and stores OAuth state', async () => {
    const store = new MemoryAuthStore()
    const service = new AuthService({
      sessionCookieName: config.sessionCookieName,
      store,
      slackClient: {
        createAuthorizeUrl: (state: string) => `https://slack.com/oauth?state=${state}`,
        getProfile: async () => {
          throw new Error('not used')
        },
      },
    })
    const app = new Elysia().use(createAuthController({ config, service }))
    const response = await app.handle(new Request('http://localhost/auth/slack/start'))

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toContain('https://slack.com/oauth?state=')
    expect(response.headers.get('set-cookie')).toContain('tcg_session_slack_state=')
  })

  test('creates a session after Slack callback', async () => {
    const store = new MemoryAuthStore()
    const service = new AuthService({
      sessionCookieName: config.sessionCookieName,
      store,
      slackClient: {
        createAuthorizeUrl: (state: string) => `https://slack.com/oauth?state=${state}`,
        getProfile: async () => ({
          slackSubject: 'slack-subject',
          slackUserId: 'U123',
          slackTeamId: 'T123',
          name: 'Player One',
          picture: 'https://example.com/avatar.png',
        }),
      },
    })
    const app = new Elysia().use(createAuthController({ config, service }))
    const response = await app.handle(
      new Request('http://localhost/auth/slack/callback?code=oauth-code&state=state-1', {
        headers: {
          Cookie: 'tcg_session_slack_state=state-1',
        },
      }),
    )

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(config.webAppUrl)
    expect(response.headers.get('set-cookie')).toContain('tcg_session=')
  })

  test('returns the authenticated Slack user for a valid session cookie', async () => {
    const store = new MemoryAuthStore()
    const user = store.upsertSlackUser({
      slackUserId: 'U123',
      slackTeamId: 'T123',
      pseudo: 'Player One',
      displayName: 'Player One',
      avatarUrl: 'https://example.com/avatar.png',
    })
    const session = store.createSession(user.id)
    const app = new Elysia().use(createAuthRoutes({ config, store }))
    const response = await app.handle(
      new Request('http://localhost/auth/me', {
        headers: {
          Cookie: `tcg_session=${session.id}`,
        },
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.authenticated).toBe(true)
    expect(body.user.id).toBe(user.id)
    expect(body.user.displayName).toBe('Player One')
  })

  test('rejects magic link generation when the admin secret is missing', async () => {
    const app = new Elysia().use(
      createAuthController({
        config: {
          ...config,
          magicLinkAdminSecret: undefined,
        },
        store: new MemoryAuthStore(),
      }),
    )
    const response = await app.handle(
      new Request('http://localhost/auth/magic/generate', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          pseudo: 'mystery',
        }),
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.error).toBe('magic_link_admin_secret_missing')
  })

  test('rejects magic link generation with invalid admin secret', async () => {
    const app = new Elysia().use(createAuthController({ config, store: new MemoryAuthStore() }))
    const response = await app.handle(
      new Request('http://localhost/auth/magic/generate', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-magic-admin-secret': 'wrong-secret',
        },
        body: JSON.stringify({
          pseudo: 'mystery',
        }),
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('magic_link_not_authorized')
  })

  test('generates a magic login token with user profile data and a callback URL', async () => {
    const app = new Elysia().use(createAuthController({ config, store: new MemoryAuthStore() }))
    const response = await app.handle(
      new Request('http://localhost/auth/magic/generate', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-magic-admin-secret': config.magicLinkAdminSecret!,
        },
        body: JSON.stringify({
          pseudo: 'GuestOne',
          displayName: 'Guest One',
          avatarUrl: 'https://example.com/guest.png',
          expiresInDays: 5,
        }),
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.token).toBeDefined()
    expect(body.user.displayName).toBe('Guest One')
    expect(body.user.avatarUrl).toBe('https://example.com/guest.png')
    expect(body.link).toBe(
      `${config.apiOrigin}/auth/magic/callback?token=${encodeURIComponent(body.token)}`,
    )
    expect(body.expiresAt).toBeDefined()
  })

  test('logs in with a valid magic token and allows authenticated /auth/me', async () => {
    const store = new MemoryAuthStore()
    const app = new Elysia().use(createAuthController({ config, store }))
    const generate = await app.handle(
      new Request('http://localhost/auth/magic/generate', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-magic-admin-secret': config.magicLinkAdminSecret!,
        },
        body: JSON.stringify({
          pseudo: 'Miku',
          displayName: 'Miku Test',
        }),
      }),
    )
    const generated = await generate.json()
    const callback = await app.handle(
      new Request(`http://localhost/auth/magic/callback?token=${generated.token}`),
    )
    const setCookie = callback.headers.get('set-cookie')

    expect(callback.status).toBe(302)
    expect(callback.headers.get('location')).toBe(config.webAppUrl)
    expect(setCookie).toContain(`${config.sessionCookieName}=`)

    const sessionId = setCookie?.split(';')[0].split('=')[1]
    const me = await app.handle(
      new Request('http://localhost/auth/me', {
        headers: {
          Cookie: `${config.sessionCookieName}=${sessionId}`,
        },
      }),
    )
    const meBody = await me.json()

    expect(me.status).toBe(200)
    expect(meBody.authenticated).toBe(true)
    expect(meBody.user.pseudo).toBe('miku')
    expect(meBody.user.displayName).toBe('Miku Test')
  })

  test('rejects reused magic token after successful login', async () => {
    const store = new MemoryAuthStore()
    const app = new Elysia().use(createAuthController({ config, store }))
    const generate = await app.handle(
      new Request('http://localhost/auth/magic/generate', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-magic-admin-secret': config.magicLinkAdminSecret!,
        },
        body: JSON.stringify({
          pseudo: 'Once',
        }),
      }),
    )
    const generated = await generate.json()

    await app.handle(new Request(`http://localhost/auth/magic/callback?token=${generated.token}`))
    const reused = await app.handle(
      new Request(`http://localhost/auth/magic/callback?token=${generated.token}`),
    )

    expect(reused.status).toBe(302)
    expect(reused.headers.get('location')).toBe(`${config.webAppUrl}?magic-link-error=invalid`)
  })

  test('rejects an expired magic token', async () => {
    const store = new MemoryAuthStore()
    const app = new Elysia().use(
      createAuthController({
        config: {
          ...config,
          magicLinkTtlDays: -1,
        },
        store,
      }),
    )

    const generate = await app.handle(
      new Request('http://localhost/auth/magic/generate', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-magic-admin-secret': config.magicLinkAdminSecret!,
        },
        body: JSON.stringify({
          pseudo: 'Expired',
          displayName: 'Expired User',
        }),
      }),
    )
    const generated = await generate.json()

    const callback = await app.handle(
      new Request(`http://localhost/auth/magic/callback?token=${generated.token}`),
    )

    expect(callback.status).toBe(302)
    expect(callback.headers.get('location')).toBe(`${config.webAppUrl}?magic-link-error=invalid`)
  })

  test('redirects with error for invalid magic token', async () => {
    const app = new Elysia().use(createAuthController({ config, store: new MemoryAuthStore() }))

    const callback = await app.handle(
      new Request('http://localhost/auth/magic/callback?token=definitely-not-valid'),
    )

    expect(callback.status).toBe(302)
    expect(callback.headers.get('location')).toBe(`${config.webAppUrl}?magic-link-error=invalid`)
  })

  test('creates a local development session without Slack OAuth', async () => {
    const store = new MemoryAuthStore()
    const app = new Elysia().use(
      createAuthController({
        config: {
          ...config,
          devAuthEnabled: true,
        },
        store,
      }),
    )
    const response = await app.handle(
      new Request('http://localhost/auth/dev/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          pseudo: 'Local Player',
        }),
      }),
    )
    const body = await response.json()
    const setCookie = response.headers.get('set-cookie')

    expect(response.status).toBe(200)
    expect(setCookie).toContain(`${config.sessionCookieName}=`)
    expect(body.authenticated).toBe(true)
    expect(body.user.pseudo).toBe('local player')
    expect(body.user.displayName).toBe('Local Player')

    const sessionId = setCookie?.split(';')[0].split('=')[1]
    const me = await app.handle(
      new Request('http://localhost/auth/me', {
        headers: {
          Cookie: `${config.sessionCookieName}=${sessionId}`,
        },
      }),
    )
    const meBody = await me.json()

    expect(me.status).toBe(200)
    expect(meBody.authenticated).toBe(true)
    expect(meBody.user.id).toBe(body.user.id)
  })

  test('does not allow local development sign-in when disabled', async () => {
    const app = new Elysia().use(createAuthController({ config, store: new MemoryAuthStore() }))
    const response = await app.handle(
      new Request('http://localhost/auth/dev/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          pseudo: 'Local Player',
        }),
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe('dev_auth_disabled')
  })

  test('reports clear GitHub setup error when OAuth is not configured', async () => {
    const app = new Elysia().use(createAuthRoutes({ config, store: new MemoryAuthStore() }))
    const response = await app.handle(new Request('http://localhost/auth/github/start'))
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.error).toBe('github_auth_not_configured')
  })

  test('redirects to GitHub and stores OAuth state', async () => {
    const store = new MemoryAuthStore()
    const service = new AuthService({
      sessionCookieName: config.sessionCookieName,
      store,
      githubClient: {
        createAuthorizeUrl: (state: string) => `https://github.com/oauth?state=${state}`,
        getProfile: async () => {
          throw new Error('not used')
        },
      },
    })
    const app = new Elysia().use(createAuthController({ config, service }))
    const response = await app.handle(new Request('http://localhost/auth/github/start'))

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toContain('https://github.com/oauth?state=')
    expect(response.headers.get('set-cookie')).toContain('tcg_session_github_state=')
  })

  test('creates a session after GitHub callback', async () => {
    const store = new MemoryAuthStore()
    const service = new AuthService({
      sessionCookieName: config.sessionCookieName,
      store,
      githubClient: {
        createAuthorizeUrl: (state: string) => `https://github.com/oauth?state=${state}`,
        getProfile: async () => ({
          githubUserId: 'gh-12345',
          login: 'octocat',
          name: 'The Octocat',
          avatarUrl: 'https://example.com/octocat.png',
          email: 'octocat@example.com',
        }),
      },
    })
    const app = new Elysia().use(createAuthController({ config, service }))
    const response = await app.handle(
      new Request('http://localhost/auth/github/callback?code=oauth-code&state=state-1', {
        headers: {
          Cookie: 'tcg_session_github_state=state-1',
        },
      }),
    )

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(config.webAppUrl)
    expect(response.headers.get('set-cookie')).toContain('tcg_session=')
  })

  test('links GitHub sign-in to an existing user by verified email', async () => {
    const store = new MemoryAuthStore()

    // First GitHub sign-in creates an account with a verified email.
    const first = store.upsertGithubUser({
      githubUserId: 'gh-1',
      login: 'octocat',
      name: 'The Octocat',
      avatarUrl: 'https://example.com/octocat.png',
      email: 'octocat@example.com',
    })

    // Second GitHub sign-in, different GitHub id but same verified email,
    // must resolve to the same player account (account linking).
    const linked = store.upsertGithubUser({
      githubUserId: 'gh-2',
      login: 'octocat-personal',
      name: 'The Octocat',
      avatarUrl: 'https://example.com/octocat.png',
      email: 'octocat@example.com',
    })

    expect(linked.id).toBe(first.id)
    expect(store.findUserByEmail('octocat@example.com')?.id).toBe(first.id)
  })

  test('rejects GitHub callback with invalid state', async () => {
    const store = new MemoryAuthStore()
    const service = new AuthService({
      sessionCookieName: config.sessionCookieName,
      store,
      githubClient: {
        createAuthorizeUrl: (state: string) => `https://github.com/oauth?state=${state}`,
        getProfile: async () => ({
          githubUserId: 'gh-12345',
          login: 'octocat',
          avatarUrl: 'https://example.com/octocat.png',
        }),
      },
    })
    const app = new Elysia().use(createAuthController({ config, service }))
    const response = await app.handle(
      new Request('http://localhost/auth/github/callback?code=oauth-code&state=wrong', {
        headers: {
          Cookie: 'tcg_session_github_state=state-1',
        },
      }),
    )

    expect(response.status).toBe(302)
    // Failed OAuth callback redirects to the web app without a session cookie.
    expect(response.headers.get('location')).toBe(config.webAppUrl)
    expect(response.headers.get('set-cookie') ?? '').not.toContain('tcg_session=')
  })
})
