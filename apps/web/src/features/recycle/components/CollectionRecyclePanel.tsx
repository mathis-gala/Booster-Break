import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { CollectionSort } from '@tcg-collection/shared'
import { RECYCLE_COST } from '@tcg-collection/shared'

import { CollectionPanel } from '@/features/dashboard/components/CollectionPanel'
import { matchesCardNameSearch } from '@/features/dashboard/lib/card-search'
import { usePokemonCollectionAllQueryOption } from '@/lib/queries/pokemon'
import { m } from '@/paraglide/messages'

import { RecycleActionBar } from './RecycleActionBar'
import { RecycleAnimationOverlay } from './RecycleAnimationOverlay'
import { RecycleRaritySections } from './RecycleRaritySections'
import { useRecycleEngine } from '../hooks/useRecycleEngine'
import { groupCardsByRarity, paginateRarityGroups } from '../lib/recycle-utils'

const PAGE_SIZE = 24

/**
 * Recycle mode rendered inside the Collection tab's panel: same chrome (search,
 * sort minus rarity, pagination) but the cards are shown in rarity sections like
 * the standalone Recycle tab. Selection/totals stay global across pages/search.
 */
export function CollectionRecyclePanel() {
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<CollectionSort>('recent')
  const [searchQuery, setSearchQuery] = useState('')

  const collection = useQuery(usePokemonCollectionAllQueryOption({ sort, source: 'owned' }))
  const allCards = useMemo(() => collection.data?.cards ?? [], [collection.data?.cards])

  const engine = useRecycleEngine(allCards)

  const isSearching = searchQuery.trim().length > 0
  const filtered = useMemo(
    () =>
      isSearching ? allCards.filter((card) => matchesCardNameSearch(card, searchQuery)) : allCards,
    [allCards, isSearching, searchQuery],
  )
  const displayGroups = useMemo(() => groupCardsByRarity(filtered), [filtered])
  const { segments, pageCount, currentPage } = paginateRarityGroups(displayGroups, page, PAGE_SIZE)
  const totalCards = useMemo(
    () => filtered.reduce((count, card) => count + card.quantity, 0),
    [filtered],
  )

  return (
    <>
      <CollectionPanel
        cards={filtered}
        isPending={collection.isPending}
        fitContent
        page={currentPage}
        pageCount={pageCount}
        total={filtered.length}
        totalCards={totalCards}
        sort={sort}
        searchQuery={searchQuery}
        hideRaritySort
        title={m.recycle_title()}
        subtitle={m.recycle_description({ cost: RECYCLE_COST })}
        toolbar={
          <RecycleActionBar
            selectedCount={engine.selectedCount}
            rewardCount={engine.rewardCount}
            autoSurplus={engine.autoSurplus}
            isBusy={engine.isBusy}
            onUnselectAll={engine.clearSelection}
            onAuto={engine.handleAuto}
            onRecycle={engine.handleRecycle}
          />
        }
        renderGrid={() => (
          <RecycleRaritySections
            segments={segments}
            selection={engine.selection}
            onChange={engine.updateSelection}
            rewardForRank={engine.rewardForRank}
          />
        )}
        onSortChange={(nextSort) => {
          setSort(nextSort)
          setPage(1)
        }}
        onSearchChange={(nextSearchQuery) => {
          setSearchQuery(nextSearchQuery)
          setPage(1)
        }}
        onPageChange={setPage}
      />

      {engine.animation ? (
        <RecycleAnimationOverlay
          batches={engine.animation.batches}
          rewards={engine.animation.rewards}
          setNameById={engine.setNameById}
          onClose={engine.closeAnimation}
        />
      ) : null}
    </>
  )
}
