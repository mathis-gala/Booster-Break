import { useMemo, useState } from 'react'
import type { CollectionSort } from '@tcg-collection/shared'

import { CollectionPanel } from '../components/CollectionPanel'
import {
  usePokemonCollectionAllQuery,
  usePokemonCollectionQuery,
} from '../hooks/usePokemonQueries'
import { useLocale } from '@/features/i18n/useLocale'
import { matchesCardNameSearch } from '../lib/card-search'

export function CollectionView() {
  const { locale } = useLocale()
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<CollectionSort>('recent')
  const [searchQuery, setSearchQuery] = useState('')
  const pageSize = 24
  const isSearching = searchQuery.trim().length > 0
  const collection = usePokemonCollectionQuery({
    page,
    pageSize,
    sort,
    locale,
    keepPreviousData: true,
    enabled: !isSearching,
  })
  const searchableCollection = usePokemonCollectionAllQuery({
    sort,
    locale,
    enabled: isSearching,
  })
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
  const cards = isSearching ? searchCards : collection.data?.cards ?? []
  const total = isSearching ? searchMatches.length : collection.data?.pagination.total ?? 0
  const totalCards = isSearching
    ? searchMatches.reduce((count, card) => count + card.quantity, 0)
    : collection.data?.pagination.totalCards ?? 0

  return (
    <div className="flex w-full justify-center">
      <CollectionPanel
        cards={cards}
        isPending={isSearching ? searchableCollection.isPending : collection.isPending}
        fitContent
        page={isSearching ? searchPage : collection.data?.pagination.page ?? page}
        pageCount={isSearching ? searchPageCount : collection.data?.pagination.pageCount ?? 1}
        total={total}
        totalCards={totalCards}
        sort={sort}
        searchQuery={searchQuery}
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
    </div>
  )
}
