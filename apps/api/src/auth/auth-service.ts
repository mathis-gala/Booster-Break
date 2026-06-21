import { parseCookies } from './cookies'
import { normalizePseudo, type AuthStore, type CustomUserInput } from './session-store'
import type { SlackProfile } from './slack-oauth-client'
import type { AuthUser } from './types'

const sessionCookieMaxAge = 60 * 60 * 24 * 14

const msPerDay = 24 * 60 * 60 * 1000

const defaultMagicLinkTtlDays = 30

const createMagicToken = (): string => `${crypto.randomUUID()}-${crypto.randomUUID()}`

const hashMagicToken = async (token: string): Promise<string> => {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  const hashBytes = new Uint8Array(hash)

  return Array.from(hashBytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export interface AuthServiceOptions {
  sessionCookieName: string
  slackClient?: SlackIdentityProvider
  magicLinkTtlDays?: number
  store: AuthStore
}

export interface SlackIdentityProvider {
  createAuthorizeUrl(state: string): string
  getProfile(code: string): Promise<SlackProfile>
}

export type AuthServiceErrorCode =
  | 'invalid_oauth_state'
  | 'missing_oauth_code'
  | 'slack_auth_not_configured'
  | 'slack_auth_failed'
  | 'magic_link_generation_failed'
  | 'magic_link_invalid'
  | 'dev_auth_failed'
  | 'unauthenticated'

export interface AuthServiceError {
  error: AuthServiceErrorCode
  message: string
}

export interface AuthSessionResult {
  authenticated: true
  user: AuthUser
  sessionId: string
  maxAge: number
}

export interface MagicLoginCreateResult {
  token: string
  user: AuthUser
  expiresAt: Date
}

export interface MagicLoginConsumeResult {
  authenticated: true
  user: AuthUser
  sessionId: string
  maxAge: number
}

export class AuthService {
  constructor(private readonly options: AuthServiceOptions) {}

  private get magicLinkTtlDays(): number {
    return this.options.magicLinkTtlDays ?? defaultMagicLinkTtlDays
  }

  async getCurrentUser(cookieHeader: string | undefined): Promise<AuthUser | undefined> {
    const sessionId = this.getSessionId(cookieHeader)

    if (!sessionId) {
      return undefined
    }

    const session = await this.options.store.getSession(sessionId)

    return session ? this.options.store.getUser(session.userId) : undefined
  }

  async createMagicUserAndToken(
    input: CustomUserInput & { expiresInDays?: number; createdBy?: string },
  ): Promise<MagicLoginCreateResult | AuthServiceError> {
    try {
      const pseudo = normalizePseudo(input.pseudo)

      if (!pseudo) {
        return {
          error: 'magic_link_generation_failed',
          message: 'A non-empty pseudo is required to generate a magic link.',
        }
      }

      const user = await this.options.store.upsertCustomUser({
        pseudo,
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
      })

      const expiresInDays = this.resolveMagicLinkTtl(input.expiresInDays)
      const token = createMagicToken()
      const tokenHash = await hashMagicToken(token)
      const tokenRecord = await this.options.store.createMagicLoginToken({
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + expiresInDays * msPerDay),
        createdBy: input.createdBy,
      })

      return {
        token,
        user,
        expiresAt: tokenRecord.expiresAt,
      }
    } catch {
      return {
        error: 'magic_link_generation_failed',
        message: 'Failed to create a magic link. Please try again.',
      }
    }
  }

  async loginWithMagicToken(
    token: string | undefined,
  ): Promise<MagicLoginConsumeResult | AuthServiceError> {
    if (!token) {
      return {
        error: 'magic_link_invalid',
        message: 'Invalid magic link.',
      }
    }

    const tokenHash = await hashMagicToken(token)
    const tokenRecord = await this.options.store.findMagicLoginTokenByHash(tokenHash)

    if (!tokenRecord || !tokenRecord.expiresAt) {
      return {
        error: 'magic_link_invalid',
        message: 'The magic link is invalid or has expired.',
      }
    }

    if (tokenRecord.usedAt) {
      return {
        error: 'magic_link_invalid',
        message: 'The magic link is invalid or has expired.',
      }
    }

    if (tokenRecord.expiresAt.getTime() <= Date.now()) {
      return {
        error: 'magic_link_invalid',
        message: 'The magic link is invalid or has expired.',
      }
    }

    const user = await this.options.store.getUser(tokenRecord.userId)

    if (!user) {
      return {
        error: 'magic_link_invalid',
        message: 'The magic link is invalid or has expired.',
      }
    }

    const tokenConsumed = await this.options.store.markMagicLoginTokenUsed(tokenRecord.tokenHash)

    if (!tokenConsumed) {
      return {
        error: 'magic_link_invalid',
        message: 'The magic link is invalid or has expired.',
      }
    }

    const session = await this.options.store.createSession(user.id)

    return {
      authenticated: true,
      user,
      sessionId: session.id,
      maxAge: sessionCookieMaxAge,
    }
  }

  async loginForDevelopment(input: CustomUserInput): Promise<AuthSessionResult | AuthServiceError> {
    try {
      const pseudo = normalizePseudo(input.pseudo)

      if (!pseudo) {
        return {
          error: 'dev_auth_failed',
          message: 'A non-empty pseudo is required to sign in.',
        }
      }

      const user = await this.options.store.upsertCustomUser({
        pseudo,
        displayName: input.displayName?.trim() || input.pseudo.trim(),
        avatarUrl: input.avatarUrl,
      })
      const session = await this.options.store.createSession(user.id)

      return {
        authenticated: true,
        user,
        sessionId: session.id,
        maxAge: sessionCookieMaxAge,
      }
    } catch {
      return {
        error: 'dev_auth_failed',
        message: 'Local development sign-in failed. Please try again.',
      }
    }
  }

  createSlackAuthorizeUrl(state: string): string | AuthServiceError {
    if (!this.options.slackClient) {
      return {
        error: 'slack_auth_not_configured',
        message: 'Set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET to enable Slack sign-in.',
      }
    }

    return this.options.slackClient.createAuthorizeUrl(state)
  }

  async loginWithSlack(
    code: string | undefined,
    state: string | undefined,
    expectedState: string | undefined,
  ): Promise<AuthSessionResult | AuthServiceError> {
    if (!this.options.slackClient) {
      return {
        error: 'slack_auth_not_configured',
        message: 'Set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET to enable Slack sign-in.',
      }
    }

    if (!code) {
      return {
        error: 'missing_oauth_code',
        message: 'Slack did not return an OAuth code.',
      }
    }

    if (!state || !expectedState || state !== expectedState) {
      return {
        error: 'invalid_oauth_state',
        message: 'Slack sign-in state is invalid. Please try again.',
      }
    }

    try {
      const profile = await this.options.slackClient.getProfile(code)
      const displayName = profile.name.trim() || 'Slack player'
      const user = await this.options.store.upsertSlackUser({
        slackUserId: profile.slackUserId,
        slackTeamId: profile.slackTeamId,
        pseudo: displayName,
        displayName,
        avatarUrl: profile.picture,
      })
      const session = await this.options.store.createSession(user.id)

      return {
        authenticated: true,
        user,
        sessionId: session.id,
        maxAge: sessionCookieMaxAge,
      }
    } catch {
      return {
        error: 'slack_auth_failed',
        message: 'Slack sign-in failed. Please try again.',
      }
    }
  }

  async logout(cookieHeader: string | undefined): Promise<void> {
    const sessionId = this.getSessionId(cookieHeader)

    if (sessionId) {
      await this.options.store.deleteSession(sessionId)
    }
  }

  private resolveMagicLinkTtl(expiresInDays?: number): number {
    if (!expiresInDays || !Number.isFinite(expiresInDays) || expiresInDays <= 0) {
      return this.magicLinkTtlDays
    }

    return Math.max(1, Math.floor(expiresInDays))
  }

  private getSessionId(cookieHeader: string | undefined): string | undefined {
    return parseCookies(cookieHeader).get(this.options.sessionCookieName)
  }
}

export const isAuthServiceError = (
  result: AuthSessionResult | MagicLoginCreateResult | MagicLoginConsumeResult | AuthServiceError,
): result is AuthServiceError => 'error' in result
