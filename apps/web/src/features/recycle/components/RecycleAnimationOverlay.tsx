import { useCallback, useEffect, useState } from 'react'
import { SparklesIcon } from 'lucide-react'
import type { AwardedCard, CardFinish } from '@tcg-collection/shared'

import { formatRarity } from '@/features/i18n/rarity-labels'
import { FoilCardImage } from '@/features/dashboard/components/FoilCardImage'
import { WebGlCardViewer } from '@/features/dashboard/components/WebGlCardViewer'
import { m } from '@/paraglide/messages'

export interface RecycleConsumedCard {
  id: string
  imageSmall?: string
  finish?: CardFinish
}

interface RecycleAnimationOverlayProps {
  /** Cards behind each reward — one batch per reward (see buildRecycleBatches). */
  batches: RecycleConsumedCard[][]
  rewards: AwardedCard[] | null
  /** Maps a card's setId to its display name (the extension). */
  setNameById?: Record<string, string>
  onClose: () => void
}

type AnimationPhase = 'gather' | 'combine' | 'reveal'

const GATHER_DURATION_MS = 650
const COMBINE_DURATION_MS = 750

export function RecycleAnimationOverlay({
  batches,
  rewards,
  setNameById,
  onClose,
}: RecycleAnimationOverlayProps) {
  const [index, setIndex] = useState(0)
  const advance = useCallback(() => setIndex((current) => current + 1), [])

  // Warm the browser cache for reward images so the 3D viewer's texture is ready at reveal.
  useEffect(() => {
    if (!rewards) {
      return
    }

    for (const card of rewards) {
      const url = card.imageLarge ?? card.imageSmall

      if (url) {
        const image = new Image()
        image.src = url
      }
    }
  }, [rewards])

  const total = rewards?.length ?? 0
  const isLast = total === 0 || index >= total - 1
  const batch = batches[index] ?? batches[0] ?? []

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={m.recycle_title()}
    >
      <div className="relative flex w-[min(44rem,94vw)] flex-col items-center gap-5">
        {/* Keyed by index so each reward replays the full gather → combine → reveal. */}
        <RecycleStep
          key={index}
          consumed={batch}
          reward={rewards ? rewards[index] : null}
          index={index}
          total={total}
          isLast={isLast}
          setNameById={setNameById}
          onAdvance={advance}
          onClose={onClose}
        />
      </div>
    </div>
  )
}

function RecycleStep({
  consumed,
  reward,
  index,
  total,
  isLast,
  setNameById,
  onAdvance,
  onClose,
}: {
  consumed: RecycleConsumedCard[]
  reward: AwardedCard | null
  index: number
  total: number
  isLast: boolean
  setNameById?: Record<string, string>
  onAdvance: () => void
  onClose: () => void
}) {
  const [phase, setPhase] = useState<AnimationPhase>('gather')

  useEffect(() => {
    const timer = setTimeout(() => setPhase('combine'), GATHER_DURATION_MS)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (phase !== 'combine' || !reward) {
      return
    }

    const timer = setTimeout(() => setPhase('reveal'), COMBINE_DURATION_MS)

    return () => clearTimeout(timer)
  }, [phase, reward])

  if (phase === 'reveal' && reward) {
    return (
      <RewardReveal
        card={reward}
        index={index}
        total={total}
        isLast={isLast}
        setName={setNameById?.[reward.setId]}
        onAdvance={onAdvance}
        onClose={onClose}
      />
    )
  }

  return <CombineStage consumed={consumed} phase={phase} />
}

