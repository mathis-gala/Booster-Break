import type { PackRarityChance, PokemonCardSummary } from '@tcg-collection/shared'
import {
  PACK_SLOT_COUNTS,
  getPackRarityChances,
  normalizeRarity,
  pokemonRarityOrder,
} from '@tcg-collection/shared'
import { m } from '@/paraglide/messages'

const rarityOrder: readonly string[] = pokemonRarityOrder

export const groupCardsByRarity = (
  cards: PokemonCardSummary[],
): Array<[string, PokemonCardSummary[]]> => {
  const groups = new Map<string, PokemonCardSummary[]>()

  for (const card of cards) {
    const rarity = getNormalizedPreviewRarity(card.rarity)
    groups.set(rarity, [...(groups.get(rarity) ?? []), card])
  }

  return Array.from(groups.entries()).sort(([firstRarity], [secondRarity]) => {
    const firstIndex = rarityOrder.indexOf(firstRarity)
    const secondIndex = rarityOrder.indexOf(secondRarity)

    if (firstIndex === -1 && secondIndex === -1) {
      return firstRarity.localeCompare(secondRarity)
    }

    if (firstIndex === -1) {
      return 1
    }

    if (secondIndex === -1) {
      return -1
    }

    return firstIndex - secondIndex
  })
}

const getNormalizedPreviewRarity = (rarity: string | undefined): string => {
  return rarity && rarity !== 'None' ? rarity : 'Other'
}

// Builds a normalized-rarity -> per-pack chance (%) lookup from the set's cards.
// Compute this ONCE (memoized) and pass it to getRarityChanceLabel per rarity group.
export const buildRarityChanceLookup = (cards: PokemonCardSummary[]): Map<string, number> => {
  const chances: PackRarityChance[] = getPackRarityChances(cards)

  return new Map(chances.map((entry) => [normalizeRarity(entry.rarity), entry.chancePerPack]))
}

export const getRarityChanceLabel = (
  rarity: string,
  chanceByRarity: Map<string, number>,
): string => {
  if (rarity === 'Common') {
    return m.packs_slots_per_pack({ count: PACK_SLOT_COUNTS.common })
  }

  if (rarity === 'Uncommon') {
    return m.packs_slots_per_pack({ count: PACK_SLOT_COUNTS.uncommon })
  }

  const packChance = chanceByRarity.get(normalizeRarity(rarity)) ?? 0

  return m.packs_rate_per_pack({ rate: `${formatChance(packChance)}%` })
}

const formatChance = (chance: number): string => {
  if (chance === 0) {
    return '0%'
  }

  if (chance < 0.01) {
    return '<0.01'
  }

  if (chance < 1) {
    return chance.toFixed(2)
  }

  return chance.toFixed(1)
}
