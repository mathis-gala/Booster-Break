import { CrownIcon, Layers3Icon } from 'lucide-react'
import type { LeaderboardPlayer } from '@tcg-collection/shared'

import { m } from '@/paraglide/messages'

export type LeaderboardKind = 'mostUniqueCards' | 'mostCards'

export const leaderboardOptions: LeaderboardKind[] = ['mostUniqueCards', 'mostCards']

export const getLeaderboardConfig = (kind: LeaderboardKind) => {
  switch (kind) {
    case 'mostCards':
      return {
        title: m.leaderboard_most_cards_title(),
        description: m.leaderboard_most_cards_description(),
        scoreLabel: m.leaderboard_total_cards_label(),
        icon: Layers3Icon,
        getScore: (player: LeaderboardPlayer) => player.totalCards,
      }
    case 'mostUniqueCards':
      return {
        title: m.leaderboard_most_unique_title(),
        description: m.leaderboard_most_unique_description(),
        scoreLabel: m.leaderboard_unique_cards_label(),
        icon: CrownIcon,
        getScore: (player: LeaderboardPlayer) => player.uniqueCards,
      }
  }
}
