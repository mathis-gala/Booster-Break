import { ChevronDownIcon } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { m } from '@/paraglide/messages'
import {
  getLeaderboardConfig,
  leaderboardOptions,
  type LeaderboardKind,
} from '../lib/leaderboard-config'

interface LeaderboardSelectorProps {
  activeLeaderboard: LeaderboardKind
  onLeaderboardChange: (leaderboard: LeaderboardKind) => void
}

export function LeaderboardSelector({
  activeLeaderboard,
  onLeaderboardChange,
}: LeaderboardSelectorProps) {
  const activeLabel = getLeaderboardConfig(activeLeaderboard).title

  return (
    <div className="w-full sm:w-64">
      <p className="mb-2 text-xs font-black uppercase tracking-wide text-muted-foreground">
        {m.leaderboard_select_label()}
      </p>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          aria-label={m.leaderboard_select_label()}
          className="flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border bg-background px-3 text-left text-sm font-black text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="truncate">{activeLabel}</span>
          <ChevronDownIcon className="size-4 shrink-0" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} className="w-64">
          <DropdownMenuRadioGroup
            value={activeLeaderboard}
            onValueChange={(nextLeaderboard) =>
              onLeaderboardChange(nextLeaderboard as LeaderboardKind)
            }
          >
            {leaderboardOptions.map((leaderboardOption) => {
              const optionConfig = getLeaderboardConfig(leaderboardOption)

              return (
                <DropdownMenuRadioItem
                  key={leaderboardOption}
                  value={leaderboardOption}
                  closeOnClick
                  label={optionConfig.title}
                  className="min-h-10 cursor-pointer px-2.5 font-bold"
                >
                  <span>{optionConfig.title}</span>
                </DropdownMenuRadioItem>
              )
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
