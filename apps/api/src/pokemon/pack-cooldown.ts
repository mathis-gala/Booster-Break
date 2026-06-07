import { MAX_OVERLOAD_BOOSTERS, PACK_OPEN_COOLDOWN_SECONDS } from './pokemon-config'

/** Thrown when a charge is consumed without an available booster (e.g. lost a concurrent race). */
export class PackCooldownError extends Error {
  constructor(public readonly cooldownSeconds: number) {
    super(`Next booster available in ${cooldownSeconds}s.`)
    this.name = 'PackCooldownError'
  }
}

export interface BoosterChargeStatus {
  /** Boosters ready to open right now (0..maxCharges). */
  availableBoosters: number
  canOpen: boolean
  /** Seconds until the next booster becomes available (0 when one is ready). */
  cooldownSeconds: number
  /** The base cooldown that regenerates one booster. */
  cooldownDurationSeconds: number
  /** When the next booster becomes available, or null when one is ready (or cooldown disabled). */
  nextOpenAt: Date | null
}

/**
 * Capped "charge" model: one booster regenerates every `baseCooldownSeconds`, and idle time banks
 * extra charges up to `maxOverloadBoosters` *extra* (so `maxOverloadBoosters + 1` max). State is a
 * single per-user `anchor`: charges = floor((now - anchor) / base) clamped to the cap; `null` means
 * never opened, so a booster is immediately available.
 */
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
    return {
      availableBoosters,
      canOpen: true,
      cooldownSeconds: 0,
      cooldownDurationSeconds: baseCooldownSeconds,
      nextOpenAt: null,
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

/**
 * New anchor after consuming one charge (callers must check `canOpen` first): clamps any surplus
 * beyond the cap, then advances the anchor by one cooldown to spend the charge.
 */
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
