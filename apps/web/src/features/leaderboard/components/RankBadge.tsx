import { CrownIcon, MedalIcon } from 'lucide-react'

import { m } from '@/paraglide/messages'

export function RankBadge({ rank }: { rank: number }) {
  switch (rank) {
    case 1:
      return (
        <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <CrownIcon className="size-5" aria-label={m.leaderboard_rank_first()} />
        </span>
      )
    case 2:
      return (
        <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          <MedalIcon className="size-5" aria-label={m.leaderboard_rank_second()} />
        </span>
      )
    case 3:
      return (
        <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <MedalIcon className="size-5" aria-label={m.leaderboard_rank_third()} />
        </span>
      )
    default:
      return (
        <span className="text-center text-sm font-black tabular-nums text-muted-foreground">
          {rank}
        </span>
      )
  }
}
