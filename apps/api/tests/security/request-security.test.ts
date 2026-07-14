import { describe, expect, test } from 'bun:test'
import { Elysia } from 'elysia'
import { createRequestSecurityPlugin } from '../../src/security/request-security'

const createApp = () =>
  new Elysia()
    .use(
      createRequestSecurityPlugin({
        apiOrigin: 'https://booster.example.com/api',
        webOrigin: 'https://booster.example.com',
        sessionCookieName: 'tcg_session',
      }),
    )
    .post('/mutate', () => ({ ok: true }))

describe('request security', () => {
  test('rejects cookie-authenticated mutations from foreign origins', async () => {
    const response = await createApp().handle(
      new Request('https://booster.example.com/mutate', {
        method: 'POST',
        headers: {
          Cookie: 'tcg_session=session-token',
          Origin: 'https://attacker.example',
        },
      }),
    )

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      error: 'invalid_request_origin',
      message: 'Request origin is not allowed.',
    })
  })

  test('allows cookie-authenticated mutations from the configured web origin', async () => {
    const response = await createApp().handle(
      new Request('https://booster.example.com/mutate', {
        method: 'POST',
        headers: {
          Cookie: 'tcg_session=session-token',
          Origin: 'https://booster.example.com',
        },
      }),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })

  test('rejects cookie-authenticated mutations with no browser origin evidence', async () => {
    const response = await createApp().handle(
      new Request('https://booster.example.com/mutate', {
        method: 'POST',
        headers: {
          Cookie: 'tcg_session=session-token',
        },
      }),
    )

    expect(response.status).toBe(403)
  })

  test('allows non-browser authenticated commands without a session cookie', async () => {
    const response = await createApp().handle(
      new Request('https://booster.example.com/mutate', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer admin-secret',
        },
      }),
    )

    expect(response.status).toBe(200)
  })
})
