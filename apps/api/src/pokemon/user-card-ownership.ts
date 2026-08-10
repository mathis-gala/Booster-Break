import type { Prisma } from '@prisma/client'

export const listOwnedCardIdsForCards = async (
  tx: Prisma.TransactionClient,
  userId: string,
  cardIds: string[],
): Promise<Set<string>> => {
  const where = {
    userId,
    cardId: { in: cardIds },
    quantity: { gt: 0 },
  }

  const [ownedRows, giftedRows] = await Promise.all([
    tx.userCard.findMany({ where, select: { cardId: true } }),
    tx.giftedUserCard.findMany({ where, select: { cardId: true } }),
  ])

  return new Set([...ownedRows, ...giftedRows].map((row) => row.cardId))
}
