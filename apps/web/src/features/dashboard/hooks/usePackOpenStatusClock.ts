import { useMemo, useSyncExternalStore } from 'react'
import type { PackOpenStatusResponse } from '@tcg-collection/shared'

import { packOpenClock } from '../lib/pack-open-clock'

export function useSandboxPackOpenStatus(nextOpenAt: string | undefined) {
  const initialStatus = useMemo(
    () =>
      nextOpenAt
        ? ({
            authenticated: true,
            canOpen: false,
            cooldownSeconds: SANDBOX_PACK_OPEN_COOLDOWN_SECONDS,
            cooldownDurationSeconds: SANDBOX_PACK_OPEN_COOLDOWN_SECONDS,
            nextOpenAt,
          } satisfies PackOpenStatusResponse)
        : ({
            authenticated: true,
            canOpen: true,
            cooldownSeconds: 0,
            cooldownDurationSeconds: SANDBOX_PACK_OPEN_COOLDOWN_SECONDS,
          } satisfies PackOpenStatusResponse),
    [nextOpenAt],
  )

  return usePackOpenStatusClock(initialStatus)
}

export const usePackOpenStatusClock = (
  status: PackOpenStatusResponse | undefined,
): PackOpenStatusResponse | undefined => {
  const isCooldownActive =
    status?.authenticated === true && !status.canOpen && Boolean(status.nextOpenAt)

  const now = usePackOpenClock(isCooldownActive)

  if (!isCooldownActive || !status?.nextOpenAt) {
    return status
  }

  const cooldownSeconds = getRemainingCooldownSeconds(status.nextOpenAt, now)

  if (cooldownSeconds <= 0) {
    return {
      ...status,
      canOpen: true,
      cooldownSeconds: 0,
    }
  }

  return {
    ...status,
    canOpen: false,
    cooldownSeconds,
  }
}

const usePackOpenClock = (enabled: boolean) => {
  return useSyncExternalStore(
    enabled ? packOpenClock.subscribe : noOpSubscribe,
    packOpenClock.getSnapshot,
    packOpenClock.getSnapshot,
  )
}

const noOpSubscribe = () => () => {}

const getRemainingCooldownSeconds = (nextOpenAt: string, now = Date.now()): number => {
  return Math.max(0, Math.ceil((new Date(nextOpenAt).getTime() - now) / 1000))
}

// Keep sandbox cooldown state local-only: no persistence across browser tabs, sessions, or devices.
const SANDBOX_PACK_OPEN_COOLDOWN_SECONDS = 5
