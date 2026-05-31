import { Prisma } from '@prisma/client'
import type {
  AuctionFilters,
  AuctionRequirements,
  CardFinish,
  TradeOfferStatus,
  TradeNotificationType,
} from '@tcg-collection/shared'
import type { AppPrisma } from '../db/prisma'
import {
  MAX_ACTIVE_AUCTIONS_PER_USER,
  MAX_PENDING_OFFERS_PER_AUCTION_BY_USER,
} from './trade-config'
import {
  tradeAuctionCardInclude,
  tradeAuctionIdSelect,
  tradeAuctionWithOffersInclude,
  tradeOfferWithAuctionAndCardsInclude,
  tradeNotificationSelect,
  tradePokemonCardsByIdsSelect,
  tradeUserCardQuantitySelect,
  type TradeAuctionWithCardPayload,
  type TradeAuctionWithOffersPayload,
  type TradeOfferWithAuctionPayload,
} from './trade-repository-selectors'
import { mapTradeAuctionWithOffers, mapTradeOfferWithAuction } from './trade-mappers'
import type {
  TradeAuctionCardSummary,
  TradeAuctionRow,
  TradeAuctionWithOffers,
  CreateTradeAuctionCommand,
  CreateTradeOfferCommand,
  TradeOfferRow,
  TradeNotificationRow,
  TradeRepository,
  TradeRepositoryError,
  TradeRepositoryNotificationInput,
} from './trade-types'
import { TradeRepositoryErrorException } from './trade-types'
import {
  normalizeTradeFilters,
  normalizeTradeJsonInput,
  normalizeTradeRequirements,
  normalizeCardFinish,
} from './trade-normalizers'

export class PrismaTradeRepository implements TradeRepository {
  constructor(private readonly db: AppPrisma) {}

  async cleanupExpiredAuctions(referenceDate: Date): Promise<number> {
    const result = await this.db.tradeAuction.updateMany({
      where: {
        status: 'active',
        expiresAt: {
          lte: referenceDate,
        },
      },
      data: {
        status: 'expired',
        updatedAt: referenceDate,
      },
    })

    return result.count
  }

  async countActiveAuctionsByCreator(creatorId: string): Promise<number> {
    return this.db.tradeAuction.count({
      where: {
        creatorId,
        status: 'active',
      },
    })
  }

  async isCardInActiveAuction(
    offeredCardId: string,
    offeredCardFinish: CardFinish,
  ): Promise<boolean> {
    const auction = await this.db.tradeAuction.findFirst({
      where: {
        offeredCardId,
        offeredCardFinish,
        status: 'active',
      },
      select: tradeAuctionIdSelect,
    })

    return Boolean(auction)
  }

  async createAuction(input: CreateTradeAuctionCommand): Promise<TradeAuctionRow> {
    return this.db.$transaction(async (tx) => {
      const activeAuctionsCount = await tx.tradeAuction.count({
        where: {
          creatorId: input.creatorId,
          status: 'active',
        },
      })

      if (activeAuctionsCount >= MAX_ACTIVE_AUCTIONS_PER_USER) {
        throw new TradeRepositoryErrorException('max_auctions_reached')
      }

      const activeCardAuction = await tx.tradeAuction.findFirst({
        where: {
          offeredCardId: input.offeredCardId,
          offeredCardFinish: input.offeredCardFinish,
          status: 'active',
        },
        select: tradeAuctionIdSelect,
      })

      if (activeCardAuction) {
        throw new TradeRepositoryErrorException('card_in_auction')
      }

      const offeredCardQuantity = await tx.userCard.findUnique({
        where: {
          userId_cardId_finish: {
            userId: input.creatorId,
            cardId: input.offeredCardId,
            finish: input.offeredCardFinish,
          },
        },
        select: tradeUserCardQuantitySelect,
      })

      if (!offeredCardQuantity || offeredCardQuantity.quantity < 1) {
        throw new TradeRepositoryErrorException('card_not_owned')
      }

      const created: TradeAuctionWithCardPayload = await tx.tradeAuction.create({
        data: {
          id: crypto.randomUUID(),
          creatorId: input.creatorId,
          offeredCardId: input.offeredCardId,
          offeredCardFinish: input.offeredCardFinish,
          requirements: normalizeTradeJsonInput(input.requirements),
          filters: normalizeTradeJsonInput(input.filters),
          status: 'active',
          expiresAt: input.expiresAt,
        },
        include: tradeAuctionCardInclude,
      })

      return this.normalizeAuctionRow(created)
    })
  }

