import { describe, expect, test } from 'bun:test'
import { Elysia } from 'elysia'
import { createRateLimitPlugin, FixedWindowRateLimiter } from '../../src/security/rate-limiter'

describe('FixedWindowRateLimiter', () => {
  test('blocks requests beyond the configured limit until the window resets', () => {
    let currentTime = 1_000
    const limiter = new FixedWindowRateLimiter({
      limit: 2,
      windowMs: 10_000,
      now: () => currentTime,
    })

    expect(limiter.check('client')).toEqual({ allowed: true })
    expect(limiter.check('client')).toEqual({ allowed: true })
    expect(limiter.check('client')).toEqual({ allowed: false, retryAfterSeconds: 10 })

    currentTime += 10_000

    expect(limiter.check('client')).toEqual({ allowed: true })
  })

  test('returns 429 and Retry-After for a protected route', async () => {
    const app = new Elysia()
      .use(
        createRateLimitPlugin([{ method: 'POST', path: '/sensitive', limit: 1, windowMs: 60_000 }]),
      )
      .post('/sensitive', () => ({ ok: true }))

    const request = () =>
      app.handle(
        new Request('http://localhost/sensitive', {
          method: 'POST',
          headers: { 'x-real-ip': '192.0.2.1' },
        }),
      )

    expect((await request()).status).toBe(200)

    const blocked = await request()
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('retry-after')).toBe('60')
  })
})
