import type { PackOpenStatusResponse, PokemonSetSummary } from '@tcg-collection/shared'

import { m } from '@/paraglide/messages'
import { formatRemaining } from '../time'

type WaitLabelContext = {
  cooldownSeconds: number
}

type OpenAriaContext = {
  name: string
}

type SelectedReadyContext = {
  name: string
}

export interface PackBoosterStageLabelOverrides {
  openingLabel?: () => string
  checkingTimerLabel?: () => string
  waitLabel?: ({ cooldownSeconds }: WaitLabelContext) => string
  openLabel?: () => string
  openAriaLabel?: ({ name }: OpenAriaContext) => string
  signInLabel?: () => string
  nextInSecondsLabel?: ({ cooldownSeconds }: WaitLabelContext) => string
  selectedReadyLabel?: ({ name }: SelectedReadyContext) => string
}

export interface ResolvedPackBoosterStageLabels {
  openingLabel: () => string
  checkingTimerLabel: () => string
  waitLabel: ({ cooldownSeconds }: WaitLabelContext) => string
  openLabel: () => string
  openAriaLabel: ({ name }: OpenAriaContext) => string
  signInLabel: () => string
  nextInSecondsLabel: ({ cooldownSeconds }: WaitLabelContext) => string
  selectedReadyLabel: ({ name }: SelectedReadyContext) => string
}

interface OpenButtonLabelArgs {
  isCooldownActive: boolean
  isOpening: boolean
  packOpenStatus?: PackOpenStatusResponse
  packOpenStatusIsPending: boolean
  labels: ResolvedPackBoosterStageLabels
}

interface PackStatusTextArgs {
  activeSet?: PokemonSetSummary
  isCooldownActive: boolean
  isUnauthenticated: boolean
  packOpenStatus?: PackOpenStatusResponse
  packOpenStatusIsPending: boolean
  labels: ResolvedPackBoosterStageLabels
}

const defaultPackBoosterStageLabels: ResolvedPackBoosterStageLabels = {
  openingLabel: () => m.packs_opening(),
  checkingTimerLabel: () => m.packs_checking_timer(),
  waitLabel: ({ cooldownSeconds }) =>
    m.packs_wait_seconds({
      time: formatRemaining(cooldownSeconds * 1000),
    }),
  openLabel: () => m.packs_open(),
  openAriaLabel: ({ name }) => m.packs_open_aria({ name }),
  signInLabel: () => m.packs_sign_in_timer(),
  nextInSecondsLabel: ({ cooldownSeconds }) =>
    m.packs_next_in_seconds({
      time: formatRemaining(cooldownSeconds * 1000),
    }),
  selectedReadyLabel: ({ name }) => m.packs_selected_ready({ name }),
}

export const resolvePackBoosterStageLabels = (
  labels: PackBoosterStageLabelOverrides | undefined,
): ResolvedPackBoosterStageLabels => ({
  ...defaultPackBoosterStageLabels,
  ...labels,
})

export const getOpenButtonLabel = ({
  isCooldownActive,
  isOpening,
  packOpenStatus,
  packOpenStatusIsPending,
  labels,
}: OpenButtonLabelArgs) => {
  if (isOpening) {
    return labels.openingLabel()
  }

  if (packOpenStatusIsPending) {
    return labels.checkingTimerLabel()
  }

  if (isCooldownActive && packOpenStatus?.authenticated) {
    return labels.waitLabel({
      cooldownSeconds: packOpenStatus.cooldownSeconds,
    })
  }

  return labels.openLabel()
}

export const getPackStatusText = ({
  activeSet,
  isCooldownActive,
  isUnauthenticated,
  packOpenStatus,
  packOpenStatusIsPending,
  labels,
}: PackStatusTextArgs) => {
  if (packOpenStatusIsPending) {
    return labels.checkingTimerLabel()
  }

  if (isUnauthenticated) {
    return labels.signInLabel()
  }

  if (isCooldownActive && packOpenStatus?.authenticated) {
    return labels.nextInSecondsLabel({
      cooldownSeconds: packOpenStatus.cooldownSeconds,
    })
  }

  return labels.selectedReadyLabel({
    name: activeSet?.name ?? m.packs_pokemon_fallback(),
  })
}
