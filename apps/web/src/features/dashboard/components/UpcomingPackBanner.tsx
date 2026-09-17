import { useEffect, useState, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { XIcon } from 'lucide-react'
import type { UpcomingPokemonSet } from '@tcg-collection/shared'

import { packOpenClock } from '../lib/pack-open-clock'
import { pokemonQueryKeys } from '../lib/query-keys'
import { describeAuctionRemaining } from '@/features/trade/lib/trade-utils'
import { m } from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'

const dismissedUpcomingPacksStorageKey = 'booster-break-dismissed-upcoming-packs'

const getDismissedSetIds = (): string[] => {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const stored: unknown = JSON.parse(
      window.localStorage.getItem(dismissedUpcomingPacksStorageKey) ?? '[]',
    )

    return Array.isArray(stored) ? stored.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

interface UpcomingPackBannerProps {
  sets: UpcomingPokemonSet[]
}

export function UpcomingPackBanner({ sets }: UpcomingPackBannerProps) {
  const queryClient = useQueryClient()
  const [dismissedSetIds, setDismissedSetIds] = useState(getDismissedSetIds)
  const nextReleaseAt = sets[0] ? new Date(sets[0].releasesAt).getTime() : undefined

  // Lives here rather than in a row so that closing the banner never stops the auto-release.
  // The API decides when a booster is out; once the countdown is over we only ask it again.
  useEffect(() => {
    if (nextReleaseAt === undefined) {
      return
    }

    const timerId = window.setTimeout(
      () => queryClient.invalidateQueries({ queryKey: pokemonQueryKeys.setsAll }),
      nextReleaseAt - Date.now() + 1_000,
    )

    return () => window.clearTimeout(timerId)
  }, [nextReleaseAt, queryClient])

  const visibleSets = sets.filter((set) => !dismissedSetIds.includes(set.id))

  if (visibleSets.length === 0) {
    return null
  }

  const dismiss = (setId: string) => {
    const nextDismissedSetIds = [...dismissedSetIds, setId]

    setDismissedSetIds(nextDismissedSetIds)
    window.localStorage.setItem(
      dismissedUpcomingPacksStorageKey,
      JSON.stringify(nextDismissedSetIds),
    )
  }

  return (
    <aside className="pointer-events-none fixed inset-x-0 top-[4.5rem] z-20 flex flex-col items-center gap-2 px-3 md:top-3 md:left-44">
      {visibleSets.map((set) => (
        <UpcomingPackRow key={set.id} set={set} onDismiss={() => dismiss(set.id)} />
      ))}
    </aside>
  )
}

interface UpcomingPackRowProps {
  set: UpcomingPokemonSet
  onDismiss: () => void
}

function UpcomingPackRow({ set, onDismiss }: UpcomingPackRowProps) {
  const now = useSyncExternalStore(packOpenClock.subscribe, packOpenClock.getSnapshot)
  const locale = getLocale()
  const release = new Date(set.releasesAt)

  return (
    <div className="pointer-events-auto flex max-w-full items-center gap-x-3 rounded-lg border bg-accent py-2 pr-2 pl-4 text-accent-foreground shadow-md">
      {set.logoUrl ? <img src={set.logoUrl} alt="" className="h-8 w-auto" /> : null}
      <p className="text-sm font-semibold">
        <span className="mr-1 text-xs font-black uppercase">{m.upcoming_pack_eyebrow()}</span>{' '}
        {m.upcoming_pack_title({ name: set.name })}{' '}
        <time
          dateTime={release.toISOString()}
          title={new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(
            release,
          )}
          className="font-black tabular-nums"
        >
          {describeAuctionRemaining(Math.max(release.getTime() - now, 1), locale)}
        </time>
      </p>
      <button
        type="button"
        className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onDismiss}
        aria-label={m.toast_dismiss()}
      >
        <XIcon className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
