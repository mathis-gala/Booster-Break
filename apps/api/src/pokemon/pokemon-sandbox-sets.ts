import type { Set } from '@tcgdex/sdk'
import { SANDBOX_PACK_OPEN_MAX_YEAR, SANDBOX_PACK_OPEN_MIN_YEAR } from './pokemon-config'

type SandboxSetCandidate = Pick<Set, 'id' | 'name' | 'releaseDate'>

export const getSandboxSetDateRange = () => ({
  fromDate: `${SANDBOX_PACK_OPEN_MIN_YEAR}-01-01`,
  toDate: `${SANDBOX_PACK_OPEN_MAX_YEAR}-12-31`,
})

export const getSandboxSetReleaseYear = (set: Pick<Set, 'releaseDate'>): number | undefined => {
  const releaseYear = Number(set.releaseDate.slice(0, 4))

  return Number.isNaN(releaseYear) ? undefined : releaseYear
}

export const isSandboxBoosterSet = (set: SandboxSetCandidate): boolean => {
  const releaseYear = getSandboxSetReleaseYear(set)

  return (
    releaseYear !== undefined &&
    releaseYear >= SANDBOX_PACK_OPEN_MIN_YEAR &&
    releaseYear <= SANDBOX_PACK_OPEN_MAX_YEAR &&
    isMainBoosterExpansionId(set.id) &&
    !isExcludedSupplementalSet(set.name)
  )
}

export const compareSetsByNewestRelease = (
  first: Pick<Set, 'releaseDate'>,
  second: Pick<Set, 'releaseDate'>,
): number => second.releaseDate.localeCompare(first.releaseDate)

const isMainBoosterExpansionId = (setId: string): boolean => {
  return /^(ecard|ex|dp|pl|hgss|bw|xy|sm|swsh)\d+$/.test(setId) || /^xy[1-9]\d*$/.test(setId)
}

const isExcludedSupplementalSet = (setName: string): boolean => {
  const normalizedName = setName.toLowerCase()

  return (
    normalizedName.includes("mcdonald's") ||
    normalizedName.includes('trainer kit') ||
    normalizedName.includes('black star promos') ||
    normalizedName.includes('pop series') ||
    normalizedName.includes('radiant collection') ||
    normalizedName.includes('starter set')
  )
}
