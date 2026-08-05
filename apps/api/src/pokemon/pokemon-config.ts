export const POKEMON_SYNC_START_DATE = '2024-01-01'
export const SYNCED_BOOSTER_LIMIT = 8
export const PINNED_MODERN_BOOSTER_SET_IDS = ['me05', 'me04'] as const
export const FEATURED_HISTORICAL_BOOSTER_SET_IDS = ['swsh12.5'] as const
export const DISABLED_BOOSTER_SET_IDS: readonly string[] = ['me05']
export const REQUIRED_AVAILABLE_BOOSTER_SETS = {
  me04: 122,
  'swsh12.5': 230,
} as const
export const isBoosterOpeningEnabled = (setId: string): boolean =>
  !DISABLED_BOOSTER_SET_IDS.includes(setId)
export const PACK_OPEN_COOLDOWN_SECONDS = 2 * 60 * 60
export const MAX_OVERLOAD_BOOSTERS = 1
export const SANDBOX_PACK_OPEN_MIN_YEAR = 2003
export const SANDBOX_PACK_OPEN_MAX_YEAR = 2022
export const SANDBOX_PACK_OPEN_COOLDOWN_SECONDS = 5
