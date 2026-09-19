import { useEffect, useReducer, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { XIcon } from 'lucide-react'
import type { UpcomingPokemonSet } from '@tcg-collection/shared'

import { packOpenClock } from '../lib/pack-open-clock'
import { pokemonQueryKeys } from '../lib/query-keys'
import { formatCountdown } from '../time'
import { useLocale } from '@/features/i18n/useLocale'
import { m } from '@/paraglide/messages'

// Module-level: a closed teaser stays closed across views, and returns on reload.
const dismissedSetIds = new Set<string>()

const RELEASE_RECHECK_MS = 5_000
const MAX_TIMEOUT_MS = 2_147_483_647

interface UpcomingPackBannerProps {
  sets: UpcomingPokemonSet[]
  dataUpdatedAt: number
}

export function UpcomingPackBanner({ sets, dataUpdatedAt }: UpcomingPackBannerProps) {
  const queryClient = useQueryClient()
  const [, forceRender] = useReducer((tick: number) => tick + 1, 0)
  const nextReleaseAt =
    sets.length > 0 ? Math.min(...sets.map((set) => new Date(set.releasesAt).getTime())) : undefined

  // Kept in the parent so closing the banner can't stop it. dataUpdatedAt re-arms it.
  useEffect(() => {
    if (nextReleaseAt === undefined) {
      return
    }

    const timerId = window.setTimeout(
      () => queryClient.invalidateQueries({ queryKey: pokemonQueryKeys.setsAll }),
      Math.min(Math.max(nextReleaseAt - Date.now() + 1_000, RELEASE_RECHECK_MS), MAX_TIMEOUT_MS),
    )

    return () => window.clearTimeout(timerId)
  }, [nextReleaseAt, dataUpdatedAt, queryClient])

  const visibleSets = sets.filter((set) => !dismissedSetIds.has(set.id))

  if (visibleSets.length === 0) {
    return null
  }

  return (
    <aside className="pointer-events-none fixed inset-x-0 top-[4.5rem] z-20 flex flex-col items-center gap-2 px-3 md:top-3 md:left-44">
      {visibleSets.map((set) => (
        <UpcomingPackRow
          key={set.id}
          set={set}
          onDismiss={() => {
            dismissedSetIds.add(set.id)
            forceRender()
          }}
        />
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
  const { locale } = useLocale()
  const release = new Date(set.releasesAt)
  const countdown = formatCountdown(release.getTime() - now, locale)

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
          className="font-black"
        >
          <span className="sr-only">{countdown}</span>
          {/* 1ch cells: the fallback font ignores tabular-nums. */}
          <span aria-hidden="true">
            {[...countdown].map((character, index) =>
              /\d/.test(character) ? (
                <span key={index} className="inline-block w-[1ch] text-center">
                  {character}
                </span>
              ) : (
                character
              ),
            )}
          </span>
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
