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
  TRADE_LIST_LIMIT,
} from './trade-config'
import {
  tradeAuctionCardInclude,
  tradeAuctionIdSelect,
  buildTradeAuctionWithVisibleOffersInclude,
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
import {
  toPrismaNotificationPayload,
  toTradeNotificationPayload,
} from './trade-notification-payload-mapper'
import {
  buildTradeOfferAcceptedNotificationInput,
  buildTradeOfferReceivedNotificationInput,
} from './trade-notification-factory'
import { getOfferSignature } from './trade-offer-utils'

export class PrismaTradeRepository implements TradeRepository {
  constructor(private readonly db: AppPrisma) {}

  async cleanupExpiredAuctions(referenceDate: Date): Promise<number> {
    return this.db.$transaction(async (tx) => {
      const expiredAuctions = await tx.$queryRaw<Array<{ id: string }>>`
        UPDATE "trade_auctions"
        SET "status" = 'expired', "updated_at" = ${referenceDate}
        WHERE "status" = 'active' AND "expires_at" <= ${referenceDate}
        RETURNING "id"
      `

      if (expiredAuctions.length === 0) {
        return 0
      }

      await tx.tradeOffer.updateMany({
        where: {
          auctionId: { in: expiredAuctions.map((auction) => auction.id) },
          status: 'pending',
        },
        data: {
          status: 'cancelled',
          updatedAt: referenceDate,
        },
      })

      return expiredAuctions.length
    })
  }

  async createAuction(input: CreateTradeAuctionCommand): Promise<TradeAuctionRow> {
    try {
      return await this.db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`trade-auction-creator:${input.creatorId}`}))`

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
            creatorId: input.creatorId,
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
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new TradeRepositoryErrorException('card_in_auction')
      }

      throw error
    }
  }

  async listActiveAuctions(): Promise<TradeAuctionRow[]> {
    const auctions: TradeAuctionWithCardPayload[] = await this.db.tradeAuction.findMany({
      where: {
        status: 'active',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: TRADE_LIST_LIMIT,
      include: tradeAuctionCardInclude,
    })

    return auctions.map((auction) => this.normalizeAuctionRow(auction))
  }

  async getAuctionById(
    auctionId: string,
    viewerId?: string,
  ): Promise<TradeAuctionRow | TradeAuctionWithOffers | null> {
    if (viewerId) {
      const auction: TradeAuctionWithOffersPayload | null = await this.db.tradeAuction.findUnique({
        where: {
          id: auctionId,
        },
        include: {
          ...tradeAuctionCardInclude,
          ...buildTradeAuctionWithVisibleOffersInclude(viewerId),
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

  async createOffer(input: CreateTradeOfferCommand): Promise<TradeOfferRow> {
    if (input.cards.length === 0) {
      throw new TradeRepositoryErrorException('offer_invalid')
    }

    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`trade-offer:${input.auctionId}:${input.proposerId}`}))`

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

      const pendingOffers = await tx.tradeOffer.findMany({
        where: {
          auctionId: input.auctionId,
          proposerId: input.proposerId,
          status: 'pending',
        },
        select: {
          cards: {
            select: {
              cardId: true,
              finish: true,
              quantity: true,
            },
          },
        },
      })
      const offerSignature = getOfferSignature(input.cards)
      const duplicateOffer = pendingOffers.some(
        (pendingOffer) => getOfferSignature(pendingOffer.cards) === offerSignature,
      )

      if (duplicateOffer) {
        throw new TradeRepositoryErrorException('duplicate_offer')
      }

      const created: TradeOfferWithAuctionPayload = await tx.tradeOffer.create({
        data: {
          id: crypto.randomUUID(),
          auctionId: input.auctionId,
          proposerId: input.proposerId,
          status: 'pending',
          cards: {
            create: input.cards.map((card) => ({ ...card })),
          },
        },
        include: tradeOfferWithAuctionAndCardsInclude,
      })
      const offer = mapTradeOfferWithAuction(created)

      await this.insertTradeNotification(tx, buildTradeOfferReceivedNotificationInput(offer))

      return offer
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

  async cancelOffer(
    offerId: string,
    actorId: string,
    now: Date,
  ): Promise<{ ok: true } | { ok: false; error: TradeRepositoryError | 'trade_unavailable' }> {
    try {
      await this.db.$transaction(async (tx) => {
        const offer = await tx.tradeOffer.findUnique({
          where: { id: offerId },
          select: {
            proposerId: true,
            status: true,
            auction: {
              select: {
                creatorId: true,
              },
            },
          },
        })

        if (!offer) {
          throw new TradeRepositoryErrorException('offer_not_found')
        }

        if (offer.proposerId !== actorId && offer.auction.creatorId !== actorId) {
          throw new TradeRepositoryErrorException('offer_not_owned')
        }

        if (offer.status !== 'pending') {
          throw new TradeRepositoryErrorException('auction_closed')
        }

        const status: TradeOfferStatus = offer.proposerId === actorId ? 'cancelled' : 'rejected'
        const updated = await tx.tradeOffer.updateMany({
          where: { id: offerId, status: 'pending' },
          data: { status, updatedAt: now },
        })

        if (updated.count !== 1) {
          throw new TradeRepositoryErrorException('auction_closed')
        }
      })

      return { ok: true }
    } catch (error: unknown) {
      if (error instanceof TradeRepositoryErrorException) {
        return { ok: false, error: error.code }
      }

      return { ok: false, error: 'trade_unavailable' }
    }
  }

  async acceptOffer(
    auctionId: string,
    offerId: string,
    creatorId: string,
    now: Date,
  ): Promise<
    { ok: true } | { ok: false; error: TradeRepositoryError | 'trade_unavailable'; reason?: string }
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

        if (offer.auction.creatorId !== creatorId) {
          throw new TradeRepositoryErrorException('auction_not_owned')
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

        await this.insertTradeNotification(
          tx,
          buildTradeOfferAcceptedNotificationInput(mapTradeOfferWithAuction(offer)),
        )
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
    const notifications = await this.db.tradeNotification.findMany({
      where: {
        userId,
        viewed: false,
      },
      select: tradeNotificationSelect,
      orderBy: {
        createdAt: 'desc',
      },
      take: TRADE_LIST_LIMIT,
    })

    return notifications.map((notification) => {
      const type = notification.type as TradeNotificationType

      return {
        ...notification,
        type,
        viewed: notification.viewed ?? false,
        payload: toTradeNotificationPayload(type, notification.payload),
      }
    })
  }

  async markTradeNotificationViewed(notificationId: string, userId: string): Promise<boolean> {
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
  }

  private async insertTradeNotification(
    tx: AppPrisma | Prisma.TransactionClient,
    input: TradeRepositoryNotificationInput,
  ): Promise<void> {
    await tx.tradeNotification.create({
      data: {
        id: crypto.randomUUID(),
        userId: input.userId,
        type: input.type,
        message: input.message,
        payload: toPrismaNotificationPayload(input.payload),
      },
    })
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

  private async decrementUserCardQuantity(
    tx: AppPrisma | Prisma.TransactionClient,
    input: {
      userId: string
      cardId: string
      finish: CardFinish
      quantity: number
    },
  ): Promise<boolean> {
    const decremented = await tx.userCard.updateMany({
      where: {
        userId: input.userId,
        cardId: input.cardId,
        finish: input.finish,
        quantity: {
          gt: input.quantity,
        },
      },
      data: {
        quantity: {
          decrement: input.quantity,
        },
        updatedAt: new Date(),
      },
    })

    if (decremented.count === 1) {
      return true
    }

    const deleted = await tx.userCard.deleteMany({
      where: {
        userId: input.userId,
        cardId: input.cardId,
        finish: input.finish,
        quantity: input.quantity,
      },
    })

    return deleted.count === 1
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
