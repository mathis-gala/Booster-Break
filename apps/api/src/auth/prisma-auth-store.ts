import type { AppPrisma } from '../db/prisma'
import type { AuthSession, AuthUser } from './types'
import {
  normalizePseudo,
  type AuthMagicLoginToken,
  type AuthStore,
  type CreateMagicLoginTokenInput,
  type CustomUserInput,
  type SlackUserInput,
} from './session-store'

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14

export class PrismaAuthStore implements AuthStore {
  constructor(private readonly db: AppPrisma) {}

  async upsertSlackUser(input: SlackUserInput): Promise<AuthUser> {
    const user = await this.db.user.upsert({
      where: {
        slackUserId: input.slackUserId,
      },
      create: {
        id: crypto.randomUUID(),
        pseudo: normalizePseudo(input.pseudo),
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
        slackUserId: input.slackUserId,
        slackTeamId: input.slackTeamId,
      },
      update: {
        pseudo: normalizePseudo(input.pseudo),
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
        slackTeamId: input.slackTeamId,
      },
    })

    return toUser(user)
  }

  async upsertCustomUser(input: CustomUserInput): Promise<AuthUser> {
    const normalizedPseudo = normalizePseudo(input.pseudo)

    const user = await this.db.user.upsert({
      where: {
        slackUserId: `custom:${normalizedPseudo}`,
      },
      create: {
        id: crypto.randomUUID(),
        pseudo: normalizedPseudo,
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
        slackUserId: `custom:${normalizedPseudo}`,
      },
      update: {
        pseudo: normalizedPseudo,
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
      },
    })

    return toUser(user)
  }

  async createSession(userId: string): Promise<AuthSession> {
    const session = await this.db.session.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    })

    return {
      id: session.id,
      userId: session.userId,
      expiresAt: session.expiresAt,
    }
  }

  async getSession(sessionId: string): Promise<AuthSession | undefined> {
    const session = await this.db.session.findUnique({
      where: {
        id: sessionId,
      },
    })

    if (!session) {
      return undefined
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await this.deleteSession(sessionId)
      return undefined
    }

    return {
      id: session.id,
      userId: session.userId,
      expiresAt: session.expiresAt,
    }
  }

  async getUser(userId: string): Promise<AuthUser | undefined> {
    const user = await this.db.user.findUnique({
      where: {
        id: userId,
      },
    })

    return user ? toUser(user) : undefined
  }

  async createMagicLoginToken(input: CreateMagicLoginTokenInput): Promise<AuthMagicLoginToken> {
    const token = await this.db.magicLoginToken.create({
      data: {
        id: crypto.randomUUID(),
        tokenHash: input.tokenHash,
        userId: input.userId,
        expiresAt: input.expiresAt,
        createdBy: input.createdBy,
      },
    })

    return toMagicLoginToken(token)
  }

  async findMagicLoginTokenByHash(tokenHash: string): Promise<AuthMagicLoginToken | undefined> {
    const token = await this.db.magicLoginToken.findUnique({
      where: {
        tokenHash,
      },
    })

    return token ? toMagicLoginToken(token) : undefined
  }

  async markMagicLoginTokenUsed(tokenHash: string): Promise<boolean> {
    const result = await this.db.magicLoginToken.updateMany({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      data: {
        usedAt: new Date(),
      },
    })

    return result.count === 1
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.db.session.deleteMany({
      where: {
        id: sessionId,
      },
    })
  }
}

const toUser = (row: {
  id: string
  pseudo: string
  displayName?: string | null
  avatarUrl?: string | null
}): AuthUser => ({
  id: row.id,
  pseudo: row.pseudo,
  displayName: row.displayName ?? undefined,
  avatarUrl: row.avatarUrl ?? undefined,
})

const toMagicLoginToken = (row: {
  id: string
  tokenHash: string
  userId: string
  expiresAt: Date
  usedAt?: Date | null
  createdAt: Date
  createdBy?: string | null
}): AuthMagicLoginToken => ({
  id: row.id,
  tokenHash: row.tokenHash,
  userId: row.userId,
  expiresAt: row.expiresAt,
  usedAt: row.usedAt ?? undefined,
  createdAt: row.createdAt,
  createdBy: row.createdBy ?? undefined,
})
