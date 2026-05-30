import type {
  AuctionFilters,
  AuctionRequirements,
  CardFinish,
  SupportedLocale,
} from '@tcg-collection/shared'
import { DEFAULT_LOCALE } from '@tcg-collection/shared'
import { m } from '@/paraglide/messages'
import { formatCardFinish } from '@/features/dashboard/lib/card-format'
import { formatRarity } from '@/features/i18n/rarity-labels'

export const MAX_ACTIVE_AUCTIONS_PER_USER = 3
export const MAX_PENDING_OFFERS_PER_AUCTION_BY_USER = 5

export interface TradeTextListFields {
  setIds: string[]
  rarities: string[]
  types: string[]
  finishes: string[]
}

const normalizeTradeType = (type: string): string => {
  return type
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

export const formatTradeType = (type: string | undefined | null): string => {
  const normalized = normalizeTradeType(type ?? '')

  switch (normalized) {
    case 'pokemon':
    case 'pokémon':
      return m.trade_pokemon_type()
    case 'trainer':
      return m.trade_trainer_type()
    case 'energy':
      return m.trade_energy_type()
    default:
      return type || m.trade_other_type()
  }
}

export const toCardFinish = (value: string | undefined | null): CardFinish => {
  if (value === 'holo' || value === 'reverse_holo' || value === 'normal') {
    return value
  }

  return 'normal'
}

export const toAuctionRequirementsPayload = (
  fields: TradeTextListFields,
): AuctionRequirements | undefined => {
  const payload: AuctionRequirements = {
    setIds: fields.setIds,
    rarities: fields.rarities,
    types: fields.types,
    finishes: fields.finishes.filter(
      (value) => value === 'normal' || value === 'holo' || value === 'reverse_holo',
    ),
  }

  if (Object.values(payload).every((items) => !items || items.length === 0)) {
    return undefined
  }

  return payload
}

export const toAuctionFiltersPayload = (
  fields: TradeTextListFields,
): AuctionFilters | undefined => {
  const payload: AuctionFilters = {
    excludedSetIds: fields.setIds,
    excludedRarities: fields.rarities,
    excludedTypes: fields.types,
    excludedFinishes: fields.finishes.filter(
      (value): value is CardFinish =>
        value === 'normal' || value === 'holo' || value === 'reverse_holo',
    ),
  }

  if (Object.values(payload).every((items) => !items || items.length === 0)) {
    return undefined
  }

  return payload
}

export const getAuctionRemainingMs = (expiresAt: string, now = Date.now()): number => {
  return Math.max(0, new Date(expiresAt).getTime() - now)
}

export const describeAuctionRemaining = (
  remainingMs: number,
  locale: SupportedLocale = DEFAULT_LOCALE,
): string => {
  if (remainingMs <= 0) {
    return m.trade_auction_expired()
  }

  const totalSeconds = Math.floor(remainingMs / 1000)
  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const dayUnit = locale === 'fr' ? 'j' : 'd'

  const parts = [
    days > 0 ? `${days}${dayUnit}` : null,
    `${hours.toString().padStart(2, '0')}h`,
    `${minutes.toString().padStart(2, '0')}m`,
    `${seconds.toString().padStart(2, '0')}s`,
  ].filter(Boolean)

  return parts.join(' ')
}

export const summarizeTradeRequirements = (requirements: AuctionRequirements = {}): string => {
  const { setIds, rarities, types, finishes } = requirements
  const tokens = [
    ...(setIds?.map((setId) => `${m.trade_requirement_set_label()}: ${setId}`) ?? []),
    ...(rarities?.map(
      (rarity) => `${m.trade_requirement_rarity_label()}: ${formatRarity(rarity)}`,
    ) ?? []),
    ...(types?.map((type) => `${m.trade_requirement_type_label()}: ${formatTradeType(type)}`) ??
      []),
    ...(finishes?.map(
      (finish) => `${m.trade_requirement_finish_label()}: ${formatCardFinish(finish)}`,
    ) ?? []),
  ]

  return tokens.length > 0 ? tokens.join(', ') : m.trade_any_card()
}

export const summarizeTradeFilters = (filters: AuctionFilters = {}): string => {
  const { excludedSetIds, excludedRarities, excludedTypes, excludedFinishes } = filters

  const tokens = [
    ...(excludedSetIds?.map((setId) => `${m.trade_filter_set_label()}: ${setId}`) ?? []),
    ...(excludedRarities?.map(
      (rarity) => `${m.trade_filter_rarity_label()}: ${formatRarity(rarity)}`,
    ) ?? []),
    ...(excludedTypes?.map((type) => `${m.trade_filter_type_label()}: ${formatTradeType(type)}`) ??
      []),
    ...(excludedFinishes?.map(
      (finish) => `${m.trade_filter_finish_label()}: ${formatCardFinish(finish)}`,
    ) ?? []),
  ]

  return tokens.length > 0 ? tokens.join(', ') : m.trade_no_restriction()
}

export const offerCardKey = (cardId: string, finish: CardFinish | null | undefined): string => {
  return `${cardId}:${finish ?? 'normal'}`
}
