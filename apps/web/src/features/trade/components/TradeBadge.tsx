import type { CSSProperties, ReactNode } from 'react'

import { getFinishRank, getRarityRank, type TradeAuctionStatus } from '@tcg-collection/shared'

import { cn } from '@/lib/utils'

type TradeBadgeKind = 'status' | 'set' | 'rarity' | 'type' | 'finish' | 'default'

interface TradeBadgeProps {
  children: ReactNode
  kind?: TradeBadgeKind
  value?: string
  className?: string
}

interface TradeBadgeStyle {
  className: string
  style?: CSSProperties
}

const statusStyles: Record<TradeAuctionStatus, string> = {
  active: 'border-emerald-500/70 bg-emerald-500/15 text-emerald-500',
  accepted: 'border-blue-500/70 bg-blue-500/15 text-blue-500',
  cancelled: 'border-rose-500/70 bg-rose-500/15 text-rose-500',
  expired: 'border-amber-500/70 bg-amber-500/15 text-amber-500',
}

const finishPalette = [
  'border-slate-500/70 bg-slate-500/15 text-slate-500',
  'border-sky-500/70 bg-sky-500/15 text-sky-500',
  'border-violet-500/70 bg-violet-500/15 text-violet-500',
]

const rarityBaseHues = [205, 150, 120, 95, 60, 35, 12]

const getHash = (value: string): number => {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash)
  }

  return Math.abs(hash)
}

const getHashStyle = (value: string): TradeBadgeStyle => {
  const hue = getHash(value) % 360
  return {
    className: 'border',
    style: {
      borderColor: `hsl(${hue} 70% 45%)`,
      backgroundColor: `hsl(${hue} 85% 94%)`,
      color: `hsl(${hue} 70% 32%)`,
    },
  }
}

const getRarityStyle = (value = ''): TradeBadgeStyle => {
  const rank = getRarityRank(value)
  const normalized = Math.max(1, Math.min(10, Math.floor(rank / 10)))
  const hue =
    (rarityBaseHues[Math.max(0, Math.min(rarityBaseHues.length - 1, normalized - 1))] ?? 205) +
    (getHash(value) % 18)
  const clampedHue = ((hue % 360) + 360) % 360

  return {
    className: 'border',
    style: {
      borderColor: `hsl(${clampedHue} 70% 45%)`,
      backgroundColor: `hsl(${clampedHue} 85% 93%)`,
      color: `hsl(${clampedHue} 70% 32%)`,
    },
  }
}

const getFinishStyle = (value = ''): TradeBadgeStyle => {
  const index = Math.max(
    0,
    Math.min(finishPalette.length - 1, Math.floor(getFinishRank(value) / 10) - 1),
  )
  return { className: finishPalette[index] }
}

export function TradeBadge({ children, kind = 'default', value = '', className }: TradeBadgeProps) {
  const resolved = (() => {
    if (kind === 'status') {
      return {
        className: statusStyles[(value as TradeAuctionStatus) ?? 'active'] ?? statusStyles.expired,
      }
    }

    if (kind === 'rarity') {
      return getRarityStyle(value)
    }

    if (kind === 'finish') {
      return getFinishStyle(value)
    }

    if (value.trim().length > 0) {
      return getHashStyle(value)
    }

    return { className: 'border-border bg-muted/40 text-muted-foreground' }
  })()

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-black',
        kind === 'status' ? 'font-medium' : '',
        resolved.className,
        className,
      )}
      style={resolved.style}
    >
      {children}
    </span>
  )
}

export type { TradeBadgeKind }