function CombineStage({
  consumed,
  phase,
}: {
  consumed: RecycleConsumedCard[]
  phase: AnimationPhase
}) {
  const isCombining = phase === 'combine'
  const count = consumed.length
  const middle = (count - 1) / 2

  return (
    <>
      <div className="relative flex h-[min(34rem,70vh)] w-full items-center justify-center">
        {/* Pulsing core the cards merge into */}
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 size-64 rounded-full bg-[radial-gradient(circle,oklch(0.9_0.18_145/_0.85)_0%,oklch(0.75_0.2_150/_0.35)_45%,transparent_72%)] motion-safe:animate-[recycle-orb-pulse_1.1s_ease-in-out_infinite]"
          style={{ opacity: isCombining ? 1 : 0, transition: 'opacity 500ms ease-in' }}
          aria-hidden="true"
        />

        {consumed.map((card, index) => {
          const offset = index - middle
          const transform = isCombining
            ? 'translate(-50%, -50%) scale(0.16)'
            : `translate(-50%, -50%) translateX(${offset * 112}px) translateY(${Math.abs(offset) * 22}px) rotate(${offset * 9}deg)`

          return (
            <div
              key={`${card.id}-${index}`}
              className="absolute left-1/2 top-1/2 w-60 transition-all duration-700 ease-in"
              style={{ transform, opacity: isCombining ? 0 : 1 }}
              aria-hidden="true"
            >
              {card.imageSmall ? (
                <FoilCardImage
                  src={card.imageSmall}
                  alt=""
                  finish={card.finish}
                  className="aspect-63/88 w-full rounded-lg object-cover shadow-xl"
                />
              ) : (
                <div className="aspect-63/88 w-full rounded-lg bg-muted" />
              )}
            </div>
          )
        })}
      </div>

      <p className="text-sm font-black text-white/90">{m.recycle_action_pending()}</p>
    </>
  )
}

function RewardReveal({
  card,
  index,
  total,
  isLast,
  setName,
  onAdvance,
  onClose,
}: {
  card: AwardedCard
  index: number
  total: number
  isLast: boolean
  setName?: string
  onAdvance: () => void
  onClose: () => void
}) {
  const imageUrl = card.imageLarge ?? card.imageSmall
  const meta = [formatRarity(card.rarity), setName].filter(Boolean).join(' · ')

  return (
    <>
      <div className="relative flex w-full items-center justify-center">
        {/* Flash burst behind the revealed card */}
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 size-[44rem] rounded-full bg-[radial-gradient(circle,oklch(1_0_0/_0.9)_0%,oklch(0.9_0.18_145/_0.5)_40%,transparent_70%)] motion-safe:animate-[recycle-burst_700ms_ease-out_forwards]"
          aria-hidden="true"
        />

        <article className="relative flex w-[min(44rem,94vw,52vh)] flex-col items-center motion-safe:animate-[recycle-reveal-pop_650ms_cubic-bezier(0.34,1.56,0.64,1)_both]">
          <div className="relative w-full">
            {imageUrl ? (
              <WebGlCardViewer
                key={`${imageUrl}-${card.finish ?? 'normal'}`}
                frontImageUrl={imageUrl}
                alt={card.name}
                finish={card.finish}
                className="rounded-2xl drop-shadow-2xl"
              />
            ) : (
              <div className="aspect-63/88 w-full rounded-2xl bg-muted" aria-hidden="true" />
            )}
            {card.isNew ? (
              <span className="new-card-badge-pulse absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-400 px-4 py-1.5 text-xs font-black uppercase tracking-wide text-amber-950 shadow-[0_8px_20px_-6px_rgba(245,158,11,0.55)] sm:text-sm">
                <SparklesIcon className="size-3.5 shrink-0 sm:size-4" aria-hidden="true" />
                {m.packs_card_new()}
              </span>
            ) : null}
          </div>
          <p className="mt-3 max-w-full truncate text-lg font-black text-white">{card.name}</p>
          <p className="max-w-full truncate text-sm font-semibold text-white/70">{meta}</p>
        </article>
      </div>

      {total > 1 ? (
        <p className="text-sm font-black tabular-nums text-white/80">
          {index + 1} / {total}
        </p>
      ) : null}

      <button
        type="button"
        className="w-full max-w-xs cursor-pointer rounded-lg bg-sidebar px-4 py-2.5 text-sm font-black text-sidebar-foreground transition-colors hover:bg-sidebar/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={isLast ? onClose : onAdvance}
      >
        {isLast ? m.recycle_reward_close() : m.packs_next()}
      </button>
    </>
  )
}
