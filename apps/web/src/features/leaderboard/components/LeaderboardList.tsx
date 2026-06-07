import { UserIcon } from 'lucide-react'
import type { LeaderboardPlayer } from '@tcg-collection/shared'

import { m } from '@/paraglide/messages'
import { RankBadge } from './RankBadge'

interface LeaderboardListProps {
  players: LeaderboardPlayer[]
  scoreLabel: string
  getScore: (player: LeaderboardPlayer) => number
  numberFormatter: Intl.NumberFormat
}

export function LeaderboardList({
  players,
  scoreLabel,
  getScore,
  numberFormatter,
}: LeaderboardListProps) {
  if (players.length === 0) {
    return (
      <div className="mt-4 rounded-lg border bg-background p-4 text-sm font-semibold text-muted-foreground">
        {m.leaderboard_empty()}
      </div>
    )
  }

  return (
    <ol className="mt-4 space-y-2">
      {players.map((player, index) => (
        <li
          key={player.userId}
          className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 rounded-lg border bg-background p-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto]"
        >
          <RankBadge rank={index + 1} />
          <div className="flex min-w-0 items-center gap-3">
            {player.avatarUrl ? (
              <img
                src={player.avatarUrl}
                alt=""
                className="size-11 shrink-0 rounded-lg object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <UserIcon className="size-5" aria-hidden="true" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-black">{player.name}</p>
            </div>
          </div>
          <div className="col-start-2 text-left sm:col-start-auto sm:text-right">
            <p className="text-lg font-black tabular-nums">
              {numberFormatter.format(getScore(player))}
            </p>
            <p className="text-xs font-bold text-muted-foreground">{scoreLabel}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
