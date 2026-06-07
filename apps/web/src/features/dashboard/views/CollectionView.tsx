import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookOpenIcon, RecycleIcon } from 'lucide-react'
import type { CollectionSort } from '@tcg-collection/shared'

import { CollectionPanel } from '../components/CollectionPanel'
import { CollectionRecyclePanel } from '../../recycle/components/CollectionRecyclePanel'
import { useLocale } from '@/features/i18n/useLocale'
import {
  usePokemonCollectionAllQueryOption,
  usePokemonCollectionQueryOption,
} from '@/lib/queries/pokemon'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { matchesCardNameSearch } from '../lib/card-search'

type CollectionMode = 'browse' | 'recycle'

export function CollectionView() {
  useLocale()
  const [mode, setMode] = useState<CollectionMode>('browse')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<CollectionSort>('recent')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSetId, setSelectedSetId] = useState<string>()
  // Recycle keeps its own search/sort/page, held here so they persist across the
  // browse/recycle toggle (CollectionRecyclePanel unmounts when not in recycle mode).
  const [recyclePage, setRecyclePage] = useState(1)
  const [recycleSort, setRecycleSort] = useState<CollectionSort>('recent')
  const [recycleSearchQuery, setRecycleSearchQuery] = useState('')
  const pageSize = 24
  const isBrowsing = mode === 'browse'
  const isSearching = searchQuery.trim().length > 0
  const collection = useQuery(
    usePokemonCollectionQueryOption(
      {
        page,
        pageSize,
        sort,
        setId: selectedSetId,
      },
      {
        keepPreviousData: true,
        enabled: isBrowsing && !isSearching,
      },
    ),
  )
  const searchableCollection = useQuery(
    usePokemonCollectionAllQueryOption(
      {
        sort,
        setId: selectedSetId,
      },
      {
        enabled: isBrowsing && isSearching,
      },
    ),
  )
  const sets = collection.data?.sets ?? searchableCollection.data?.sets ?? []
  const searchMatches = useMemo(
    () =>
      (searchableCollection.data?.cards ?? []).filter((card) =>
        matchesCardNameSearch(card, searchQuery),
      ),
    [searchQuery, searchableCollection.data?.cards],
  )
  const searchPageCount = Math.max(1, Math.ceil(searchMatches.length / pageSize))
  const searchPage = Math.min(Math.max(page, 1), searchPageCount)
  const searchCards = useMemo(() => {
    const start = (searchPage - 1) * pageSize

    return searchMatches.slice(start, start + pageSize)
  }, [pageSize, searchMatches, searchPage])
  const cards = isSearching ? searchCards : (collection.data?.cards ?? [])
  const total = isSearching ? searchMatches.length : (collection.data?.pagination.total ?? 0)
  const totalCards = isSearching
    ? searchMatches.reduce((count, card) => count + card.quantity, 0)
    : (collection.data?.pagination.totalCards ?? 0)

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <CollectionModeToggle mode={mode} onChange={setMode} />

      {mode === 'recycle' ? (
        <div className="flex w-full justify-center">
          <CollectionRecyclePanel
            page={recyclePage}
            sort={recycleSort}
            searchQuery={recycleSearchQuery}
            onPageChange={setRecyclePage}
            onSortChange={setRecycleSort}
            onSearchChange={setRecycleSearchQuery}
          />
        </div>
      ) : (
        <div className="flex w-full justify-center">
          <CollectionPanel
            cards={cards}
            isPending={isSearching ? searchableCollection.isPending : collection.isPending}
            fitContent
            page={isSearching ? searchPage : (collection.data?.pagination.page ?? page)}
            pageCount={isSearching ? searchPageCount : (collection.data?.pagination.pageCount ?? 1)}
            total={total}
            totalCards={totalCards}
            sort={sort}
            searchQuery={searchQuery}
            sets={sets}
            selectedSetId={selectedSetId}
            onSortChange={(nextSort) => {
              setSort(nextSort)
              setPage(1)
            }}
            onSearchChange={(nextSearchQuery) => {
              setSearchQuery(nextSearchQuery)
              setPage(1)
            }}
            onSetChange={(nextSetId) => {
              setSelectedSetId(nextSetId)
              setPage(1)
            }}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  )
}

function CollectionModeToggle({
  mode,
  onChange,
}: {
  mode: CollectionMode
  onChange: (mode: CollectionMode) => void
}) {
  return (
    <div className="inline-flex rounded-xl border border-border bg-background p-1">
      <ModeButton
        isActive={mode === 'browse'}
        icon={<BookOpenIcon className="size-4" aria-hidden="true" />}
        label={m.nav_collection()}
        onClick={() => onChange('browse')}
      />
      <ModeButton
        isActive={mode === 'recycle'}
        icon={<RecycleIcon className="size-4" aria-hidden="true" />}
        label={m.nav_recycle()}
        onClick={() => onChange('recycle')}
      />
    </div>
  )
}

function ModeButton({
  isActive,
  icon,
  label,
  onClick,
}: {
  isActive: boolean
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      className={cn(
        'flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive
          ? 'bg-sidebar text-sidebar-foreground'
          : 'text-muted-foreground hover:text-foreground',
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  )
}
