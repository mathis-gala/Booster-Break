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
  const [minimumQuantity, setMinimumQuantity] = useState(1)
  const [minimumRarity, setMinimumRarity] = useState<string>()
  const pageSize = 24
  const isSearching = searchQuery.trim().length > 0
  const needsFullCollection = isSearching
  const collection = useQuery(
    usePokemonCollectionQueryOption(
      {
        page,
        pageSize,
        sort,
        setId: selectedSetId,
        minimumQuantity,
        minimumRarity,
      },
      {
        keepPreviousData: true,
        enabled: !needsFullCollection,
      },
    ),
  )
  const searchableCollection = useQuery(
    usePokemonCollectionAllQueryOption(
      {
        sort,
        setId: selectedSetId,
        minimumQuantity,
        minimumRarity,
      },
      {
        enabled: needsFullCollection,
      },
    ),
  )
  const sets = collection.data?.sets ?? searchableCollection.data?.sets ?? []
  const rarityOptions = collection.data?.rarities ?? searchableCollection.data?.rarities ?? []
  const filteredMatches = useMemo(
    () =>
      (searchableCollection.data?.cards ?? []).filter((card) =>
        matchesCardNameSearch(card, searchQuery),
      ),
    [searchQuery, searchableCollection.data?.cards],
  )
  const filteredPageCount = Math.max(1, Math.ceil(filteredMatches.length / pageSize))
  const filteredPage = Math.min(Math.max(page, 1), filteredPageCount)
  const filteredCards = useMemo(() => {
    const start = (filteredPage - 1) * pageSize

    return filteredMatches.slice(start, start + pageSize)
  }, [filteredMatches, filteredPage, pageSize])
  const cards = needsFullCollection ? filteredCards : (collection.data?.cards ?? [])
  const total = needsFullCollection ? filteredMatches.length : (collection.data?.pagination.total ?? 0)
  const totalCards = needsFullCollection
    ? filteredMatches.reduce((count, card) => count + card.quantity, 0)
    : (collection.data?.pagination.totalCards ?? 0)

  return (
    <div className="flex w-full justify-center">
      <CollectionPanel
        cards={cards}
        isPending={isSearching ? searchableCollection.isPending : collection.isPending}
        fitContent
        page={needsFullCollection ? filteredPage : (collection.data?.pagination.page ?? page)}
        pageCount={needsFullCollection ? filteredPageCount : (collection.data?.pagination.pageCount ?? 1)}
        total={total}
        totalCards={totalCards}
        sort={sort}
        searchQuery={searchQuery}
        sets={sets}
        selectedSetId={selectedSetId}
        minimumQuantity={minimumQuantity}
        minimumRarity={minimumRarity}
        rarityOptions={rarityOptions}
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
        onMinimumQuantityChange={(quantity) => {
          setMinimumQuantity(quantity)
          setPage(1)
        }}
        onMinimumRarityChange={(rarity) => {
          setMinimumRarity(rarity)
          setPage(1)
        }}
        onPageChange={setPage}
      />
    </div>
  )
}
