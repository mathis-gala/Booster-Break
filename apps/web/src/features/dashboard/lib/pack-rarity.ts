import type { PokemonCardSummary } from '@tcg-collection/shared'
import { getPackRarityChance, pokemonRarityOrder } from '@tcg-collection/shared'
import { m } from '@/paraglide/messages'

const rarityOrder: readonly string[] = pokemonRarityOrder

export const groupCardsByRarity = (
  cards: PokemonCardSummary[],
): Array<[string, PokemonCardSummary[]]> => {
  const groups = new Map<string, PokemonCardSummary[]>()

  for (const card of cards) {
    const rarity = card.rarity ?? 'Other'
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

export const getRarityChanceLabel = (rarity: string, cards: PokemonCardSummary[]): string => {
  if (rarity === 'Common') {
    return m.packs_slots_per_pack({ count: 4 })
  }

  if (rarity === 'Uncommon') {
    return m.packs_slots_per_pack({ count: 3 })
  }

  const packChance = getPackRarityChance(rarity, cards)

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
