import { memo } from 'react'
import type { ReactNode } from 'react'
import type { UserCollectionCard } from '@tcg-collection/shared'

import { cn } from '@/lib/utils'
import { formatRarity } from '@/features/i18n/rarity-labels'
import { formatCardFinish } from '../lib/card-format'
import { FoilCardImage } from './FoilCardImage'

interface CollectionCardItemProps {
  card: UserCollectionCard
  setName?: string
  selected?: boolean
  onSelect?: () => void
  onImageClick?: () => void
  badge?: ReactNode
  className?: string
  children?: ReactNode
}

export const CollectionCardItem = memo(function CollectionCardItem({
  card,
  setName,
  selected = false,
  onSelect,
  onImageClick,
  badge,
  className,
  children,
}: CollectionCardItemProps) {
  const meta = [
    card.rarity ? formatRarity(card.rarity) : card.number,
    formatCardFinish(card.finish),
  ].filter(Boolean)

  const content = (
    <article className="relative">
      <div className="relative">
        {onImageClick ? (
          <button
            type="button"
            className="block w-full cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={(event) => {
              event.stopPropagation()
              onImageClick()
            }}
          >
            {card.imageSmall ? (
              <FoilCardImage
                src={card.imageSmall}
                alt={card.name}
                finish={card.finish}
                className="aspect-63/88 w-full rounded-md object-cover transition-transform hover:-translate-y-0.5"
              />
            ) : (
              <div className="aspect-63/88 w-full rounded-md bg-muted" aria-hidden="true" />
            )}
          </button>
        ) : card.imageSmall ? (
          <FoilCardImage
            src={card.imageSmall}
            alt={card.name}
            finish={card.finish}
            className="aspect-63/88 w-full rounded-md object-cover transition-transform hover:-translate-y-0.5"
          />
        ) : (
          <div className="aspect-63/88 w-full rounded-md bg-muted" aria-hidden="true" />
        )}
        {badge ? (
          <span className="absolute right-1 top-1 rounded-full bg-sidebar px-1.5 py-0.5 text-[0.62rem] font-black text-sidebar-foreground">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="mt-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[0.66rem] font-black">{card.name}</p>
          <p className="truncate text-[0.62rem] font-semibold text-muted-foreground">
            {meta.length > 0 ? meta.join(' · ') : null}
          </p>
          {setName ? (
            <p className="truncate text-[0.58rem] font-semibold text-muted-foreground">
              {setName}
            </p>
          ) : null}
        </div>
        <span className="rounded-md bg-sidebar px-1.5 py-0.5 text-[0.62rem] font-black text-sidebar-foreground">
          {card.quantity}x
        </span>
      </div>
      {children}
    </article>
  )

  if (onSelect) {
    return (
      <button
        type="button"
        className={cn(
          'w-28 cursor-pointer rounded-lg border border-border bg-background p-2 text-left',
          'enabled:hover:border-sidebar enabled:hover:bg-sidebar/5 focus-visible:ring-2 focus-visible:ring-ring',
          selected ? 'border-sidebar ring-2 ring-sidebar' : null,
          className,
        )}
        onClick={onSelect}
      >
        {content}
      </button>
    )
  }

  return (
    <article
      className={cn(
        'w-28 rounded-lg border border-border bg-background p-2',
        selected ? 'border-sidebar ring-2 ring-sidebar' : null,
        className,
      )}
    >
      {content}
    </article>
  )
})
