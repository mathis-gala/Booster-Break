import { Elysia } from 'elysia'
import { LeaderboardRepository } from './leaderboard-repository'
import { LeaderboardService } from './leaderboard-service'
import type { AppPrisma } from '../db/prisma'

interface LeaderboardControllerOptions {
  db?: AppPrisma
  repository?: LeaderboardRepository
  service?: LeaderboardService
}

export const createLeaderboardController = ({
  db,
  repository,
  service,
}: LeaderboardControllerOptions) => {
  const leaderboardRepository = repository ?? new LeaderboardRepository(mustProvideDb(db, service))
  const leaderboardService = service ?? new LeaderboardService({ leaderboardRepository })

  return new Elysia({ prefix: '/pokemon/leaderboard' }).get('/', async () =>
    leaderboardService.getLeaderboard(),
  )
}

const mustProvideDb = (db: AppPrisma | undefined, service: LeaderboardService | undefined) => {
  if (!db && !service) {
    throw new Error('createLeaderboardController requires db, repository, or service')
  }

  return db!
}
