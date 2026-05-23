import { useState } from 'react'
import type { CollectionSort, UserCollectionCard } from '@tcg-collection/shared'

import { Button } from '@/components/ui/button'
import { formatRarity } from '@/features/i18n/rarity-labels'
import { m } from '@/paraglide/messages'
import { FoilCardImage } from './FoilCardImage'

interface CollectionPanelProps {
  cards: UserCollectionCard[]
  isPending: boolean
  fitContent?: boolean
  page: number
  pageCount: number
  total: number
  totalCards: number
  sort: CollectionSort
  onSortChange: (sort: CollectionSort) => void
  onPageChange: (page: number) => void
}

const getSortActions = (): Array<{ label: string; value: CollectionSort }> => [
  {
    label: m.sort_recent(),
    value: 'recent',
  },
  {
    label: m.sort_quantity(),
    value: 'quantity',
  },
  {
    label: m.sort_name(),
    value: 'name',
  },
  {
    label: m.sort_rarity(),
    value: 'rarity',
  },
]

export function CollectionPanel({
  cards,
  isPending,
  fitContent = false,
  page,
  pageCount,
  total,
  totalCards,
  sort,
  onSortChange,
  onPageChange,
}: CollectionPanelProps) {
  const [selectedCard, setSelectedCard] = useState<UserCollectionCard>()
  const sortActions = getSortActions()

  return (
    <>
      <section
        className={
          fitContent
            ? 'w-full max-w-6xl rounded-lg border bg-card p-4'
            : 'min-w-0 rounded-lg border bg-card p-4'
        }
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black">{m.collection_title()}</h2>
            <p className="text-sm text-muted-foreground">
              {m.collection_summary({ totalCards, total })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {sortActions.map((action) => (
              <Button
                key={action.value}
                type="button"
                variant={sort === action.value ? 'default' : 'outline'}
                className="h-9"
                onClick={() => onSortChange(action.value)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
        {isPending ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-44 rounded-lg bg-muted" />
            ))}
          </div>
        ) : cards.length > 0 ? (
          <div className="mt-4 flex min-h-[39rem] min-w-0 max-w-full flex-wrap content-start justify-center gap-3">
            {cards.map((card) => (
              <article
                key={`${card.id}-${card.finish ?? 'normal'}`}
                className="w-28 rounded-lg border bg-background p-2"
              >
                <button
                  type="button"
                  className="relative w-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setSelectedCard(card)}
                  aria-label={m.packs_view_card_aria({ name: card.name })}
                >
                  {card.imageSmall ? (
                    <FoilCardImage
                      src={card.imageSmall}
                      alt={card.name}
                      finish={card.finish}
                      className="aspect-[63/88] w-full rounded-md object-cover transition-transform hover:-translate-y-0.5"
                    />
                  ) : (
                    <div className="aspect-[63/88] rounded-md bg-muted" aria-hidden="true" />
                  )}
                </button>
                <div className="mt-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-xs font-black">{card.name}</h3>
                    <p className="truncate text-[0.68rem] font-semibold text-muted-foreground">
                      {card.rarity ? formatRarity(card.rarity) : card.number}
                    </p>
                  </div>
                  <span className="rounded-md bg-sidebar px-1.5 py-0.5 text-[0.66rem] font-black text-sidebar-foreground">
                    {card.quantity}x
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border bg-background p-4 text-sm font-semibold text-muted-foreground">
            {m.collection_empty()}
          </div>
        )}
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-10 w-24 justify-self-start"
            disabled={page <= 1 || isPending}
            onClick={() => onPageChange(Math.max(page - 1, 1))}
          >
            {m.packs_previous()}
          </Button>
          <p className="text-sm font-black tabular-nums text-muted-foreground">
            {page} / {pageCount}
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-24 justify-self-end"
            disabled={page >= pageCount || isPending}
            onClick={() => onPageChange(Math.min(page + 1, pageCount))}
          >
            {m.packs_next()}
          </Button>
        </div>
      </section>
      {selectedCard ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={selectedCard.name}
          onClick={() => setSelectedCard(undefined)}
        >
          <div
            className="relative flex max-h-[95vh] w-[min(28rem,92vw)] items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            {(selectedCard.imageLarge ?? selectedCard.imageSmall) ? (
              <FoilCardImage
                src={selectedCard.imageLarge ?? selectedCard.imageSmall ?? ''}
                alt={selectedCard.name}
                finish={selectedCard.finish}
                className="max-h-[95vh] w-full object-contain drop-shadow-2xl"
              />
            ) : (
              <div className="aspect-[63/88] w-full rounded-lg bg-muted" aria-hidden="true" />
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
