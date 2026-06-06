import { useMemo, useState } from 'react'

import { PackStage } from '../components/PackStage'
import {
  useOpenPokemonPackMutation,
  useOwnedCardIdsQuery,
  usePackOpenStatusQuery,
  usePokemonCollectionCountQuery,
  usePokemonPreviewCardsQuery,
  usePokemonSetsQuery,
} from '../hooks/usePokemonQueries'
import { useCurrentUserQuery } from '../hooks/useAuthQueries'
import { useLocale } from '@/features/i18n/useLocale'

export function PacksView() {
  const { locale } = useLocale()
  const [isRevealOpen, setIsRevealOpen] = useState(false)
  const [isPreparingReveal, setIsPreparingReveal] = useState(false)
  const [revealedCardIndex, setRevealedCardIndex] = useState(0)
  const [maxRevealedCardIndex, setMaxRevealedCardIndex] = useState(0)
  const [previewSetId, setPreviewSetId] = useState<string>()
  const sets = usePokemonSetsQuery(locale)
  const packStatus = usePackOpenStatusQuery()
  const openPack = useOpenPokemonPackMutation({
    locale,
    onPreparingChange: setIsPreparingReveal,
    onPrepared: () => {
      setRevealedCardIndex(0)
      setMaxRevealedCardIndex(0)
      setIsRevealOpen(true)
    },
  })
  const collection = usePokemonCollectionCountQuery(locale)
  const previewCards = usePokemonPreviewCardsQuery(previewSetId, locale)
  const previewSet = sets.data?.find((set) => set.id === previewSetId)
  const currentUser = useCurrentUserQuery()
  const isAuthenticated = currentUser.data?.authenticated ?? false
  const ownedCardIdsQuery = useOwnedCardIdsQuery(isAuthenticated)
  const ownedCardIds = useMemo(
    () => (ownedCardIdsQuery.data ? new Set(ownedCardIdsQuery.data) : undefined),
    [ownedCardIdsQuery.data],
  )

  return (
    <div className="w-full max-w-6xl">
      <PackStage
        sets={sets.data ?? []}
        setsIsPending={sets.isPending}
        onOpenPack={(setId) => openPack.mutate(setId)}
        openPackIsPending={openPack.isPending || isPreparingReveal}
        openPackResult={openPack.data}
        packOpenStatus={packStatus.data}
        packOpenStatusIsPending={packStatus.isPending}
        isRevealOpen={isRevealOpen}
        onCloseReveal={() => setIsRevealOpen(false)}
        revealedCardIndex={revealedCardIndex}
        maxRevealedCardIndex={maxRevealedCardIndex}
        onRevealCardIndexChange={(index) => {
          setRevealedCardIndex(index)
          setMaxRevealedCardIndex((currentIndex) => Math.max(currentIndex, index))
        }}
        previewSet={previewSet}
        previewCards={previewCards.data ?? []}
        previewIsPending={previewCards.isPending && Boolean(previewSetId)}
        onPreviewSet={setPreviewSetId}
        onClosePreview={() => setPreviewSetId(undefined)}
        collectionCount={collection.data?.pagination.totalCards ?? 0}
        previewOwnedCardIds={ownedCardIds}
      />
    </div>
  )
}
