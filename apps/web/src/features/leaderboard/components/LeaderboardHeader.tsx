import { TrophyIcon } from 'lucide-react'

import { m } from '@/paraglide/messages'

export function LeaderboardHeader() {
  return (
    <header className="rounded-lg border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
            {m.leaderboard_eyebrow()}
          </p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">
            {m.leaderboard_title()}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {m.leaderboard_description()}
          </p>
        </div>
        <div className="flex min-h-12 items-center gap-2 rounded-lg bg-secondary px-3 text-secondary-foreground">
          <TrophyIcon className="size-5" aria-hidden="true" />
          <span className="text-sm font-black">{m.nav_leaders()}</span>
        </div>
      </div>
    </header>
  )
}
