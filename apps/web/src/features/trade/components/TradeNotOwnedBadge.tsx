import { BookOpenIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'

interface TradeNotOwnedBadgeProps {
  className?: string
  size?: 'default' | 'compact'
}

const badgeSizeClassNames = {
  default: 'gap-1 px-2 py-0.5 text-xs tracking-wide shadow',
  compact: 'gap-0.5 px-1.5 py-0.5 text-[10px] leading-none tracking-normal shadow-sm',
} as const

const iconSizeClassNames = {
  default: 'size-3',
  compact: 'size-2.5',
} as const

export function TradeNotOwnedBadge({ className, size = 'default' }: TradeNotOwnedBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full bg-amber-400 font-black uppercase text-amber-950',
        badgeSizeClassNames[size],
        className,
      )}
    >
      <BookOpenIcon className={iconSizeClassNames[size]} aria-hidden="true" />
      {m.trade_card_not_owned()}
    </span>
  )
}
