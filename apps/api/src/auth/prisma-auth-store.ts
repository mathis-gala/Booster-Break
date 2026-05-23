import type { AppPrisma } from '../db/prisma'
import type { AuthSession, AuthUser } from './types'
import { normalizePseudo, type AuthStore, type SlackUserInput } from './session-store'

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
