import type { AuctionFilters, AuctionRequirements } from '@tcg-collection/shared'
import { formatCardFinish } from '@/features/dashboard/lib/card-format'
import { formatRarity } from '@/features/i18n/rarity-labels'
import { m } from '@/paraglide/messages'
import { formatTradeType } from './trade-utils'

export type TradeConstraintBadgeItem = {
  id: string
  label: string
  value: string
  kind: 'set' | 'rarity' | 'type' | 'finish'
  displayValue: string
}

export const getTradeFilterBadges = (
  filters: AuctionFilters = {},
  getSetName: (setId: string) => string,
): TradeConstraintBadgeItem[] => {
  const { excludedSetIds, excludedRarities, excludedTypes, excludedFinishes } = filters

  return [
    ...(excludedSetIds ?? []).map((setId) => ({
      id: `excluded-set:${setId}`,
      label: m.trade_filter_set_label(),
      value: setId,
      kind: 'set' as const,
      displayValue: getSetName(setId),
    })),
    ...(excludedRarities ?? []).map((rarity) => ({
      id: `excluded-rarity:${rarity}`,
      label: m.trade_filter_rarity_label(),
      value: rarity,
      kind: 'rarity' as const,
      displayValue: formatRarity(rarity),
    })),
    ...(excludedTypes ?? []).map((type) => ({
      id: `excluded-type:${type}`,
      label: m.trade_filter_type_label(),
      value: type,
      kind: 'type' as const,
      displayValue: formatTradeType(type),
    })),
    ...(excludedFinishes ?? []).map((finish) => ({
      id: `excluded-finish:${finish}`,
      label: m.trade_filter_finish_label(),
      value: finish,
      kind: 'finish' as const,
      displayValue: formatCardFinish(finish),
    })),
  ]
}

export const getTradeRequirementBadges = (
  requirements: AuctionRequirements = {},
  getSetName: (setId: string) => string,
): TradeConstraintBadgeItem[] => {
  const { setIds, rarities, types, finishes } = requirements

  return [
    ...(setIds ?? []).map((setId) => ({
      id: `requirement-set:${setId}`,
      label: m.trade_requirement_set_label(),
      value: setId,
      kind: 'set' as const,
      displayValue: getSetName(setId),
    })),
    ...(rarities ?? []).map((rarity) => ({
      id: `requirement-rarity:${rarity}`,
      label: m.trade_requirement_rarity_label(),
      value: rarity,
      kind: 'rarity' as const,
      displayValue: formatRarity(rarity),
    })),
    ...(types ?? []).map((type) => ({
      id: `requirement-type:${type}`,
      label: m.trade_requirement_type_label(),
      value: type,
      kind: 'type' as const,
      displayValue: formatTradeType(type),
    })),
    ...(finishes ?? []).map((finish) => ({
      id: `requirement-finish:${finish}`,
      label: m.trade_requirement_finish_label(),
      value: finish,
      kind: 'finish' as const,
      displayValue: formatCardFinish(finish),
    })),
  ]
}
