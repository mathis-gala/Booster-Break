import { useState } from 'react'
import type { CollectionSort } from '@tcg-collection/shared'

import { CollectionPanel } from '../components/CollectionPanel'
import { usePokemonCollectionQuery } from '../hooks/usePokemonQueries'
import { useLocale } from '@/features/i18n/useLocale'

export function CollectionView() {
  const { locale } = useLocale()
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<CollectionSort>('recent')
  const pageSize = 24
  const collection = usePokemonCollectionQuery({
    page,
    pageSize,
    sort,
    locale,
    keepPreviousData: true,
  })

  return (
    <div className="flex w-full justify-center">
      <CollectionPanel
        cards={collection.data?.cards ?? []}
        isPending={collection.isPending}
        fitContent
        page={collection.data?.pagination.page ?? page}
        pageCount={collection.data?.pagination.pageCount ?? 1}
        total={collection.data?.pagination.total ?? 0}
        totalCards={collection.data?.pagination.totalCards ?? 0}
        sort={sort}
        onSortChange={(nextSort) => {
          setSort(nextSort)
          setPage(1)
        }}
        onPageChange={setPage}
      />
    </div>
  )
}