  async listActiveAuctions(): Promise<TradeAuctionRow[]> {
    const auctions: TradeAuctionWithCardPayload[] = await this.db.tradeAuction.findMany({
      where: {
        status: 'active',
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: tradeAuctionCardInclude,
    })

    return auctions.map((auction) => this.normalizeAuctionRow(auction))
  }

  async getAuctionById(
    auctionId: string,
    includeOffers = false,
  ): Promise<TradeAuctionRow | TradeAuctionWithOffers | null> {
    if (includeOffers) {
      const auction: TradeAuctionWithOffersPayload | null = await this.db.tradeAuction.findUnique({
        where: {
          id: auctionId,
        },
        include: {
          ...tradeAuctionCardInclude,
          ...tradeAuctionWithOffersInclude,
        },
      })

      if (!auction) {
        return null
      }

      return this.normalizeAuctionRow(mapTradeAuctionWithOffers(auction))
    }

    const auction: TradeAuctionWithCardPayload | null = await this.db.tradeAuction.findUnique({
      where: {
        id: auctionId,
      },
      include: tradeAuctionCardInclude,
    })

    if (!auction) {
      return null
    }

    return this.normalizeAuctionRow(auction)
  }

  async cancelAuction(auctionId: string, creatorId: string): Promise<boolean> {
    return this.db.$transaction(async (tx) => {
      const updatedAuction = await tx.tradeAuction.updateMany({
        where: {
          id: auctionId,
          creatorId,
          status: 'active',
        },
        data: {
          status: 'cancelled',
          updatedAt: new Date(),
        },
      })

      if (updatedAuction.count === 0) {
        return false
      }

      await tx.tradeOffer.updateMany({
        where: {
          auctionId,
          status: 'pending',
        },
        data: {
          status: 'cancelled',
          updatedAt: new Date(),
        },
      })

      return true
    })
  }

  async countPendingOffersByUser(auctionId: string, proposerId: string): Promise<number> {
    return this.db.tradeOffer.count({
      where: {
        auctionId,
        proposerId,
        status: 'pending',
      },
    })
  }

  async createOffer(input: CreateTradeOfferCommand): Promise<{ id: string }> {
    if (input.cards.length === 0) {
      throw new TradeRepositoryErrorException('offer_invalid')
    }

    return this.db.$transaction(async (tx) => {
      const auction = await tx.tradeAuction.findUnique({
        where: {
          id: input.auctionId,
        },
        select: {
          creatorId: true,
          status: true,
          expiresAt: true,
        },
      })

      if (!auction) {
        throw new TradeRepositoryErrorException('auction_not_found')
      }

      if (auction.status !== 'active') {
        throw new TradeRepositoryErrorException('auction_closed')
      }

      if (auction.creatorId === input.proposerId) {
        throw new TradeRepositoryErrorException('cannot_trade_self')
      }

      if (auction.expiresAt.getTime() <= input.now.getTime()) {
        await tx.tradeAuction.update({
          where: {
            id: input.auctionId,
          },
          data: {
            status: 'expired',
            updatedAt: input.now,
          },
        })
        throw new TradeRepositoryErrorException('auction_expired')
      }

      const pendingOffersCount = await tx.tradeOffer.count({
        where: {
          auctionId: input.auctionId,
          proposerId: input.proposerId,
          status: 'pending',
        },
      })

      if (pendingOffersCount >= MAX_PENDING_OFFERS_PER_AUCTION_BY_USER) {
        throw new TradeRepositoryErrorException('max_offers_reached')
      }

      const created = await tx.tradeOffer.create({
        data: {
          id: crypto.randomUUID(),
          auctionId: input.auctionId,
          proposerId: input.proposerId,
          status: 'pending',
          cards: {
            create: input.cards.map((card) => ({ ...card })),
          },
        },
      })

      return { id: created.id }
    })
  }

  async getOfferById(offerId: string): Promise<TradeOfferRow | null> {
    const offer: TradeOfferWithAuctionPayload | null = await this.db.tradeOffer.findUnique({
      where: {
        id: offerId,
      },
      include: tradeOfferWithAuctionAndCardsInclude,
    })

    if (!offer) {
      return null
    }

    return mapTradeOfferWithAuction(offer)
  }

  async updateOfferStatus(offerId: string, status: TradeOfferStatus): Promise<boolean> {
    const result = await this.db.tradeOffer.updateMany({
      where: {
        id: offerId,
        status: {
          notIn: ['accepted', 'rejected'],
        },
      },
      data: {
        status,
        updatedAt: new Date(),
      },
    })

    return result.count > 0
  }

  async acceptOffer(
    auctionId: string,
    offerId: string,
    now: Date,
  ): Promise<
    | { ok: true }
    | { ok: false; error: TradeRepositoryError | 'trade_unavailable'; reason?: string }
  > {
    try {
      await this.db.$transaction(async (tx) => {
        const offer = await tx.tradeOffer.findFirst({
          where: {
            id: offerId,
            auctionId,
          },
          include: tradeOfferWithAuctionAndCardsInclude,
        })

        if (!offer) {
          throw new TradeRepositoryErrorException('offer_not_found')
        }

        if (!offer.auction) {
          throw new TradeRepositoryErrorException('auction_not_found')
        }

        if (offer.status !== 'pending') {
          throw new TradeRepositoryErrorException('offer_invalid')
        }

        if (offer.auction.status !== 'active') {
          throw new TradeRepositoryErrorException('auction_closed')
        }

        if (offer.auction.expiresAt.getTime() <= now.getTime()) {
          await tx.tradeAuction.update({
            where: {
              id: auctionId,
            },
            data: {
              status: 'expired',
              updatedAt: now,
            },
          })
          throw new TradeRepositoryErrorException('auction_expired')
        }

        if (offer.cards.length === 0) {
          throw new TradeRepositoryErrorException('offer_invalid')
        }

        const offerMarked = await tx.tradeOffer.updateMany({
          where: {
            id: offerId,
            status: 'pending',
          },
          data: {
            status: 'accepted',
            updatedAt: now,
          },
        })

        if (offerMarked.count === 0) {
          throw new TradeRepositoryErrorException('offer_invalid')
        }

        const auctionMarked = await tx.tradeAuction.updateMany({
          where: {
            id: auctionId,
            status: 'active',
          },
          data: {
            status: 'accepted',
            updatedAt: now,
          },
        })

        if (auctionMarked.count === 0) {
          throw new TradeRepositoryErrorException('auction_closed')
        }

        const sellerHasCard = await this.decrementUserCardQuantity(tx, {
          userId: offer.auction.creatorId,
          cardId: offer.auction.offeredCardId,
          finish: normalizeTradeCardFinish(offer.auction.offeredCardFinish),
          quantity: 1,
        })

        if (!sellerHasCard) {
          throw new TradeRepositoryErrorException('card_not_owned')
        }

        await this.incrementUserCardQuantity(tx, {
          userId: offer.proposerId,
          cardId: offer.auction.offeredCardId,
          finish: normalizeTradeCardFinish(offer.auction.offeredCardFinish),
          quantity: 1,
        })

        for (const item of offer.cards) {
          const normalizedFinish = normalizeTradeCardFinish(item.finish)
          const sellerGives = await this.decrementUserCardQuantity(tx, {
            userId: offer.proposerId,
            cardId: item.cardId,
            finish: normalizedFinish,
            quantity: item.quantity,
          })

          if (!sellerGives) {
            throw new TradeRepositoryErrorException('card_not_owned')
          }

          await this.incrementUserCardQuantity(tx, {
            userId: offer.auction.creatorId,
            cardId: item.cardId,
            finish: normalizedFinish,
            quantity: item.quantity,
          })
        }

        await tx.tradeOffer.updateMany({
          where: {
            auctionId,
            status: 'pending',
            id: {
              not: offerId,
            },
          },
          data: {
            status: 'rejected',
            updatedAt: now,
          },
        })
      })

      return { ok: true }
    } catch (error: unknown) {
      if (error instanceof TradeRepositoryErrorException) {
        return {
          ok: false,
          error: error.code,
        }
      }

      console.error('Unexpected error while accepting trade offer', {
        auctionId,
        offerId,
        error: error instanceof Error ? error.message : error,
      })
      return {
        ok: false,
        error: 'trade_unavailable',
        reason: error instanceof Error ? error.message : 'Unexpected repository error',
      }
    }
  }

  async findCards(cardIds: string[]): Promise<TradeAuctionCardSummary[]> {
    if (cardIds.length === 0) {
      return []
    }

    return this.db.pokemonCard.findMany({
      where: {
        id: {
          in: cardIds,
        },
      },
      select: tradePokemonCardsByIdsSelect,
    })
  }

  async getUserCardQuantity(
    userId: string,
    cardId: string,
    finish: CardFinish,
  ): Promise<number | undefined> {
    const userCard = await this.db.userCard.findUnique({
      where: {
        userId_cardId_finish: {
          userId,
          cardId,
          finish,
        },
      },
      select: tradeUserCardQuantitySelect,
    })

    return userCard?.quantity
  }

  async listTradeNotifications(userId: string): Promise<TradeNotificationRow[]> {
    try {
      const notifications = await this.db.tradeNotification.findMany({
        where: {
          userId,
          viewed: false,
        },
        select: tradeNotificationSelect,
        orderBy: {
          createdAt: 'desc',
        },
      })

      return notifications.map((notification) => ({
        ...notification,
        type: notification.type as TradeNotificationType,
        viewed: notification.viewed ?? false,
        payload: notification.payload as TradeNotificationRow['payload'],
      }))
    } catch (error: unknown) {
      if (this.isNotificationTableMissing(error)) {
        return []
      }

      throw error
    }
  }

  async markTradeNotificationViewed(notificationId: string, userId: string): Promise<boolean> {
    try {
      const updated = await this.db.tradeNotification.updateMany({
        where: {
          id: notificationId,
          userId,
          viewed: false,
        },
        data: {
          viewed: true,
          updatedAt: new Date(),
        },
      })

      return updated.count === 1
    } catch (error: unknown) {
      if (this.isNotificationTableMissing(error)) {
        return false
      }

      throw error
    }
  }

  async createTradeNotification(input: TradeRepositoryNotificationInput): Promise<TradeNotificationRow> {
    const created = await this.db.tradeNotification.create({
      data: {
        id: crypto.randomUUID(),
        userId: input.userId,
        type: input.type,
        message: input.message,
        payload: input.payload,
      },
      select: tradeNotificationSelect,
    })

    return {
      ...created,
      type: created.type as TradeNotificationType,
      payload: created.payload as TradeNotificationRow['payload'],
    }
  }

  private normalizeAuctionRow<
    T extends {
      requirements: AuctionRequirements | Prisma.JsonValue
      filters: AuctionFilters | Prisma.JsonValue
      offeredCardFinish: string
    },
  >(
    row: T,
  ): Omit<T, 'requirements' | 'filters' | 'offeredCardFinish'> & {
    requirements: AuctionRequirements
    filters: AuctionFilters
    offeredCardFinish: CardFinish
  } {
    return {
      ...row,
      requirements: normalizeTradeRequirements(row.requirements),
      filters: normalizeTradeFilters(row.filters),
      offeredCardFinish: normalizeTradeCardFinish(row.offeredCardFinish),
    }
  }

  private isNotificationTableMissing(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2021' &&
      /trade_notifications/.test(error.message)
    )
  }

