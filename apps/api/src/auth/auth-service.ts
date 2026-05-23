import { parseCookies } from './cookies'
import type { AuthStore } from './session-store'
import type { SlackProfile } from './slack-oauth-client'
import type { AuthUser } from './types'

const sessionCookieMaxAge = 60 * 60 * 24 * 14

export interface AuthServiceOptions {
  sessionCookieName: string
  slackClient?: SlackIdentityProvider
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

export class AuthService {
  constructor(private readonly options: AuthServiceOptions) {}

  async getCurrentUser(cookieHeader: string | undefined): Promise<AuthUser | undefined> {
    const sessionId = this.getSessionId(cookieHeader)

    if (!sessionId) {
      return undefined
    }

    const session = await this.options.store.getSession(sessionId)

    return session ? this.options.store.getUser(session.userId) : undefined
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

  private getSessionId(cookieHeader: string | undefined): string | undefined {
    return parseCookies(cookieHeader).get(this.options.sessionCookieName)
  }
}

export const isAuthServiceError = (
  result: AuthSessionResult | AuthServiceError,
): result is AuthServiceError => 'error' in result
