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

  test('does not merge new clients when identifier capacity is reached', () => {
    const limiter = new FixedWindowRateLimiter({
      limit: 1,
      windowMs: 60_000,
      maxKeys: 2,
      now: () => 1_000,
    })

    expect(limiter.check('client-1')).toEqual({ allowed: true })
    expect(limiter.check('client-2')).toEqual({ allowed: true })
    expect(limiter.check('client-3')).toEqual({ allowed: true })
    expect(limiter.check('client-4')).toEqual({ allowed: true })
  })

  test('ignores spoofed proxy headers unless proxy trust is enabled', async () => {
    const app = new Elysia()
      .use(
        createRateLimitPlugin({
          rules: [{ method: 'POST', path: '/sensitive', limit: 1, windowMs: 60_000 }],
        }),
      )
      .post('/sensitive', () => ({ ok: true }))

    const request = (realIp: string) =>
      app.handle(
        new Request('http://localhost/sensitive', {
          method: 'POST',
          headers: { 'x-real-ip': realIp },
        }),
      )

    expect((await request('192.0.2.1')).status).toBe(200)

    const blocked = await request('192.0.2.2')
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('retry-after')).toBe('60')
  })

  test('uses the forwarded client IP when proxy trust is enabled', async () => {
    const app = new Elysia()
      .use(
        createRateLimitPlugin({
          rules: [{ method: 'POST', path: '/sensitive', limit: 1, windowMs: 60_000 }],
          trustProxy: true,
        }),
      )
      .post('/sensitive', () => ({ ok: true }))

    const request = (realIp: string) =>
      app.handle(
        new Request('http://localhost/sensitive', {
          method: 'POST',
          headers: { 'x-real-ip': realIp },
        }),
      )

    expect((await request('192.0.2.1')).status).toBe(200)
    expect((await request('192.0.2.2')).status).toBe(200)
    expect((await request('192.0.2.1')).status).toBe(429)
  })
})
