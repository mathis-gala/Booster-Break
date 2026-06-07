import { describe, expect, test } from 'bun:test'
import { Elysia } from 'elysia'
import { createLeaderboardController } from '../../src/leaderboard/leaderboard-controller'
import type { LeaderboardService } from '../../src/leaderboard/leaderboard-service'

describe('leaderboard routes', () => {
  test('returns the public leaderboard rankings', async () => {
    const service = {
      getLeaderboard: async () => ({
        mostCards: [
          {
            userId: 'player-1',
            name: 'Player One',
            avatarUrl: 'https://example.com/player-one.png',
            totalCards: 42,
            uniqueCards: 12,
          },
        ],
        mostUniqueCards: [
          {
            userId: 'player-2',
            name: 'Player Two',
            totalCards: 30,
            uniqueCards: 20,
          },
        ],
      }),
    } as LeaderboardService
    const app = new Elysia().use(createLeaderboardController({ service }))

    const response = await app.handle(new Request('http://localhost/pokemon/leaderboard'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      mostCards: [
        {
          userId: 'player-1',
          name: 'Player One',
          avatarUrl: 'https://example.com/player-one.png',
          totalCards: 42,
          uniqueCards: 12,
        },
      ],
      mostUniqueCards: [
        {
          userId: 'player-2',
          name: 'Player Two',
          totalCards: 30,
          uniqueCards: 20,
        },
      ],
    })
  })
})
