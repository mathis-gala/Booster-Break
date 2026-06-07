import type { ComponentType, SVGProps } from 'react'
import type { LeaderboardPlayer } from '@tcg-collection/shared'

import type { LeaderboardKind } from '../lib/leaderboard-config'
import { LeaderboardList } from './LeaderboardList'
import { LeaderboardSelector } from './LeaderboardSelector'

interface LeaderboardPanelProps {
  title: string
  description: string
  scoreLabel: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  players: LeaderboardPlayer[]
  isPending: boolean
  getScore: (player: LeaderboardPlayer) => number
  numberFormatter: Intl.NumberFormat
  activeLeaderboard: LeaderboardKind
  onLeaderboardChange: (leaderboard: LeaderboardKind) => void
}

export function LeaderboardPanel({
  title,
  description,
  scoreLabel,
  icon: Icon,
  players,
  isPending,
  getScore,
  numberFormatter,
  activeLeaderboard,
  onLeaderboardChange,
}: LeaderboardPanelProps) {
  return (
    <section className="rounded-lg border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Icon className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-black">{title}</h2>
            <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>
        <LeaderboardSelector
          activeLeaderboard={activeLeaderboard}
          onLeaderboardChange={onLeaderboardChange}
        />
      </div>

      {isPending ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-16 rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <LeaderboardList
          players={players}
          scoreLabel={scoreLabel}
          getScore={getScore}
          numberFormatter={numberFormatter}
        />
      )}
    </section>
  )
}
