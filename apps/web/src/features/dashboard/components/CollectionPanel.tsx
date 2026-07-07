import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDownIcon, SearchIcon } from 'lucide-react'
import type {
  CollectionSetOption,
  CollectionSort,
  UserCollectionCard,
} from '@tcg-collection/shared'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { m } from '@/paraglide/messages'
import { CardImageDialog } from './CardImageDialog'
import { CollectionCardItem } from './CollectionCardItem'

interface CollectionPanelProps {
  cards: UserCollectionCard[]
  isPending: boolean
  fitContent?: boolean
  page: number
  pageCount: number
  total: number
  totalCards: number
  sort: CollectionSort
  searchQuery: string
  sets?: CollectionSetOption[]
  selectedSetId?: string
  onSortChange: (sort: CollectionSort) => void
  onSearchChange: (query: string) => void
  onSetChange?: (setId: string | undefined) => void
  onPageChange: (page: number) => void
  hideRaritySort?: boolean
  toolbar?: ReactNode
  renderCard?: (card: UserCollectionCard) => ReactNode
  renderGrid?: (cards: UserCollectionCard[]) => ReactNode
  title?: ReactNode
  subtitle?: ReactNode
}

interface SortAction {
  label: string
  value: CollectionSort
}

const getSortActions = (hideRaritySort: boolean): SortAction[] => {
  const actions: SortAction[] = [
    { label: m.sort_recent(), value: 'recent' },
    { label: m.sort_quantity(), value: 'quantity' },
    { label: m.sort_name(), value: 'name' },
  ]

  if (!hideRaritySort) {
    actions.push({ label: m.sort_rarity(), value: 'rarity' })
  }

  return actions
}

export function CollectionPanel({
  cards,
  isPending,
  fitContent = false,
  page,
  pageCount,
  total,
  totalCards,
  sort,
  searchQuery,
  sets = [],
  selectedSetId,
  onSortChange,
  onSearchChange,
  onSetChange,
  onPageChange,
  hideRaritySort = false,
  toolbar,
  renderCard,
  renderGrid,
  title,
  subtitle,
}: CollectionPanelProps) {
  const [selectedCard, setSelectedCard] = useState<UserCollectionCard>()
  const sortActions = getSortActions(hideRaritySort)
  const setNameById = useMemo(() => new Map(sets.map((set) => [set.id, set.name])), [sets])
  const activeSet = sets.find((set) => set.id === selectedSetId)
  const setTriggerLabel = activeSet
    ? `${activeSet.name} (${activeSet.count})`
    : m.collection_filter_all_sets()

  return (
    <>
      <section
        className={
          fitContent
            ? 'w-full max-w-6xl rounded-lg border bg-card p-4'
            : 'min-w-0 rounded-lg border bg-card p-4'
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-start gap-x-8 gap-y-4 sm:justify-between">
            <div>
              <h2 className="text-lg font-black">{title ?? m.collection_title()}</h2>
              <p className="text-sm text-muted-foreground">
                {subtitle ?? m.collection_summary({ totalCards, total })}
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-start sm:gap-4">
              <div className="flex w-full flex-col gap-2 sm:h-9 sm:w-auto sm:flex-row sm:items-center sm:overflow-hidden sm:rounded-md sm:border sm:bg-background sm:transition-colors sm:focus-within:border-foreground sm:focus-within:ring-2 sm:focus-within:ring-foreground/15">
                <div className="flex h-9 w-full items-center gap-2 rounded-md border bg-background px-2.5 transition-colors focus-within:border-foreground focus-within:ring-2 focus-within:ring-foreground/15 sm:h-full sm:w-auto sm:flex-none sm:rounded-none sm:border-0 sm:px-0 sm:pl-2.5 sm:focus-within:ring-0">
                  <SearchIcon
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                  <input
                    value={searchQuery}
                    onChange={(event) => onSearchChange(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-xs focus:outline-none sm:w-28"
                    placeholder={m.trade_search_by_pokemon_placeholder()}
                    aria-label={m.trade_search_by_pokemon_aria()}
                  />
                </div>
                {onSetChange ? (
                  <>
                    <div
                      aria-hidden="true"
                      className="hidden h-5 w-px shrink-0 bg-border sm:block"
                    />
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger
                        aria-label={m.collection_filter_set_label()}
                        className="flex h-9 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 sm:h-full sm:w-48 sm:flex-none sm:rounded-l-none sm:rounded-r-md sm:border-0 sm:focus-visible:ring-0"
                      >
                        <span className="truncate">{setTriggerLabel}</span>
                        <ChevronDownIcon
                          aria-hidden="true"
                          className="size-4 shrink-0 text-muted-foreground"
                        />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        sideOffset={6}
                        className="max-h-72 w-auto min-w-(--anchor-width) max-w-64"
                      >
                        <DropdownMenuRadioGroup
                          value={selectedSetId ?? ''}
                          onValueChange={(value) => onSetChange(value || undefined)}
                        >
                          <DropdownMenuRadioItem
                            value=""
                            closeOnClick
                            label={m.collection_filter_all_sets()}
                            className="cursor-pointer focus:bg-muted focus:text-foreground"
                          >
                            {m.collection_filter_all_sets()}
                          </DropdownMenuRadioItem>
                          {sets.map((set) => (
                            <DropdownMenuRadioItem
                              key={set.id}
                              value={set.id}
                              closeOnClick
                              label={`${set.name} (${set.count})`}
                              className="cursor-pointer focus:bg-muted focus:text-foreground"
                            >
                              {set.name} ({set.count})
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : null}
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
          </div>
        </div>
        {toolbar ? <div className="mt-4">{toolbar}</div> : null}
        {isPending ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-44 rounded-lg bg-muted" />
            ))}
          </div>
        ) : cards.length > 0 ? (
          renderGrid ? (
            <div className="mt-4 min-h-[39rem]">{renderGrid(cards)}</div>
          ) : (
            <div className="mt-4 flex min-h-[39rem] min-w-0 max-w-full flex-wrap content-start justify-center gap-3">
              {cards.map((card) =>
                renderCard ? (
                  renderCard(card)
                ) : (
                  <CollectionCardItem
                    key={`${card.id}-${card.finish ?? 'normal'}`}
                    card={card}
                    setName={setNameById.get(card.setId)}
                    onSelect={() => setSelectedCard(card)}
                    className="focus-visible:ring-2 focus-visible:ring-ring"
                  />
                ),
              )}
            </div>
          )
        ) : searchQuery.trim() !== '' ? (
          <div className="mt-4 rounded-lg border bg-background p-4 text-sm font-semibold text-muted-foreground">
            {m.trade_search_no_match()}
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
        <CardImageDialog card={selectedCard} onClose={() => setSelectedCard(undefined)} />
      ) : null}
    </>
  )
}
