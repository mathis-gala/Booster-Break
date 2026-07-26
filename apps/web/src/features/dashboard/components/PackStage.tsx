import { useMemo, useState } from 'react'
import type {
  OpenPackResponse,
  PackOpenStatusResponse,
  PokemonCardSummary,
  PokemonSetSummary,
} from '@tcg-collection/shared'

import { BoosterPickerPanel } from './BoosterPickerPanel'
import { BoosterPreviewDialog } from './BoosterPreviewDialog'
import { PackBoosterStage } from './PackBoosterStage'
import { PackOpeningExperience } from './PackOpeningExperience'

interface PackStageProps {
  sets: PokemonSetSummary[]
  setsIsPending: boolean
  onOpenPack: (setId?: string) => void
  openPackIsPending: boolean
  openPackResult?: OpenPackResponse
  packOpenStatus?: PackOpenStatusResponse
  packOpenStatusIsPending: boolean
  isOpeningExperienceOpen: boolean
  onCompleteOpeningExperience: () => void
  previewSet?: PokemonSetSummary
  previewCards: PokemonCardSummary[]
  previewIsPending: boolean
  onPreviewSet: (setId: string) => void
  onClosePreview: () => void
  collectionCount: number
  ownedSetPullCounts?: ReadonlyMap<string, number>
  previewOwnedCardIds?: ReadonlySet<string>
}

export function PackStage({
  sets,
  setsIsPending,
  onOpenPack,
  openPackIsPending,
  openPackResult,
  packOpenStatus,
  packOpenStatusIsPending,
  isOpeningExperienceOpen,
  onCompleteOpeningExperience,
  previewSet,
  previewCards,
  previewIsPending,
  onPreviewSet,
  onClosePreview,
  collectionCount,
  ownedSetPullCounts,
  previewOwnedCardIds,
}: PackStageProps) {
  const [selectedSetId, setSelectedSetId] = useState<string>()
  const boosterSets = useMemo(
    () =>
      sets.filter((set): set is PokemonSetSummary & { boosterImageUrl: string } =>
        Boolean(set.boosterImageUrl),
      ),
    [sets],
  )
  const activeSetId =
    selectedSetId && boosterSets.some((set) => set.id === selectedSetId)
      ? selectedSetId
      : boosterSets[0]?.id
  const activeSet = useMemo(
    () => boosterSets.find((set) => set.id === activeSetId) ?? boosterSets[0],
    [activeSetId, boosterSets],
  )
  return (
    <section className="min-w-0 rounded-lg border bg-card text-card-foreground">
      <div className="grid min-h-full gap-5 p-4 md:grid-cols-[1fr_1.1fr] md:p-5">
        <PackBoosterStage
          activeSet={activeSet}
          boosterCount={boosterSets.length}
          isOpening={openPackIsPending}
          packOpenStatus={packOpenStatus}
          packOpenStatusIsPending={packOpenStatusIsPending}
          onOpenPack={onOpenPack}
        />

        <BoosterPickerPanel
          activeSetId={activeSetId}
          collectionCount={collectionCount}
          sets={boosterSets}
          setsIsPending={setsIsPending}
          onPreviewSet={onPreviewSet}
          onSelectSet={setSelectedSetId}
          ownedSetPullCounts={ownedSetPullCounts}
          hideSetCardTitle
        />
      </div>

      {openPackResult && isOpeningExperienceOpen && openPackResult.set.boosterImageUrl ? (
        <PackOpeningExperience
          key={openPackResult.openingId}
          openPackResult={openPackResult}
          onComplete={onCompleteOpeningExperience}
        />
      ) : null}

      {previewSet ? (
        <BoosterPreviewDialog
          cards={previewCards}
          isPending={previewIsPending}
          set={previewSet}
          onClose={onClosePreview}
          ownedCardIds={previewOwnedCardIds}
        />
      ) : null}
    </section>
  )
}
