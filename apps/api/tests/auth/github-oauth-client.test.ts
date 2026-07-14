import { afterEach, describe, expect, test } from 'bun:test'
import { GithubOAuthClient } from '../../src/auth/github-oauth-client'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('GithubOAuthClient', () => {
  test('links accounts only with the verified primary email', async () => {
    globalThis.fetch = (async (input) => {
      const url = String(input)

      if (url.endsWith('/login/oauth/access_token')) {
        return Response.json({ access_token: 'access-token' })
      }

      if (url.endsWith('/user/emails')) {
        return Response.json([
          { email: 'unverified@example.com', verified: false, primary: true },
          { email: 'verified@example.com', verified: true, primary: true },
        ])
      }

      if (url.endsWith('/user')) {
        return Response.json({
          id: 42,
          login: 'player',
          email: 'attacker-controlled-public-value@example.com',
        })
      }

      throw new Error(`Unexpected request: ${url}`)
    }) as typeof fetch

    const client = new GithubOAuthClient({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: 'http://127.0.0.1:3100/auth/github/callback',
    })

    const profile = await client.getProfile('authorization-code')

    expect(profile.email).toBe('verified@example.com')
  })
})
