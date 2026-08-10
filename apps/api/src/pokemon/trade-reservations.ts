import type { AppPrisma } from '../db/prisma'
import { cardFinishKey } from './card-finish-key'

export interface ReservedCardCopies {
  cardId: string
  finish: string
  quantity: number
}

export const listReservedCardQuantities = async (
  db: AppPrisma,
  userId: string,
  cardIds: string[],
): Promise<ReservedCardCopies[]> => {
  if (cardIds.length === 0) {
    return []
  }

  const [auctions, offerCards] = await Promise.all([
    db.tradeAuction.findMany({
      where: {
        creatorId: userId,
        status: 'active',
        offeredCardId: { in: cardIds },
      },
      select: { offeredCardId: true, offeredCardFinish: true },
    }),
    db.tradeOfferCard.findMany({
      where: {
        cardId: { in: cardIds },
        offer: { proposerId: userId, status: 'pending' },
      },
      select: { cardId: true, finish: true, quantity: true },
    }),
  ])

  const reservedByKey = new Map<string, ReservedCardCopies>()

  const reserve = (cardId: string, finish: string, quantity: number) => {
    const key = cardFinishKey(cardId, finish)
    const existing = reservedByKey.get(key)

    if (existing) {
      existing.quantity += quantity
      return
    }

    reservedByKey.set(key, { cardId, finish, quantity })
  }

  for (const auction of auctions) {
    reserve(auction.offeredCardId, auction.offeredCardFinish, 1)
  }

  for (const offerCard of offerCards) {
    reserve(offerCard.cardId, offerCard.finish, offerCard.quantity)
  }

  return [...reservedByKey.values()]
}
