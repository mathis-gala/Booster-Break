import { ChevronLeftIcon, ChevronRightIcon, PackageOpenIcon, TimerIcon } from 'lucide-react'
import type { PackOpenStatusResponse, PokemonSetSummary } from '@tcg-collection/shared'
import { motion, useReducedMotion } from 'motion/react'

import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'
import { formatRemaining } from '../time'
import {
  getOpenButtonLabel,
  getPackStatusText,
  resolvePackBoosterStageLabels,
  type PackBoosterStageLabelOverrides,
} from './pack-booster-stage-labels'

interface PackBoosterStageProps {
  activeSet?: PokemonSetSummary & { boosterImageUrl: string }
  sets: Array<PokemonSetSummary & { boosterImageUrl: string }>
  isSelectingSet?: boolean
  isOpening: boolean
  packOpenStatus?: PackOpenStatusResponse
  packOpenStatusIsPending: boolean
  onOpenPack: (setId?: string) => void
  onSelectSet: (setId: string) => void
  labels?: PackBoosterStageLabelOverrides
}

export function PackBoosterStage({
  activeSet,
  sets,
  isSelectingSet = false,
  isOpening,
  packOpenStatus,
  packOpenStatusIsPending,
  onOpenPack,
  onSelectSet,
  labels,
}: PackBoosterStageProps) {
  const resolvedLabels = resolvePackBoosterStageLabels(labels)
  const shouldReduceMotion = useReducedMotion()
  const activeIndex = activeSet ? sets.findIndex((set) => set.id === activeSet.id) : -1
  const previousSet = activeIndex > 0 ? sets[activeIndex - 1] : undefined
  const nextSet = activeIndex >= 0 && activeIndex < sets.length - 1 ? sets[activeIndex + 1] : undefined

  const isCooldownActive =
    packOpenStatus?.authenticated === true &&
    !packOpenStatus.canOpen &&
    packOpenStatus.cooldownSeconds > 0
  const isUnauthenticated = packOpenStatus?.authenticated === false
  const availableBoosters =
    packOpenStatus?.authenticated === true ? (packOpenStatus.availableBoosters ?? 0) : 0
  const showMultipleReady =
    !packOpenStatusIsPending &&
    packOpenStatus?.authenticated === true &&
    packOpenStatus.canOpen &&
    availableBoosters > 1
  const nextChargeSeconds =
    packOpenStatus?.authenticated === true && packOpenStatus.canOpen && packOpenStatus.nextOpenAt
      ? packOpenStatus.cooldownSeconds
      : 0
  const isDisabled =
    isOpening ||
    isSelectingSet ||
    sets.length === 0 ||
    packOpenStatusIsPending ||
    isCooldownActive ||
    isUnauthenticated
  const buttonLabel = getOpenButtonLabel({
    isCooldownActive,
    isOpening,
    packOpenStatus,
    packOpenStatusIsPending,
    labels: resolvedLabels,
  })

  const handleOpenPack = () => {
    onOpenPack(activeSet?.id)
  }

  const selectRelativeSet = (offset: -1 | 1) => {
    const set = sets[activeIndex + offset]
    if (set) onSelectSet(set.id)
  }

  return (
    <div className="relative isolate flex min-h-[34rem] flex-col items-center justify-center overflow-hidden rounded-lg border bg-[radial-gradient(circle_at_50%_42%,oklch(0.95_0.035_252_/_72%),transparent_34%),linear-gradient(135deg,oklch(0.91_0.065_252),oklch(0.985_0.004_250)_46%,oklch(0.94_0.012_250))] p-5">
      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center">
        <motion.div
          className="relative h-[min(28rem,78vw)] w-full max-w-[34rem] touch-pan-y rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          drag={sets.length > 1 ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          dragMomentum={false}
          onDragEnd={(_, info) => {
            const intent = info.offset.x + info.velocity.x * 0.14
            if (intent <= -68) selectRelativeSet(1)
            if (intent >= 68) selectRelativeSet(-1)
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft' && previousSet) {
              event.preventDefault()
              selectRelativeSet(-1)
            }
            if (event.key === 'ArrowRight' && nextSet) {
              event.preventDefault()
              selectRelativeSet(1)
            }
          }}
          tabIndex={sets.length > 1 ? 0 : -1}
          role="group"
          aria-label={m.packs_choose_booster()}
        >
          {sets.map((set, index) => {
            const distance = index - activeIndex
            const isActive = distance === 0
            const isAdjacent = Math.abs(distance) === 1
            const side = distance < 0 ? -1 : 1

            return (
              <motion.button
                key={set.id}
                type="button"
                className="absolute inset-0 m-auto aspect-[2.5/3.6] h-full cursor-pointer border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/80 disabled:cursor-default"
                initial={false}
                animate={{
                  x: isActive ? '0%' : isAdjacent ? `${side * 70}%` : `${side * 112}%`,
                  y: isActive ? '0%' : '3%',
                  scale: isActive ? 1 : isAdjacent ? 0.64 : 0.48,
                  rotateY: isActive ? 0 : side * -11,
                  opacity: isActive ? 1 : isAdjacent ? 0.5 : 0,
                  filter: isActive ? 'brightness(1)' : 'brightness(0.72)',
                }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0.1 }
                    : { type: 'spring', stiffness: 920, damping: 48, mass: 0.34 }
                }
                style={{ zIndex: isActive ? 30 : isAdjacent ? 20 : 0 }}
                disabled={!isAdjacent}
                tabIndex={isAdjacent ? 0 : -1}
                aria-hidden={!isAdjacent}
                aria-label={isAdjacent ? m.packs_select_aria({ name: set.name }) : undefined}
                onClick={() => onSelectSet(set.id)}
              >
                <img
                  src={set.boosterImageUrl}
                  alt=""
                  crossOrigin="anonymous"
                  draggable={false}
                  className="pointer-events-none size-full select-none object-contain drop-shadow-2xl"
                />
              </motion.button>
            )
          })}

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute left-0 top-1/2 z-40 -translate-y-1/2 rounded-full bg-background/90 shadow-lg backdrop-blur-sm sm:left-2"
            disabled={!previousSet}
            aria-label={previousSet ? m.packs_select_aria({ name: previousSet.name }) : undefined}
            onClick={() => selectRelativeSet(-1)}
          >
            <ChevronLeftIcon aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute right-0 top-1/2 z-40 -translate-y-1/2 rounded-full bg-background/90 shadow-lg backdrop-blur-sm sm:right-2"
            disabled={!nextSet}
            aria-label={nextSet ? m.packs_select_aria({ name: nextSet.name }) : undefined}
            onClick={() => selectRelativeSet(1)}
          >
            <ChevronRightIcon aria-hidden="true" />
          </Button>
        </motion.div>
      </div>
      <div className="mt-4 grid w-full justify-items-center gap-2 md:mt-2">
        <div className="flex flex-col items-center gap-1 rounded-2xl border bg-card/88 px-3 py-1.5 text-center shadow-sm">
          <span className="text-xs font-black text-muted-foreground">
            {showMultipleReady
              ? m.packs_selected_ready_plural({
                  name: activeSet?.name ?? m.packs_pokemon_fallback(),
                  count: availableBoosters,
                })
              : getPackStatusText({
                  activeSet,
                  isCooldownActive,
                  isUnauthenticated,
                  packOpenStatus,
                  packOpenStatusIsPending,
                  labels: resolvedLabels,
                })}
          </span>
          {nextChargeSeconds > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-muted-foreground">
              <TimerIcon className="size-3.5" aria-hidden="true" />
              {m.packs_next_stack_in({ time: formatRemaining(nextChargeSeconds * 1000) })}
            </span>
          ) : null}
        </div>
        <Button
          className="h-12 min-w-44"
          disabled={isDisabled}
          onClick={handleOpenPack}
          aria-label={resolvedLabels.openAriaLabel({
            name: activeSet?.name ?? m.packs_pokemon_fallback(),
          })}
        >
          <PackageOpenIcon data-icon="inline-start" aria-hidden="true" />
          {buttonLabel}
        </Button>
      </div>
    </div>
  )
}
