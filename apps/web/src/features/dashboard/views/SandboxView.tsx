import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { PokemonSetSummary } from '@tcg-collection/shared'

import { BoosterPickerPanel } from '../components/BoosterPickerPanel'
import { BoosterOpeningOverlay } from '../components/BoosterOpeningOverlay'
import { PackBoosterStage } from '../components/PackBoosterStage'
import { PackRevealDialog } from '../components/PackRevealDialog'
import { BoosterPreviewDialog } from '../components/BoosterPreviewDialog'
import { useSandboxPackOpenStatus } from '../hooks/usePackOpenStatusClock'
import { useLocale } from '@/features/i18n/useLocale'
import { useOpenPokemonPackSandboxMutationOption } from '@/lib/mutations/pokemon'
import {
  useSandboxPokemonPreviewCardsQueryOption,
  useSandboxPokemonSetsQueryOption,
} from '@/lib/queries/pokemon'
import { m } from '@/paraglide/messages'
import { formatRemaining } from '../time'

const SANDBOX_OPEN_COOLDOWN_MS = 5 * 1000

type SandboxSet = PokemonSetSummary & { boosterImageUrl: string }

export function SandboxView() {
  useLocale()
  const [isTearOpen, setIsTearOpen] = useState(false)
  const [isRevealOpen, setIsRevealOpen] = useState(false)
  const [isPreparingReveal, setIsPreparingReveal] = useState(false)
  const [revealedCardIndex, setRevealedCardIndex] = useState(0)
  const [maxRevealedCardIndex, setMaxRevealedCardIndex] = useState(0)
  const [previewSetId, setPreviewSetId] = useState<string>()
  const [activeSetIdOverride, setActiveSetIdOverride] = useState<string>()
  const [cooldownUntil, setCooldownUntil] = useState<string>()

  const sets = useQuery(useSandboxPokemonSetsQueryOption())
  const packOpenStatus = useSandboxPackOpenStatus(cooldownUntil)
  const openPack = useMutation(
    useOpenPokemonPackSandboxMutationOption({
      onPreparingChange: setIsPreparingReveal,
      onPrepared: () => {
        setRevealedCardIndex(0)
        setMaxRevealedCardIndex(0)
        setIsRevealOpen(false)
        setIsTearOpen(true)
        setCooldownUntil(new Date(Date.now() + SANDBOX_OPEN_COOLDOWN_MS).toISOString())
      },
    }),
  )
  const previewCards = useQuery(useSandboxPokemonPreviewCardsQueryOption(previewSetId))

  const boosterSets = useMemo(
    () =>
      (sets.data ?? [])
        .filter((set) => Boolean(set.boosterImageUrl))
        .slice()
        .sort(compareSetsByReleaseDateDesc) as SandboxSet[],
    [sets.data],
  )

  const previewSet = sets.data?.find((set) => set.id === previewSetId)

  const handleTearComplete = useCallback(() => {
    setIsTearOpen(false)
    setIsRevealOpen(true)
  }, [])

  const activeSetId =
    activeSetIdOverride && boosterSets.some((set) => set.id === activeSetIdOverride)
      ? activeSetIdOverride
      : boosterSets[0]?.id

  const activeSet = boosterSets.find((set) => set.id === activeSetId)

  return (
    <div className="w-full max-w-6xl">
      <section className="min-w-0 rounded-lg border bg-card text-card-foreground">
        <div className="grid min-h-full gap-5 p-4 md:grid-cols-[1fr_1.1fr] md:p-5">
          <PackBoosterStage
            activeSet={activeSet}
            boosterCount={boosterSets.length}
            isOpening={openPack.isPending}
            packOpenStatus={packOpenStatus}
            packOpenStatusIsPending={openPack.isPending || isPreparingReveal}
            labels={{
              openingLabel: () => m.sandbox_opening(),
              checkingTimerLabel: () => m.sandbox_checking_timer(),
              waitLabel: ({ cooldownSeconds }) =>
                m.sandbox_wait_seconds({ time: formatRemaining(cooldownSeconds * 1000) }),
              openLabel: () => m.sandbox_open(),
              openAriaLabel: ({ name }) => m.sandbox_open_aria({ name }),
              signInLabel: () => m.sandbox_sign_in_timer(),
              nextInSecondsLabel: ({ cooldownSeconds }) =>
                m.sandbox_next_in_seconds({
                  time: formatRemaining(cooldownSeconds * 1000),
                }),
              selectedReadyLabel: ({ name }) => m.sandbox_selected_ready({ name }),
            }}
            onOpenPack={(setId) => openPack.mutate(setId)}
          />

          <BoosterPickerPanel
            activeSetId={activeSetId}
            collectionCount={0}
            sets={boosterSets}
            setsIsPending={sets.isPending}
            onPreviewSet={setPreviewSetId}
            onSelectSet={setActiveSetIdOverride}
            title={m.sandbox_title()}
            description={m.sandbox_description()}
            loadingLabel={m.sandbox_loading()}
            emptyLabel={m.sandbox_empty()}
            showCollectionCount={false}
          />
        </div>
      </section>

      {openPack.data && isTearOpen && openPack.data.set.boosterImageUrl ? (
        <BoosterOpeningOverlay
          boosterImageUrl={openPack.data.set.boosterImageUrl}
          setName={openPack.data.set.name}
          onComplete={handleTearComplete}
        />
      ) : null}

      {openPack.data && isRevealOpen ? (
        <PackRevealDialog
          openPackResult={openPack.data}
          revealedCardIndex={revealedCardIndex}
          maxRevealedCardIndex={maxRevealedCardIndex}
          onClose={() => setIsRevealOpen(false)}
          onRevealCardIndexChange={(index) => {
            setRevealedCardIndex(index)
            setMaxRevealedCardIndex((currentIndex) => Math.max(currentIndex, index))
          }}
          resultLabel={m.sandbox_reveal_label()}
        />
      ) : null}

      {previewSet ? (
        <BoosterPreviewDialog
          cards={previewCards.data ?? []}
          isPending={previewCards.isPending && Boolean(previewSetId)}
          set={previewSet}
          onClose={() => setPreviewSetId(undefined)}
          showRarityChanceLabels={false}
        />
      ) : null}
    </div>
  )
}

const compareSetsByReleaseDateDesc = (
  first: PokemonSetSummary,
  second: PokemonSetSummary,
): number =>
  getReleaseDateSortValue(second.releaseDate) - getReleaseDateSortValue(first.releaseDate)

const getReleaseDateSortValue = (releaseDate: unknown): number => {
  if (typeof releaseDate === 'string') {
    return Date.parse(releaseDate) || 0
  }

  if (releaseDate instanceof Date) {
    return releaseDate.getTime()
  }

  return 0
}
