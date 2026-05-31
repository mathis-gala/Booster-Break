import { PackageOpenIcon } from 'lucide-react'
import type { PackOpenStatusResponse, PokemonSetSummary } from '@tcg-collection/shared'

import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'
import {
  getOpenButtonLabel,
  getPackStatusText,
  resolvePackBoosterStageLabels,
  type PackBoosterStageLabelOverrides,
} from './pack-booster-stage-labels'

interface PackBoosterStageProps {
  activeSet?: PokemonSetSummary & { boosterImageUrl: string }
  boosterCount: number
  isOpening: boolean
  packOpenStatus?: PackOpenStatusResponse
  packOpenStatusIsPending: boolean
  onOpenPack: (setId?: string) => void
  labels?: PackBoosterStageLabelOverrides
}

export function PackBoosterStage({
  activeSet,
  boosterCount,
  isOpening,
  packOpenStatus,
  packOpenStatusIsPending,
  onOpenPack,
  labels,
}: PackBoosterStageProps) {
  const resolvedLabels = resolvePackBoosterStageLabels(labels)

  const isCooldownActive =
    packOpenStatus?.authenticated === true &&
    !packOpenStatus.canOpen &&
    packOpenStatus.cooldownSeconds > 0
  const isUnauthenticated = packOpenStatus?.authenticated === false
  const isDisabled =
    isOpening ||
    boosterCount === 0 ||
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

  return (
    <div className="relative isolate flex min-h-[34rem] flex-col items-center justify-center overflow-hidden rounded-lg border bg-[radial-gradient(circle_at_50%_42%,oklch(0.95_0.035_252_/_72%),transparent_34%),linear-gradient(135deg,oklch(0.91_0.065_252),oklch(0.985_0.004_250)_46%,oklch(0.94_0.012_250))] p-5">
      <div className="flex min-h-0 w-full flex-1 items-center justify-center">
        {activeSet ? (
          <div className="flex aspect-[2.5/3.6] h-[min(28rem,78vw)] items-center justify-center">
            <img
              src={activeSet.boosterImageUrl}
              alt=""
              className="size-full object-contain drop-shadow-2xl transition-transform duration-300 hover:-translate-y-1"
            />
          </div>
        ) : null}
      </div>
      <div className="mt-4 grid w-full justify-items-center gap-2 md:mt-2">
        <div className="rounded-full border bg-card/88 px-3 py-1.5 text-center text-xs font-black text-muted-foreground shadow-sm">
          {getPackStatusText({
            activeSet,
            isCooldownActive,
            isUnauthenticated,
            packOpenStatus,
            packOpenStatusIsPending,
            labels: resolvedLabels,
          })}
        </div>
        <Button
          className="h-12 min-w-44"
          disabled={isDisabled}
          onClick={() => onOpenPack(activeSet?.id)}
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
