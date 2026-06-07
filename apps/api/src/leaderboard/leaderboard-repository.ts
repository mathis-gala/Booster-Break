import type { LeaderboardPlayer, PokemonLeaderboardResponse } from '@tcg-collection/shared'
import type { AppPrisma } from '../db/prisma'

interface LeaderboardPlayerAccumulator {
  userId: string
  name: string
  avatarUrl?: string
  totalCards: number
  uniqueCardIds: Set<string>
}

export class LeaderboardRepository {
  constructor(private readonly db: AppPrisma) {}

  async getLeaderboard(limit = 10): Promise<PokemonLeaderboardResponse> {
    const where = {
      quantity: {
        gt: 0,
      },
    }

    const [ownedRows, giftedRows] = await Promise.all([
      this.db.userCard.findMany({
        where,
        include: {
          user: true,
        },
      }),
      this.db.giftedUserCard.findMany({
        where,
        include: {
          user: true,
        },
      }),
    ])

    const players = new Map<string, LeaderboardPlayerAccumulator>()

    for (const row of [...ownedRows, ...giftedRows]) {
      const player = players.get(row.userId) ?? {
        userId: row.userId,
        name: row.user.displayName ?? row.user.pseudo,
        avatarUrl: row.user.avatarUrl ?? undefined,
        totalCards: 0,
        uniqueCardIds: new Set<string>(),
      }

      player.totalCards += row.quantity
      player.uniqueCardIds.add(row.cardId)
      players.set(row.userId, player)
    }

    const rankedPlayers = [...players.values()].map((player) => ({
      userId: player.userId,
      name: player.name,
      avatarUrl: player.avatarUrl,
      totalCards: player.totalCards,
      uniqueCards: player.uniqueCardIds.size,
    }))

    const byTotalCards = [...rankedPlayers].sort((first, second) =>
      compareLeaderboardPlayers(first, second, 'totalCards'),
    )
    const byUniqueCards = [...rankedPlayers].sort((first, second) =>
      compareLeaderboardPlayers(first, second, 'uniqueCards'),
    )

    return {
      mostCards: byTotalCards.slice(0, limit),
      mostUniqueCards: byUniqueCards.slice(0, limit),
    }
  }
}

const compareLeaderboardPlayers = (
  first: LeaderboardPlayer,
  second: LeaderboardPlayer,
  scoreKey: 'totalCards' | 'uniqueCards',
): number => {
  const scoreDelta = second[scoreKey] - first[scoreKey]

  if (scoreDelta !== 0) {
    return scoreDelta
  }

  const secondaryKey = scoreKey === 'totalCards' ? 'uniqueCards' : 'totalCards'
  const secondaryDelta = second[secondaryKey] - first[secondaryKey]

  if (secondaryDelta !== 0) {
    return secondaryDelta
  }

  return first.name.localeCompare(second.name)
}
