import type { CardFinish, PokemonCardSummary } from '@tcg-collection/shared'
import { getRarityRank } from '@tcg-collection/shared'

const UNKNOWN_RARITY_RANK = 999

/**
 * Probability multiplier per rarity tier above the recycled rarity. Rewards are
 * always at least the same rarity, with a quickly decaying chance of a higher tier.
 */
const TIER_UPGRADE_DECAY = 0.22

export interface RecycleRarityGroup {
  rarityRank: number
  rewardCount: number
}

/**
 * Draws `count` rewards for cards recycled at `rarityRank`, each pulled at a rank
 * >= the recycled rarity and weighted so the same tier is by far the most likely.
 */
export const drawRecycleRewards = (
  rarityRank: number,
  count: number,
  candidates: PokemonCardSummary[],
): PokemonCardSummary[] => {
  if (count <= 0) {
    return []
  }

  const cardsByRank = groupCandidatesByRank(rarityRank, candidates)
  const ranks = [...cardsByRank.keys()].sort((first, second) => first - second)

  if (ranks.length === 0) {
    return []
  }

  const rewards: PokemonCardSummary[] = []

  for (let index = 0; index < count; index += 1) {
    const targetRank = pickTargetRank(ranks)
    const pool = cardsByRank.get(targetRank) ?? []
    const card = pool[Math.floor(Math.random() * pool.length)]

    if (card) {
      rewards.push(withRewardFinish(card))
    }
  }

  return rewards
}

const groupCandidatesByRank = (
  minRarityRank: number,
  candidates: PokemonCardSummary[],
): Map<number, PokemonCardSummary[]> => {
  const cardsByRank = new Map<number, PokemonCardSummary[]>()

  for (const card of candidates) {
    const rank = getRarityRank(card.rarity)

    if (rank === UNKNOWN_RARITY_RANK || rank < minRarityRank) {
      continue
    }

    const pool = cardsByRank.get(rank) ?? []
    pool.push(card)
    cardsByRank.set(rank, pool)
  }

  return cardsByRank
}

const pickTargetRank = (ascendingRanks: number[]): number => {
  const weights = ascendingRanks.map((_, tierDistance) => TIER_UPGRADE_DECAY ** tierDistance)
  const totalWeight = weights.reduce((total, weight) => total + weight, 0)
  let roll = Math.random() * totalWeight

  for (let index = 0; index < ascendingRanks.length; index += 1) {
    roll -= weights[index]

    if (roll <= 0) {
      return ascendingRanks[index]
    }
  }

  return ascendingRanks[0]
}

const withRewardFinish = (card: PokemonCardSummary): PokemonCardSummary => ({
  ...card,
  finish: pickRewardFinish(card),
})

const pickRewardFinish = (card: PokemonCardSummary): CardFinish => {
  const finishes = card.finishes ?? []

  if (finishes.length === 0) {
    return 'normal'
  }

  return finishes[Math.floor(Math.random() * finishes.length)]
}
