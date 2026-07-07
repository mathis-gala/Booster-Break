import type {
  PokemonCardSummary,
  RecycleCardsRequest,
  RecycleCardsResponse,
  SupportedLocale,
} from '@tcg-collection/shared'
import {
  DEFAULT_LOCALE,
  getRarityRank,
  RECYCLE_COST,
  UNKNOWN_RARITY_RANK,
} from '@tcg-collection/shared'
import type { AuthUser } from '../auth/types'
import { cardFinishKey } from './card-finish-key'
import type { PokemonServiceError } from './pokemon-service-error'
import { drawRecycleRewards } from './recycle-draft'
import {
  RecycleConflictError,
  type OwnedRecycleRow,
  type RecycleCardCopies,
  type RecycleRepository,
} from './recycle-repository'

export interface RecycleServiceOptions {
  recycleRepository: RecycleRepository
}

interface RecycleBucket {
  rarityRank: number
  items: RecycleCardCopies[]
  total: number
}

interface RecycleInventory {
  ownedByKey: Map<string, OwnedRecycleRow>
  reservedByKey: Map<string, number>
}

interface RecycleDraft {
  consumed: RecycleCardCopies[]
  awardedCards: PokemonCardSummary[]
}

export class RecycleService {
  constructor(private readonly options: RecycleServiceOptions) {}

  async recycle(
    user: AuthUser,
    input: RecycleCardsRequest,
  ): Promise<RecycleCardsResponse | PokemonServiceError> {
    const locale = input.locale ?? DEFAULT_LOCALE
    const items = mergeRecycleItems(input.items)

    if (items.length === 0) {
      return {
        error: 'recycle_invalid',
        message: 'Select cards to recycle.',
      }
    }

    const inventory = await this.loadInventory(user.id, items)
    const buckets = this.buildBuckets(items, inventory)

    if (!(buckets instanceof Map)) {
      return buckets
    }

    const { consumed, awardedCards } = await this.draftRewards(buckets, locale)

    if (awardedCards.length === 0) {
      return {
        error: 'recycle_nothing',
        message: `Recycle at least ${RECYCLE_COST} cards sharing the same rarity.`,
      }
    }

    return this.persistRecycle(user.id, consumed, awardedCards)
  }

  private async loadInventory(
    userId: string,
    items: RecycleCardCopies[],
  ): Promise<RecycleInventory> {
    const cardIds = [...new Set(items.map((item) => item.cardId))]
    const [ownedRows, reservedRows] = await Promise.all([
      this.options.recycleRepository.listOwnedRecycleRows(userId, cardIds),
      this.options.recycleRepository.listRecycleReservedQuantities(userId, cardIds),
    ])

    return {
      ownedByKey: new Map(ownedRows.map((row) => [cardFinishKey(row.cardId, row.finish), row])),
      reservedByKey: new Map(
        reservedRows.map((row) => [cardFinishKey(row.cardId, row.finish), row.quantity]),
      ),
    }
  }

  private buildBuckets(
    items: RecycleCardCopies[],
    { ownedByKey, reservedByKey }: RecycleInventory,
  ): Map<number, RecycleBucket> | PokemonServiceError {
    const buckets = new Map<number, RecycleBucket>()

    for (const item of items) {
      const owned = ownedByKey.get(cardFinishKey(item.cardId, item.finish))
      const reserved = reservedByKey.get(cardFinishKey(item.cardId, item.finish)) ?? 0
      const available = (owned?.quantity ?? 0) - reserved

      if (!owned || available < item.quantity) {
        const blockedByTrade = owned !== undefined && owned.quantity >= item.quantity
        return {
          error: 'recycle_invalid',
          message: blockedByTrade
            ? 'Some selected cards are reserved for an active trade. Cancel the trade or deselect them.'
            : 'You do not own enough copies of a selected card.',
        }
      }

      const rarityRank = getRarityRank(owned.rarity)

      if (rarityRank >= UNKNOWN_RARITY_RANK) {
        continue
      }

      const bucket = buckets.get(rarityRank) ?? { rarityRank, items: [], total: 0 }
      bucket.items.push(item)
      bucket.total += item.quantity
      buckets.set(rarityRank, bucket)
    }

    return buckets
  }

  private async draftRewards(
    buckets: Map<number, RecycleBucket>,
    locale: SupportedLocale,
  ): Promise<RecycleDraft> {
    let candidates: PokemonCardSummary[] | undefined
    const consumed: RecycleCardCopies[] = []
    const awardedCards: PokemonCardSummary[] = []

    const orderedBuckets = [...buckets.values()].sort(
      (first, second) => first.rarityRank - second.rarityRank,
    )

    for (const bucket of orderedBuckets) {
      const maxReward = Math.floor(bucket.total / RECYCLE_COST)

      if (maxReward <= 0) {
        continue
      }

      if (!candidates) {
        candidates = await this.options.recycleRepository.listRecycleRewardCandidates(
          bucket.rarityRank,
          locale,
        )
      }

      const rewards = drawRecycleRewards(bucket.rarityRank, maxReward, candidates)

      if (rewards.length === 0) {
        continue
      }

      consumed.push(...planRecycleConsumption(bucket.items, rewards.length * RECYCLE_COST))
      awardedCards.push(...rewards)
    }

    return { consumed, awardedCards }
  }

  private async persistRecycle(
    userId: string,
    consumed: RecycleCardCopies[],
    awardedCards: PokemonCardSummary[],
  ): Promise<RecycleCardsResponse | PokemonServiceError> {
    let newCardIds: string[]

    try {
      ;({ newCardIds } = await this.options.recycleRepository.recycleCards(
        userId,
        consumed,
        awardedCards,
      ))
    } catch (error) {
      if (error instanceof RecycleConflictError) {
        return {
          error: 'recycle_conflict',
          message: 'Your collection changed while recycling. Please try again.',
        }
      }

      throw error
    }

    const newCardIdSet = new Set(newCardIds)

    return {
      recycledCount: consumed.reduce((total, item) => total + item.quantity, 0),
      rewardCount: awardedCards.length,
      awardedCards: awardedCards.map((card) => ({
        ...card,
        isNew: newCardIdSet.has(card.id),
      })),
    }
  }
}

const mergeRecycleItems = (items: RecycleCardsRequest['items']): RecycleCardCopies[] => {
  const merged = new Map<string, RecycleCardCopies>()

  for (const item of items) {
    if (!item.cardId || item.quantity <= 0) {
      continue
    }

    const key = cardFinishKey(item.cardId, item.finish)
    const existing = merged.get(key)

    if (existing) {
      existing.quantity += item.quantity
      continue
    }

    merged.set(key, { cardId: item.cardId, finish: item.finish, quantity: item.quantity })
  }

  return [...merged.values()]
}

const planRecycleConsumption = (
  items: RecycleCardCopies[],
  amount: number,
): RecycleCardCopies[] => {
  const consumed: RecycleCardCopies[] = []
  let remaining = amount

  for (const item of items) {
    if (remaining <= 0) {
      break
    }

    const take = Math.min(remaining, item.quantity)
    consumed.push({ cardId: item.cardId, finish: item.finish, quantity: take })
    remaining -= take
  }

  return consumed
}
