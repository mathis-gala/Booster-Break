import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { CollectionSort } from '@tcg-collection/shared'

import { CollectionPanel } from '../components/CollectionPanel'
import { useLocale } from '@/features/i18n/useLocale'
import {
  usePokemonCollectionAllQueryOption,
  usePokemonCollectionQueryOption,
} from '@/lib/queries/pokemon'
import { matchesCardNameSearch } from '../lib/card-search'

export function CollectionView() {
  useLocale()
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<CollectionSort>('recent')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSetId, setSelectedSetId] = useState<string>()
  const pageSize = 24
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
        enabled: !isSearching,
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
        enabled: isSearching,
      },
    ),
  )
  const sets =
    (isSearching ? searchableCollection.data?.sets : collection.data?.sets) ??
    collection.data?.sets ??
    searchableCollection.data?.sets ??
    []
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
  )
}
