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
  apiOrigin: 'http://127.0.0.1:3100',
  sessionCookieName: 'tcg_session',
  secureCookies: false,
  slackRedirectUri: 'http://127.0.0.1:3100/auth/slack/callback',
}

describe('auth routes', () => {
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
    expect(response.headers.get('location')).toBe(config.webOrigin)
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
})
