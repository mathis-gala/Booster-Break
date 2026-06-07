import type { PokemonLeaderboardResponse } from '@tcg-collection/shared'
import type { LeaderboardRepository } from './leaderboard-repository'

export interface LeaderboardServiceOptions {
  leaderboardRepository: LeaderboardRepository
}

export class LeaderboardService {
  constructor(private readonly options: LeaderboardServiceOptions) {}

  async getLeaderboard(): Promise<PokemonLeaderboardResponse> {
    return this.options.leaderboardRepository.getLeaderboard()
  }
}
