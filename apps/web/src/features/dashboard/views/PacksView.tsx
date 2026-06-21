import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { PackStage } from '../components/PackStage'
import { usePackOpenStatusClock } from '../hooks/usePackOpenStatusClock'
import { useLocale } from '@/features/i18n/useLocale'
import { useOpenPokemonPackMutationOption } from '@/lib/mutations/pokemon'
import { useCurrentUserQueryOption } from '@/lib/queries/auth'
import {
  useOwnedCardIdsQueryOption,
  usePackOpenStatusQueryOption,
  usePokemonCollectionCountQueryOption,
  usePokemonPreviewCardsQueryOption,
  usePokemonSetsQueryOption,
} from '@/lib/queries/pokemon'

export function PacksView() {
  useLocale()
  const [isTearOpen, setIsTearOpen] = useState(false)
  const [isRevealOpen, setIsRevealOpen] = useState(false)
  const [isPreparingReveal, setIsPreparingReveal] = useState(false)
  const [revealedCardIndex, setRevealedCardIndex] = useState(0)
  const [maxRevealedCardIndex, setMaxRevealedCardIndex] = useState(0)
  const [previewSetId, setPreviewSetId] = useState<string>()
  const queryClient = useQueryClient()
  const sets = useQuery(usePokemonSetsQueryOption())
  const packStatusQuery = useQuery(usePackOpenStatusQueryOption())
  const packOpenStatus = usePackOpenStatusClock(packStatusQuery.data)
  const openPack = useMutation(
    useOpenPokemonPackMutationOption(queryClient, {
      onPreparingChange: setIsPreparingReveal,
      onPrepared: () => {
        setRevealedCardIndex(0)
        setMaxRevealedCardIndex(0)
        setIsRevealOpen(false)
        setIsTearOpen(true)
      },
    }),
  )
  const collection = useQuery(usePokemonCollectionCountQueryOption())
  const ownedSetPullCounts = useMemo(
    () => new Map((collection.data?.sets ?? []).map((set) => [set.id, set.count])),
    [collection.data?.sets],
  )
  const previewCards = useQuery(usePokemonPreviewCardsQueryOption(previewSetId))
  const previewSet = sets.data?.find((set) => set.id === previewSetId)
  const currentUser = useQuery(useCurrentUserQueryOption())
  const isAuthenticated = currentUser.data?.authenticated ?? false
  const ownedCardIdsQuery = useQuery(useOwnedCardIdsQueryOption(isAuthenticated))
  const ownedCardIds = useMemo(
    () => (ownedCardIdsQuery.data ? new Set(ownedCardIdsQuery.data) : undefined),
    [ownedCardIdsQuery.data],
  )

  const handleTearComplete = useCallback(() => {
    setIsTearOpen(false)
    setIsRevealOpen(true)
  }, [])

  return (
    <div className="w-full max-w-6xl">
      <PackStage
        sets={sets.data ?? []}
        setsIsPending={sets.isPending}
        onOpenPack={(setId) => openPack.mutate(setId)}
        openPackIsPending={openPack.isPending || isPreparingReveal}
        openPackResult={openPack.data}
        packOpenStatus={packOpenStatus}
        packOpenStatusIsPending={packStatusQuery.isPending}
        isTearOpen={isTearOpen}
        onTearComplete={handleTearComplete}
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
        ownedSetPullCounts={ownedSetPullCounts}
        previewOwnedCardIds={ownedCardIds}
      />
    </div>
  )
}
