import { Elysia } from 'elysia'
import { isIP } from 'node:net'

interface FixedWindowRateLimiterOptions {
  limit: number
  windowMs: number
  maxKeys?: number
  now?: () => number
}

type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number }

interface RateLimitEntry {
  count: number
  resetAt: number
}

export class FixedWindowRateLimiter {
  private readonly entries = new Map<string, RateLimitEntry>()
  private readonly maxKeys: number
  private readonly now: () => number

  constructor(private readonly options: FixedWindowRateLimiterOptions) {
    if (!Number.isInteger(options.limit) || options.limit < 1) {
      throw new Error('rate limit must be a positive integer')
    }

    if (!Number.isFinite(options.windowMs) || options.windowMs <= 0) {
      throw new Error('rate limit window must be positive')
    }

    this.maxKeys = options.maxKeys ?? 10_000
    this.now = options.now ?? Date.now
  }

  check(key: string): RateLimitResult {
    const currentTime = this.now()
    const entryKey = this.resolveEntryKey(key, currentTime)
    const existing = this.entries.get(entryKey)

    if (!existing || existing.resetAt <= currentTime) {
      this.entries.set(entryKey, {
        count: 1,
        resetAt: currentTime + this.options.windowMs,
      })
      return { allowed: true }
    }

    if (existing.count >= this.options.limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - currentTime) / 1_000)),
      }
    }

    existing.count += 1
    return { allowed: true }
  }

  private resolveEntryKey(key: string, currentTime: number): string {
    if (this.entries.has(key)) {
      return key
    }

    if (this.entries.size < this.maxKeys) {
      return key
    }

    for (const [entryKey, entry] of this.entries) {
      if (entry.resetAt <= currentTime) {
        this.entries.delete(entryKey)
      }
    }

    if (this.entries.size >= this.maxKeys) {
      const oldestKey = this.entries.keys().next().value

      if (oldestKey !== undefined) {
        this.entries.delete(oldestKey)
      }
    }

    return key
  }
}

export interface RateLimitRule {
  method: string
  path: string
  limit: number
  windowMs: number
}

interface RateLimitPluginOptions {
  rules?: RateLimitRule[]
  trustProxy?: boolean
}

export const apiRateLimitRules: RateLimitRule[] = [
  { method: 'POST', path: '/auth/dev/login', limit: 10, windowMs: 60_000 },
  { method: 'POST', path: '/auth/magic/generate', limit: 10, windowMs: 60_000 },
  { method: 'GET', path: '/auth/slack/start', limit: 30, windowMs: 60_000 },
  { method: 'GET', path: '/auth/slack/callback', limit: 30, windowMs: 60_000 },
  { method: 'GET', path: '/auth/github/start', limit: 30, windowMs: 60_000 },
  { method: 'GET', path: '/auth/github/callback', limit: 30, windowMs: 60_000 },
  { method: 'GET', path: '/auth/magic/callback', limit: 30, windowMs: 60_000 },
  { method: 'GET', path: '/pokemon/sets', limit: 60, windowMs: 60_000 },
  { method: 'GET', path: '/pokemon/cards', limit: 120, windowMs: 60_000 },
  { method: 'GET', path: '/pokemon/packs/sandbox/sets', limit: 60, windowMs: 60_000 },
  { method: 'GET', path: '/pokemon/packs/sandbox/cards', limit: 60, windowMs: 60_000 },
  { method: 'POST', path: '/pokemon/packs/sandbox/open', limit: 20, windowMs: 60_000 },
  { method: 'GET', path: '/pokemon/leaderboard', limit: 60, windowMs: 60_000 },
  { method: 'GET', path: '/trade/auctions', limit: 60, windowMs: 60_000 },
]

export const createRateLimitPlugin = (options: RateLimitPluginOptions = {}) => {
  const rules = options.rules ?? apiRateLimitRules
  const limiters = new Map(
    rules.map((rule) => [
      toRuleKey(rule.method, rule.path),
      new FixedWindowRateLimiter({
        limit: rule.limit,
        windowMs: rule.windowMs,
      }),
    ]),
  )

  return new Elysia({ name: 'rate-limit' })
    .onBeforeHandle(({ request, server, set, status }) => {
      const path = new URL(request.url).pathname
      const limiter = limiters.get(toRuleKey(request.method, path))

      if (!limiter) {
        return
      }

      const result = limiter.check(
        getClientIdentifier(
          request,
          server?.requestIP(request)?.address,
          options.trustProxy ?? false,
        ),
      )

      if (result.allowed) {
        return
      }

      set.headers['Retry-After'] = String(result.retryAfterSeconds)
      set.headers['Cache-Control'] = 'no-store'

      return status(429, {
        error: 'rate_limit_exceeded',
        message: 'Too many requests. Please try again later.',
      })
    })
    .as('global')
}

const toRuleKey = (method: string, path: string): string =>
  `${method.toUpperCase()} ${path.length > 1 ? path.replace(/\/$/, '') : path}`

const getClientIdentifier = (
  request: Request,
  remoteAddress: string | undefined,
  trustProxy: boolean,
): string => {
  const forwardedAddress = trustProxy ? request.headers.get('x-real-ip')?.trim() : undefined
  const clientAddress =
    forwardedAddress && isIP(forwardedAddress) ? forwardedAddress : remoteAddress

  return (clientAddress || 'unknown').slice(0, 128)
}
