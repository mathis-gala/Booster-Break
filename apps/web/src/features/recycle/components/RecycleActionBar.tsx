import { RecycleIcon, Wand2Icon, XIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'

interface RecycleActionBarProps {
  selectedCount: number
  rewardCount: number
  autoSurplus: number
  isBusy: boolean
  onUnselectAll: () => void
  onAuto: () => void
  onRecycle: () => void
  className?: string
}

export function RecycleActionBar({
  selectedCount,
  rewardCount,
  autoSurplus,
  isBusy,
  onUnselectAll,
  onAuto,
  onRecycle,
  className,
}: RecycleActionBarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/95 p-3 backdrop-blur',
        className,
      )}
    >
      <div className="text-sm font-semibold text-muted-foreground">
        {m.recycle_summary({ selected: selectedCount, rewards: rewardCount })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {selectedCount > 0 ? (
          <button
            type="button"
            disabled={isBusy}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-black transition-colors enabled:hover:border-sidebar disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onUnselectAll}
          >
            <XIcon className="size-4" aria-hidden="true" />
            {m.recycle_unselect_all()}
          </button>
        ) : null}
        <button
          type="button"
          disabled={isBusy || autoSurplus === 0}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-black transition-colors enabled:hover:border-sidebar disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onAuto}
        >
          <Wand2Icon className="size-4" aria-hidden="true" />
          {m.recycle_auto({ count: autoSurplus })}
        </button>
        <button
          type="button"
          disabled={isBusy || rewardCount === 0}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-sidebar px-4 py-2 text-sm font-black text-sidebar-foreground transition-colors enabled:hover:bg-sidebar/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onRecycle}
        >
          <RecycleIcon className="size-4" aria-hidden="true" />
          {isBusy ? m.recycle_action_pending() : m.recycle_action({ count: rewardCount })}
        </button>
      </div>
    </div>
  )
}
