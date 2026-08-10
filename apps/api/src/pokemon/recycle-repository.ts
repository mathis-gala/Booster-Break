import type { PokemonCardSummary, SupportedLocale } from '@tcg-collection/shared'
import { getRaritiesAtOrAboveRank } from '@tcg-collection/shared'
import type { Prisma } from '@prisma/client'
import type { AppPrisma } from '../db/prisma'
import { toCardSummary } from './pokemon-mappers'
import { listReservedCardQuantities } from './trade-reservations'
import { listOwnedCardIdsForCards } from './user-card-ownership'

export interface RecycleCardCopies {
  cardId: string
  finish: string
  quantity: number
}

export interface OwnedRecycleRow extends RecycleCardCopies {
  rarity: string | null
}

export class RecycleConflictError extends Error {
  constructor() {
    super('Collection changed during recycling')
    this.name = 'RecycleConflictError'
  }
}

export class RecycleRepository {
  constructor(private readonly db: AppPrisma) {}

  async listRecycleRewardCandidates(
    minRarityRank: number,
    locale: SupportedLocale = 'fr',
  ): Promise<PokemonCardSummary[]> {
    const cards = await this.db.pokemonCard.findMany({
      where: {
        rarity: {
          in: getRaritiesAtOrAboveRank(minRarityRank),
        },
      },
      select: {
        id: true,
        setId: true,
        localId: true,
        name: true,
        nameEn: true,
        nameFr: true,
        rarity: true,
        category: true,
        rawJson: true,
        imageSmall: true,
        imageLarge: true,
      },
    })

    return cards.map((card) => toCardSummary(card, undefined, locale))
  }

  async listOwnedRecycleRows(userId: string, cardIds: string[]): Promise<OwnedRecycleRow[]> {
    if (cardIds.length === 0) {
      return []
    }

    const rows = await this.db.userCard.findMany({
      where: {
        userId,
        cardId: {
          in: cardIds,
        },
        quantity: {
          gt: 0,
        },
      },
      include: {
        card: {
          select: {
            rarity: true,
          },
        },
      },
    })

    return rows.map((row) => ({
      cardId: row.cardId,
      finish: row.finish,
      quantity: row.quantity,
      rarity: row.card.rarity,
    }))
  }

  async listRecycleReservedQuantities(
    userId: string,
    cardIds: string[],
  ): Promise<RecycleCardCopies[]> {
    return listReservedCardQuantities(this.db, userId, cardIds)
  }

  async recycleCards(
    userId: string,
    consumed: RecycleCardCopies[],
    rewards: PokemonCardSummary[],
  ): Promise<{ newCardIds: string[] }> {
    const now = new Date()
    const newCardIds = new Set<string>()

    await this.db.$transaction(async (tx) => {
      const previouslyOwned = await listOwnedCardIdsForCards(
        tx,
        userId,
        rewards.map((card) => card.id),
      )

      for (const card of rewards) {
        if (!previouslyOwned.has(card.id)) {
          newCardIds.add(card.id)
        }
      }

      for (const item of consumed) {
        const consumedCopies = await this.consumeUserCardCopies(tx, userId, item)

        if (!consumedCopies) {
          throw new RecycleConflictError()
        }
      }

      for (const card of rewards) {
        await tx.userCard.upsert({
          where: {
            userId_cardId_finish: {
              userId,
              cardId: card.id,
              finish: card.finish ?? 'normal',
            },
          },
          create: {
            userId,
            cardId: card.id,
            finish: card.finish ?? 'normal',
            quantity: 1,
            firstCollectedAt: now,
            updatedAt: now,
          },
          update: {
            quantity: {
              increment: 1,
            },
            updatedAt: now,
          },
        })
      }
    })

    return { newCardIds: [...newCardIds] }
  }

  private async consumeUserCardCopies(
    tx: Prisma.TransactionClient,
    userId: string,
    item: RecycleCardCopies,
  ): Promise<boolean> {
    const decremented = await tx.userCard.updateMany({
      where: {
        userId,
        cardId: item.cardId,
        finish: item.finish,
        quantity: {
          gt: item.quantity,
        },
      },
      data: {
        quantity: {
          decrement: item.quantity,
        },
      },
    })

    if (decremented.count === 1) {
      return true
    }

    const deleted = await tx.userCard.deleteMany({
      where: {
        userId,
        cardId: item.cardId,
        finish: item.finish,
        quantity: item.quantity,
      },
    })

    return deleted.count === 1
  }
}
