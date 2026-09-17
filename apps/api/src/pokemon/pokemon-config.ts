export const POKEMON_SYNC_START_DATE = '2024-01-01'
export const SYNCED_BOOSTER_LIMIT = 8
export const PINNED_MODERN_BOOSTER_SET_IDS = ['me05', 'me04'] as const
export const FEATURED_HISTORICAL_BOOSTER_SET_IDS = ['swsh12.5'] as const
// Absolute instants: a redeploy must never shift a release.
export const SCHEDULED_BOOSTER_RELEASES: Readonly<Record<string, string>> = {
  me05: '2026-09-28T10:00:00+02:00',
}
export const BOOSTER_TEASE_MS = 7 * 24 * 60 * 60 * 1_000
export const REQUIRED_AVAILABLE_BOOSTER_SETS = {
  me05: 120,
  me04: 122,
  'swsh12.5': 230,
} as const
const getBoosterReleaseAt = (setId: string): number => Date.parse(SCHEDULED_BOOSTER_RELEASES[setId])
// NaN-safe: an unparsable instant keeps the booster locked.
export const getUnreleasedBoosterSetIds = (now = Date.now()): string[] =>
  Object.keys(SCHEDULED_BOOSTER_RELEASES).filter((setId) => !(now >= getBoosterReleaseAt(setId)))
export const getTeasedBoosterSetIds = (now = Date.now()): string[] =>
  getUnreleasedBoosterSetIds(now).filter(
    (setId) => now >= getBoosterReleaseAt(setId) - BOOSTER_TEASE_MS,
  )
export const isBoosterOpeningEnabled = (setId: string, now = Date.now()): boolean =>
  !getUnreleasedBoosterSetIds(now).includes(setId)
export const PACK_OPEN_COOLDOWN_SECONDS = 2 * 60 * 60
export const MAX_OVERLOAD_BOOSTERS = 1
export const SANDBOX_PACK_OPEN_MIN_YEAR = 2003
export const SANDBOX_PACK_OPEN_MAX_YEAR = 2022
export const SANDBOX_PACK_OPEN_COOLDOWN_SECONDS = 5
