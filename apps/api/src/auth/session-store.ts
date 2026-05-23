import type { AuthSession, AuthUser } from './types'

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14

export interface AuthStore {
  upsertSlackUser(input: SlackUserInput): AuthUser | Promise<AuthUser>
  createSession(userId: string): AuthSession | Promise<AuthSession>
  getSession(sessionId: string): AuthSession | undefined | Promise<AuthSession | undefined>
  getUser(userId: string): AuthUser | undefined | Promise<AuthUser | undefined>
  deleteSession(sessionId: string): void | Promise<void>
}

export interface SlackUserInput {
  slackUserId: string
  slackTeamId?: string
  pseudo: string
  displayName?: string
  avatarUrl?: string
}

export class MemoryAuthStore implements AuthStore {
  private readonly sessions = new Map<string, AuthSession>()
  private readonly users = new Map<string, AuthUser>()
  private readonly usersBySlackId = new Map<string, string>()

  upsertSlackUser(input: SlackUserInput): AuthUser {
    const existingUserId = this.usersBySlackId.get(input.slackUserId)
    const user: AuthUser = {
      id: existingUserId ?? crypto.randomUUID(),
      pseudo: normalizePseudo(input.pseudo),
      displayName: input.displayName,
      avatarUrl: input.avatarUrl,
    }

    this.users.set(user.id, user)
    this.usersBySlackId.set(input.slackUserId, user.id)
    return user
  }

  createSession(userId: string): AuthSession {
    this.pruneExpired()

    const session: AuthSession = {
      id: crypto.randomUUID(),
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    }

    this.sessions.set(session.id, session)
    return session
  }

  getSession(sessionId: string): AuthSession | undefined {
    const session = this.sessions.get(sessionId)

    if (!session || session.expiresAt.getTime() <= Date.now()) {
      this.sessions.delete(sessionId)
      return undefined
    }

    return session
  }

  getUser(userId: string): AuthUser | undefined {
    return this.users.get(userId)
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId)
  }

  private pruneExpired(): void {
    const now = Date.now()

    for (const [sessionId, session] of this.sessions) {
      if (session.expiresAt.getTime() <= now) {
        this.sessions.delete(sessionId)
      }
    }
  }
}

export const normalizePseudo = (pseudo: string): string => pseudo.trim().toLowerCase()