  private async decrementUserCardQuantity(
    tx: AppPrisma | Prisma.TransactionClient,
    input: {
      userId: string
      cardId: string
      finish: CardFinish
      quantity: number
    },
  ): Promise<boolean> {
    const result = await tx.userCard.updateMany({
      where: {
        userId: input.userId,
        cardId: input.cardId,
        finish: input.finish,
        quantity: {
          gte: input.quantity,
        },
      },
      data: {
        quantity: {
          decrement: input.quantity,
        },
        updatedAt: new Date(),
      },
    })

    return result.count === 1
  }

  private async incrementUserCardQuantity(
    tx: AppPrisma | Prisma.TransactionClient,
    input: {
      userId: string
      cardId: string
      finish: CardFinish
      quantity: number
    },
  ): Promise<void> {
    await tx.userCard.upsert({
      where: {
        userId_cardId_finish: {
          userId: input.userId,
          cardId: input.cardId,
          finish: input.finish,
        },
      },
      create: {
        userId: input.userId,
        cardId: input.cardId,
        finish: input.finish,
        quantity: input.quantity,
        firstCollectedAt: new Date(),
        updatedAt: new Date(),
      },
      update: {
        quantity: {
          increment: input.quantity,
        },
        updatedAt: new Date(),
      },
    })
  }
}

const normalizeTradeCardFinish = (value: string): CardFinish => {
  const normalized = normalizeCardFinish(value)

  if (!normalized) {
    console.error('Unsupported trade card finish value', {
      value,
    })
    throw new TradeRepositoryErrorException('trade_unavailable')
  }

  return normalized
}
