import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { RECYCLE_COST } from '@tcg-collection/shared'

import { useLocale } from '@/features/i18n/useLocale'
import { usePokemonCollectionAllQueryOption } from '@/lib/queries/pokemon'
import { m } from '@/paraglide/messages'

import { RecycleActionBar } from './RecycleActionBar'
import { RecycleAnimationOverlay } from './RecycleAnimationOverlay'
import { RecycleRaritySections } from './RecycleRaritySections'
import { useRecycleEngine } from '../hooks/useRecycleEngine'
import { paginateRarityGroups } from '../lib/recycle-utils'

/** Cards rendered per page — keeps the DOM light on large collections. */
const PAGE_SIZE = 18

interface RecyclePanelProps {
  /** Show the title + description header (the standalone Recycle tab). */
  showHeader?: boolean
}

export function RecyclePanel({ showHeader = true }: RecyclePanelProps) {
  useLocale()
  const [page, setPage] = useState(1)

  const collection = useQuery(
    usePokemonCollectionAllQueryOption({ sort: 'rarity', source: 'owned' }),
  )
  const cards = collection.data?.cards ?? []

  const engine = useRecycleEngine(cards)
  const { segments, pageCount, currentPage } = paginateRarityGroups(engine.groups, page, PAGE_SIZE)
  const hasRecyclableCards = engine.groups.length > 0

  return (
    <div className="flex w-full flex-col gap-5">
      {showHeader ? (
        <header className="flex flex-col gap-1">
          <h1 className="text-xl font-black">{m.recycle_title()}</h1>
          <p className="max-w-2xl text-sm font-medium text-muted-foreground">
            {m.recycle_description({ cost: RECYCLE_COST })}
          </p>
        </header>
      ) : null}

      <RecycleActionBar
        className="sticky top-16 z-10 md:top-3"
        selectedCount={engine.selectedCount}
        rewardCount={engine.rewardCount}
        autoSurplus={engine.autoSurplus}
        isBusy={engine.isBusy}
        onUnselectAll={engine.clearSelection}
        onAuto={engine.handleAuto}
        onRecycle={engine.handleRecycle}
      />

      {collection.isPending ? (
        <p className="py-12 text-center text-sm font-medium text-muted-foreground">
          {m.recycle_loading()}
        </p>
      ) : !hasRecyclableCards ? (
        <p className="py-12 text-center text-sm font-medium text-muted-foreground">
          {m.recycle_empty()}
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          <RecycleRaritySections
            segments={segments}
            selection={engine.selection}
            onChange={engine.updateSelection}
            rewardForRank={engine.rewardForRank}
          />

          {pageCount > 1 ? (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={currentPage <= 1}
                aria-label={m.packs_previous()}
                className="flex size-9 items-center justify-center rounded-lg border border-border bg-background transition-colors enabled:cursor-pointer enabled:hover:border-sidebar disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeftIcon className="size-4" aria-hidden="true" />
              </button>
              <span className="text-sm font-black tabular-nums">
                {currentPage} / {pageCount}
              </span>
              <button
                type="button"
                disabled={currentPage >= pageCount}
                aria-label={m.packs_next()}
                className="flex size-9 items-center justify-center rounded-lg border border-border bg-background transition-colors enabled:cursor-pointer enabled:hover:border-sidebar disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setPage(currentPage + 1)}
              >
                <ChevronRightIcon className="size-4" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      )}

      {engine.animation ? (
        <RecycleAnimationOverlay
          batches={engine.animation.batches}
          rewards={engine.animation.rewards}
          setNameById={engine.setNameById}
          onClose={engine.closeAnimation}
        />
      ) : null}
    </div>
  )
}
