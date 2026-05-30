import type { Prisma } from '@prisma/client'
import type { AuctionFilters, AuctionRequirements, CardFinish } from '@tcg-collection/shared'

const normalizeObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

const isJsonValue = (value: unknown): value is Prisma.JsonValue => {
  if (value === null) {
    return true
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue)
  }

  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value as Record<string, unknown>).every(isJsonValue)
  )
}

const normalizeStringList = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined
  }

  const values = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0)

  if (values.length === 0) {
    return undefined
  }

  return [...new Set(values)]
}

const normalizeCardFinishValue = (value: string): string => {
  return value.trim().toLowerCase().replace(/[-\s]+/g, '_')
}

const isCardFinish = (value: string): value is CardFinish =>
  value === 'normal' || value === 'holo' || value === 'reverse_holo'

const normalizeKnownCardFinish = (value: string): string => {
  if (value === 'normal' || value === 'holo' || value === 'reverse_holo') {
    return value
  }

  if (value === 'reverseholo' || value === 'reverse_holofoil' || value === 'reverse_holo_foil') {
    return 'reverse_holo'
  }

  if (value === 'holofoil' || value === 'holo_foil') {
    return 'holo'
  }

  if (value.includes('reverse')) {
    return 'reverse_holo'
  }

  if (value.includes('holo')) {
    return 'holo'
  }

  return value
}

export const normalizeCardFinish = (value: string): CardFinish | undefined => {
  const normalized = normalizeKnownCardFinish(normalizeCardFinishValue(value))

  return isCardFinish(normalized) ? normalized : undefined
}

const normalizeFinishes = (value: unknown): CardFinish[] | undefined => {
  const list = normalizeStringList(value)

  if (!list) {
    return undefined
  }

  const filtered = list.filter(isCardFinish)

  return filtered.length > 0 ? filtered : undefined
}

export const normalizeTradeRequirements = (
  value: AuctionRequirements | Prisma.JsonValue | undefined,
): AuctionRequirements => {
  const raw = normalizeObject(value)

  if (!raw) {
    return {}
  }

  return {
    cardIds: normalizeStringList(raw['cardIds']),
    setIds: normalizeStringList(raw['setIds']),
    rarities: normalizeStringList(raw['rarities']),
    types: normalizeStringList(raw['types']),
    finishes: normalizeFinishes(raw['finishes']),
  }
}

export const normalizeTradeFilters = (
  value: AuctionFilters | Prisma.JsonValue | undefined,
): AuctionFilters => {
  const raw = normalizeObject(value)

  if (!raw) {
    return {}
  }

  return {
    excludedCardIds: normalizeStringList(raw['excludedCardIds']),
    excludedSetIds: normalizeStringList(raw['excludedSetIds']),
    excludedRarities: normalizeStringList(raw['excludedRarities']),
    excludedTypes: normalizeStringList(raw['excludedTypes']),
    excludedFinishes: normalizeFinishes(raw['excludedFinishes']),
  }
}

export const normalizeTradeJsonInput = (value: unknown): Prisma.JsonObject => {
  const raw = normalizeObject(value)

  if (!raw) {
    return {}
  }

  const normalized: Prisma.JsonObject = {}
  for (const [key, itemValue] of Object.entries(raw)) {
    if (isJsonValue(itemValue)) {
      normalized[key] = itemValue
    }
  }

  return normalized
}
