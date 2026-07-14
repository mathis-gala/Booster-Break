import type { AuthSession, AuthUser } from './types'

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14

export interface AuthStore {
  upsertSlackUser(input: SlackUserInput): AuthUser | Promise<AuthUser>
  upsertCustomUser(input: CustomUserInput): AuthUser | Promise<AuthUser>
  upsertGithubUser(input: GithubUserInput): AuthUser | Promise<AuthUser>
  findUserByEmail(email: string): AuthUser | undefined | Promise<AuthUser | undefined>
  createSession(userId: string): AuthSession | Promise<AuthSession>
  getSession(sessionId: string): AuthSession | undefined | Promise<AuthSession | undefined>
  getUser(userId: string): AuthUser | undefined | Promise<AuthUser | undefined>
  deleteSession(sessionId: string): void | Promise<void>
  createMagicLoginToken(
    input: CreateMagicLoginTokenInput,
  ): AuthMagicLoginToken | Promise<AuthMagicLoginToken>
  findMagicLoginTokenByHash(
    tokenHash: string,
  ): AuthMagicLoginToken | undefined | Promise<AuthMagicLoginToken | undefined>
  markMagicLoginTokenUsed(tokenHash: string): boolean | Promise<boolean>
}

export interface SlackUserInput {
  slackUserId: string
  slackTeamId?: string
  pseudo: string
  displayName?: string
  avatarUrl?: string
}

export interface GithubUserInput {
  githubUserId: string
  login: string
  name?: string
  avatarUrl?: string
  /** Verified primary email from GitHub, when available. Used to link existing accounts. */
  email?: string
}

export interface CustomUserInput {
  pseudo: string
  displayName?: string
  avatarUrl?: string
}

export interface CreateMagicLoginTokenInput {
  tokenHash: string
  userId: string
  expiresAt: Date
  createdBy?: string
}

export interface AuthMagicLoginToken {
  id: string
  tokenHash: string
  userId: string
  expiresAt: Date
  usedAt?: Date
  createdAt: Date
  createdBy?: string
}

export class MemoryAuthStore implements AuthStore {
  private readonly sessions = new Map<string, AuthSession>()
  private readonly users = new Map<string, AuthUser>()
  private readonly usersBySlackId = new Map<string, string>()
  private readonly usersByGithubId = new Map<string, string>()
  private readonly userIdsByEmail = new Map<string, string>()
  private readonly magicLoginTokens = new Map<string, AuthMagicLoginToken>()
  private readonly magicLoginTokenIdsByHash = new Map<string, string>()

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

  upsertCustomUser(input: CustomUserInput): AuthUser {
    return this.upsertSlackUser({
      slackUserId: `custom:${normalizePseudo(input.pseudo)}`,
      pseudo: input.pseudo,
      displayName: input.displayName,
      avatarUrl: input.avatarUrl,
    })
  }

  upsertGithubUser(input: GithubUserInput): AuthUser {
    const existingByGithubId = this.usersByGithubId.get(input.githubUserId)
    const existingByEmail = input.email ? this.userIdsByEmail.get(input.email) : undefined
    const existingUserId = existingByGithubId ?? existingByEmail
    const existing = existingUserId ? this.users.get(existingUserId) : undefined
    const displayName = input.name ?? input.login

    const user: AuthUser = {
      id: existing?.id ?? crypto.randomUUID(),
      pseudo: existing?.pseudo ?? normalizePseudo(input.login),
      displayName,
      avatarUrl: input.avatarUrl,
    }

    this.users.set(user.id, user)
    this.usersByGithubId.set(input.githubUserId, user.id)

    if (input.email) {
      this.userIdsByEmail.set(input.email, user.id)
    }

    return user
  }

  findUserByEmail(email: string): AuthUser | undefined {
    const userId = this.userIdsByEmail.get(email)

    return userId ? this.users.get(userId) : undefined
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

  createMagicLoginToken(input: CreateMagicLoginTokenInput): AuthMagicLoginToken {
    this.pruneExpired()

    const token: AuthMagicLoginToken = {
      id: crypto.randomUUID(),
      tokenHash: input.tokenHash,
      userId: input.userId,
      expiresAt: input.expiresAt,
      createdAt: new Date(),
      createdBy: input.createdBy,
    }

    this.magicLoginTokens.set(token.id, token)
    this.magicLoginTokenIdsByHash.set(token.tokenHash, token.id)

    return token
  }

  findMagicLoginTokenByHash(tokenHash: string): AuthMagicLoginToken | undefined {
    const tokenId = this.magicLoginTokenIdsByHash.get(tokenHash)

    if (!tokenId) {
      return undefined
    }

    const token = this.magicLoginTokens.get(tokenId)

    if (!token) {
      this.magicLoginTokenIdsByHash.delete(tokenHash)
      return undefined
    }

    if (token.expiresAt.getTime() <= Date.now()) {
      this.deleteMagicLoginToken(token)
      return undefined
    }

    return token
  }

  markMagicLoginTokenUsed(tokenHash: string): boolean {
    const tokenId = this.magicLoginTokenIdsByHash.get(tokenHash)

    if (!tokenId) {
      return false
    }

    const token = this.magicLoginTokens.get(tokenId)

    if (!token) {
      this.magicLoginTokenIdsByHash.delete(tokenHash)
      return false
    }

    if (token.usedAt || token.expiresAt.getTime() <= Date.now()) {
      this.deleteMagicLoginToken(token)
      return false
    }

    token.usedAt = new Date()
    return true
  }

  private pruneExpired(): void {
    const now = Date.now()

    for (const [sessionId, session] of this.sessions) {
      if (session.expiresAt.getTime() <= now) {
        this.sessions.delete(sessionId)
      }
    }

    for (const token of this.magicLoginTokens.values()) {
      if (token.expiresAt.getTime() <= now || token.usedAt?.getTime()) {
        this.deleteMagicLoginToken(token)
      }
    }
  }

  private deleteMagicLoginToken(token: AuthMagicLoginToken): void {
    this.magicLoginTokens.delete(token.id)
    this.magicLoginTokenIdsByHash.delete(token.tokenHash)
  }
}

export const normalizePseudo = (pseudo: string): string => pseudo.trim().toLowerCase()
