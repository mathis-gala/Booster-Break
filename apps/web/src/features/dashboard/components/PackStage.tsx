import { useMemo, useState, type ReactNode } from 'react'
import type {
  OpenPackResponse,
  PackOpenStatusResponse,
  PokemonCardSummary,
  PokemonSetSummary,
} from '@tcg-collection/shared'

import { BoosterPickerPanel } from './BoosterPickerPanel'
import { BoosterOpeningOverlay } from './BoosterOpeningOverlay'
import { BoosterPreviewDialog } from './BoosterPreviewDialog'
import { PackBoosterStage } from './PackBoosterStage'
import { PackRevealDialog } from './PackRevealDialog'
import { m } from '@/paraglide/messages'

interface PackStageProps {
  sets: PokemonSetSummary[]
  setsIsPending: boolean
  onOpenPack: (setId?: string) => void
  openPackIsPending: boolean
  openPackResult?: OpenPackResponse
  packOpenStatus?: PackOpenStatusResponse
  packOpenStatusIsPending: boolean
  isTearOpen: boolean
  onTearComplete: () => void
  isRevealOpen: boolean
  onCloseReveal: () => void
  revealedCardIndex: number
  maxRevealedCardIndex: number
  onRevealCardIndexChange: (index: number) => void
  previewSet?: PokemonSetSummary
  previewCards: PokemonCardSummary[]
  previewIsPending: boolean
  onPreviewSet: (setId: string) => void
  onClosePreview: () => void
  collectionCount: number
  ownedSetPullCounts?: ReadonlyMap<string, number>
  previewOwnedCardIds?: ReadonlySet<string>
  rotationVotePanel?: ReactNode
}

export function PackStage({
  sets,
  setsIsPending,
  onOpenPack,
  openPackIsPending,
  openPackResult,
  packOpenStatus,
  packOpenStatusIsPending,
  isTearOpen,
  onTearComplete,
  isRevealOpen,
  onCloseReveal,
  revealedCardIndex,
  maxRevealedCardIndex,
  onRevealCardIndexChange,
  previewSet,
  previewCards,
  previewIsPending,
  onPreviewSet,
  onClosePreview,
  collectionCount,
  ownedSetPullCounts,
  previewOwnedCardIds,
  rotationVotePanel,
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

        <div className="grid gap-5">
          <BoosterPickerPanel
            activeSetId={activeSetId}
            collectionCount={collectionCount}
            sets={boosterSets}
            setsIsPending={setsIsPending}
            onPreviewSet={onPreviewSet}
            onSelectSet={setSelectedSetId}
            title={m.packs_rotation_active_title()}
            description={m.packs_rotation_active_description()}
            loadingLabel={m.packs_rotation_loading()}
            emptyLabel={m.packs_rotation_error()}
            ownedSetPullCounts={ownedSetPullCounts}
            hideSetCardTitle
          />
          {rotationVotePanel}
        </div>
      </div>

      {openPackResult && isTearOpen && openPackResult.set.boosterImageUrl ? (
        <BoosterOpeningOverlay
          boosterImageUrl={openPackResult.set.boosterImageUrl}
          setName={openPackResult.set.name}
          onComplete={onTearComplete}
        />
      ) : null}

      {openPackResult && isRevealOpen ? (
        <PackRevealDialog
          openPackResult={openPackResult}
          revealedCardIndex={revealedCardIndex}
          maxRevealedCardIndex={maxRevealedCardIndex}
          onClose={onCloseReveal}
          onRevealCardIndexChange={onRevealCardIndexChange}
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
