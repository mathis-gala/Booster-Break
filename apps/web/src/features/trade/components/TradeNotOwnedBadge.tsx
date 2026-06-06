import { BookOpenIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'

interface TradeNotOwnedBadgeProps {
  className?: string
}

export function TradeNotOwnedBadge({ className }: TradeNotOwnedBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-black uppercase tracking-wide text-amber-950 shadow',
        className,
      )}
    >
      <BookOpenIcon className="size-3" aria-hidden="true" />
      {m.trade_card_not_owned()}
    </span>
  )
}
