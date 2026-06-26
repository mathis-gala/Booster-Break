import { MAX_OVERLOAD_BOOSTERS, PACK_OPEN_COOLDOWN_SECONDS } from './pokemon-config'

export class PackCooldownError extends Error {
  constructor(public readonly cooldownSeconds: number) {
    super(`Next booster available in ${cooldownSeconds}s.`)
    this.name = 'PackCooldownError'
  }
}

export interface BoosterChargeStatus {
  availableBoosters: number
  canOpen: boolean
  cooldownSeconds: number
  cooldownDurationSeconds: number
  nextOpenAt: Date | null
}

export function getBoosterChargeStatus(
  anchor: Date | null,
  now: Date,
  baseCooldownSeconds: number = PACK_OPEN_COOLDOWN_SECONDS,
  maxOverloadBoosters: number = MAX_OVERLOAD_BOOSTERS,
): BoosterChargeStatus {
  const maxCharges = Math.max(1, Math.floor(maxOverloadBoosters) + 1)

  if (baseCooldownSeconds <= 0) {
    return {
      availableBoosters: maxCharges,
      canOpen: true,
      cooldownSeconds: 0,
      cooldownDurationSeconds: 0,
      nextOpenAt: null,
    }
  }

  if (!anchor) {
    return {
      availableBoosters: 1,
      canOpen: true,
      cooldownSeconds: 0,
      cooldownDurationSeconds: baseCooldownSeconds,
      nextOpenAt: null,
    }
  }

  const elapsedSeconds = (now.getTime() - anchor.getTime()) / 1000
  const availableBoosters = Math.max(
    0,
    Math.min(maxCharges, Math.floor(elapsedSeconds / baseCooldownSeconds)),
  )
  const canOpen = availableBoosters >= 1

  if (canOpen) {
    const nextOpenAt =
      availableBoosters < maxCharges
        ? new Date(anchor.getTime() + (availableBoosters + 1) * baseCooldownSeconds * 1000)
        : null
    const cooldownSeconds = nextOpenAt
      ? Math.max(0, Math.ceil((nextOpenAt.getTime() - now.getTime()) / 1000))
      : 0

    return {
      availableBoosters,
      canOpen: true,
      cooldownSeconds,
      cooldownDurationSeconds: baseCooldownSeconds,
      nextOpenAt,
    }
  }

  const nextOpenAt = new Date(anchor.getTime() + baseCooldownSeconds * 1000)
  const cooldownSeconds = Math.max(0, Math.ceil((nextOpenAt.getTime() - now.getTime()) / 1000))

  return {
    availableBoosters: 0,
    canOpen: false,
    cooldownSeconds,
    cooldownDurationSeconds: baseCooldownSeconds,
    nextOpenAt,
  }
}

export function consumeBoosterCharge(
  anchor: Date | null,
  now: Date,
  baseCooldownSeconds: number = PACK_OPEN_COOLDOWN_SECONDS,
  maxOverloadBoosters: number = MAX_OVERLOAD_BOOSTERS,
): Date {
  if (baseCooldownSeconds <= 0 || !anchor) {
    return now
  }

  const maxCharges = Math.max(1, Math.floor(maxOverloadBoosters) + 1)
  const maxBankedSeconds = maxCharges * baseCooldownSeconds

  let anchorMs = anchor.getTime()
  const earliestAnchorMs = now.getTime() - maxBankedSeconds * 1000

  if (anchorMs < earliestAnchorMs) {
    anchorMs = earliestAnchorMs
  }

  return new Date(anchorMs + baseCooldownSeconds * 1000)
}
