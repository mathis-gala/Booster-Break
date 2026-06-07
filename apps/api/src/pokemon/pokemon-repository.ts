import type {
  CardFinish,
  CollectionSetOption,
  CollectionSort,
  CollectionSource,
  PokemonCardSummary,
  PokemonSetSummary,
  SupportedLocale,
  UserCollectionResponse,
} from '@tcg-collection/shared'
import { getFinishRank, getRarityRank } from '@tcg-collection/shared'
import type { Prisma } from '@prisma/client'
import type { AppPrisma } from '../db/prisma'
import {
  getLocalizedCardName,
  getLocalizedSetName,
  type LocalizedCardNames,
  type LocalizedSetText,
  toCardSummary,
  toCardWrite,
  toSetSummary,
  toSetWrite,
} from './pokemon-mappers'
import { SYNCED_BOOSTER_LIMIT } from './pokemon-config'
import { consumeBoosterCharge, getBoosterChargeStatus, PackCooldownError } from './pack-cooldown'
import type { Set as TcgDexSet } from '@tcgdex/sdk'
import type { TcgDexCard } from './tcgdex-client'

type CollectionInventorySet = {
  name: string
  nameEn: string | null
  nameFr: string | null
}

type CollectionInventoryCard = Parameters<typeof toCardSummary>[0] & {
  set: CollectionInventorySet | null
}

/**
 * Thrown inside the recycle transaction when a card selected for recycling is no
 * longer fully owned at write time (e.g. spent by a concurrent recycle or trade).
 * Rolls back the transaction so nothing is consumed and no reward is granted.
 */
export class RecycleConflictError extends Error {
  constructor() {
    super('Collection changed during recycling')
    this.name = 'RecycleConflictError'
  }
}

type CollectionInventoryRow = {
  cardId: string
  finish: string
  quantity: number
  firstCollectedAt: Date
  updatedAt: Date
  card: CollectionInventoryCard
}

export class PokemonRepository {
  constructor(private readonly db: AppPrisma) {}

  async upsertSet(
    set: TcgDexSet,
    syncedAt: string,
    boosterImageUrl?: string,
    localizedText?: LocalizedSetText,
  ): Promise<void> {
    const setWrite = toSetWrite(set, syncedAt, boosterImageUrl, localizedText)

    await this.db.pokemonSet.upsert({
      where: {
        id: set.id,
      },
      create: setWrite,
      update: setWrite,
    })
  }

  async replaceSetCards(
    setId: string,
    cards: TcgDexCard[],
    syncedAt: string,
    localizedNames?: LocalizedCardNames,
  ): Promise<void> {
    await this.db.$transaction(async (tx) => {
      for (const card of cards) {
        const cardWrite = toCardWrite(card, syncedAt, localizedNames)

        await tx.pokemonCard.upsert({
          where: {
            id: card.id,
          },
          create: cardWrite,
          update: cardWrite,
        })
      }

      await tx.pokemonCard.deleteMany({
        where: {
          setId,
          id: {
            notIn: cards.map((card) => card.id),
          },
          openingCards: {
            none: {},
          },
          userCards: {
            none: {},
          },
          giftedUserCards: {
            none: {},
          },
        },
      })
    })
  }

  async listSets(locale: SupportedLocale = 'fr'): Promise<PokemonSetSummary[]> {
    const sets = await this.db.pokemonSet.findMany({
      where: {
        releaseDate: {
          contains: '-',
        },
        boosterImageUrl: {
          not: null,
        },
      },
      orderBy: {
        releaseDate: 'desc',
      },
      take: SYNCED_BOOSTER_LIMIT,
    })

    return sets.map((set) => toSetSummary(set, locale))
  }

  async getSet(
    setId: string,
    locale: SupportedLocale = 'fr',
  ): Promise<PokemonSetSummary | undefined> {
    const set = await this.db.pokemonSet.findUnique({
      where: {
        id: setId,
      },
    })

    return set ? toSetSummary(set, locale) : undefined
  }

  async listCards(setId?: string, locale: SupportedLocale = 'fr'): Promise<PokemonCardSummary[]> {
    const cards = await this.db.pokemonCard.findMany({
      where: setId
        ? {
            setId,
          }
        : undefined,
      orderBy: [
        {
          setId: 'asc',
        },
        {
          localId: 'asc',
        },
      ],
      take: setId ? undefined : 250,
    })

    return cards.map((card) => toCardSummary(card, undefined, locale))
  }

  async listUserCollection(
    userId: string,
    options: {
      page: number
      pageSize: number
      sort: CollectionSort
      source: CollectionSource
      locale: SupportedLocale
      setId?: string
    },
  ): Promise<UserCollectionResponse> {
    const allRows = await this.listUserCollectionRows(
      userId,
      options.locale,
      options.sort,
      options.source,
    )
    const sets = this.buildCollectionSetOptions(allRows, options.locale)
    const rows = options.setId ? allRows.filter((row) => row.card.setId === options.setId) : allRows
    const total = rows.length
    const totalCards = rows.reduce((count, row) => count + row.quantity, 0)
    const pageCount = Math.max(1, Math.ceil(total / options.pageSize))
    const page = Math.min(Math.max(options.page, 1), pageCount)
    const pagedRows = rows.slice((page - 1) * options.pageSize, page * options.pageSize)

    // Only owned copies can be locked by a trade; other sources are never reserved.
    const reservedByKey =
      options.source === 'owned'
        ? new Map(
            (
              await this.listRecycleReservedQuantities(
                userId,
                pagedRows.map((row) => row.cardId),
              )
            ).map((row) => [`${row.cardId}:${row.finish}`, row.quantity]),
          )
        : new Map<string, number>()

    return {
      cards: pagedRows.map((row) => ({
        ...toCardSummary(row.card, row.finish as CardFinish, options.locale),
        quantity: row.quantity,
        reservedQuantity: reservedByKey.get(`${row.cardId}:${row.finish}`) ?? 0,
        firstCollectedAt: row.firstCollectedAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      pagination: {
        page,
        pageSize: options.pageSize,
        total,
        totalCards,
        pageCount,
      },
      sort: options.sort,
      sets,
    }
  }

  private buildCollectionSetOptions(
    rows: CollectionInventoryRow[],
    locale: SupportedLocale,
  ): CollectionSetOption[] {
    const sets = new Map<string, CollectionSetOption>()

    for (const row of rows) {
      const existing = sets.get(row.card.setId)

      if (existing) {
        existing.count += 1
        continue
      }

      sets.set(row.card.setId, {
        id: row.card.setId,
        name: row.card.set ? getLocalizedSetName(row.card.set, locale) : row.card.setId,
        count: 1,
      })
    }

    return [...sets.values()].sort((first, second) => first.name.localeCompare(second.name))
  }

  // Owned card ids, deduped and finish-agnostic: a card held in any finish appears once.
  async listOwnedCardIds(userId: string): Promise<string[]> {
    const where = {
      userId,
      quantity: {
        gt: 0,
      },
    }

    const [ownedRows, giftedRows] = await Promise.all([
      this.db.userCard.findMany({
        where,
        select: {
          cardId: true,
        },
      }),
      this.db.giftedUserCard.findMany({
        where,
        select: {
          cardId: true,
        },
      }),
    ])

    const cardIds = new Set<string>()

    for (const row of [...ownedRows, ...giftedRows]) {
      cardIds.add(row.cardId)
    }

    return [...cardIds]
  }

  // Ownership is finish-agnostic (by cardId), matching getOwnedCardIds.
  private async listOwnedCardIdsForCards(
    tx: Prisma.TransactionClient,
    userId: string,
    cardIds: string[],
  ): Promise<Set<string>> {
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

  async recordPackOpening(
    userId: string,
    setId: string,
    cards: PokemonCardSummary[],
  ): Promise<{ openingId: string; newCardIds: string[] }> {
    const openingId = crypto.randomUUID()
    const openedAt = new Date()
    const newCardIds = new Set<string>()

    await this.db.$transaction(async (tx) => {
      const lockedRows = await tx.$queryRaw<{ booster_cooldown_anchor: Date | null }[]>`
        SELECT "booster_cooldown_anchor" FROM "users" WHERE "id" = ${userId} FOR UPDATE
      `
      const anchor = lockedRows[0]?.booster_cooldown_anchor ?? null
      const status = getBoosterChargeStatus(anchor, openedAt)

      if (!status.canOpen) {
        throw new PackCooldownError(status.cooldownSeconds)
      }

      await tx.user.update({
        where: { id: userId },
        data: { boosterCooldownAnchor: consumeBoosterCharge(anchor, openedAt) },
      })
      await tx.packOpening.create({
        data: {
          id: openingId,
          userId,
          setId,
          openedAt,
        },
      })

      const previouslyOwned = await this.listOwnedCardIdsForCards(
        tx,
        userId,
        cards.map((card) => card.id),
      )

      for (const [index, card] of cards.entries()) {
        if (!previouslyOwned.has(card.id)) {
          newCardIds.add(card.id)
        }

        await tx.packOpeningCard.create({
          data: {
            packOpeningId: openingId,
            cardId: card.id,
            finish: card.finish ?? 'normal',
            position: index + 1,
          },
        })

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
            firstCollectedAt: openedAt,
            updatedAt: openedAt,
          },
          update: {
            quantity: {
              increment: 1,
            },
            updatedAt: openedAt,
          },
        })
      }
    })

    return { openingId, newCardIds: [...newCardIds] }
  }

  async listRecycleRewardCandidates(locale: SupportedLocale = 'fr'): Promise<PokemonCardSummary[]> {
    const cards = await this.db.pokemonCard.findMany({
      where: {
        rarity: {
          not: null,
        },
      },
    })

    return cards.map((card) => toCardSummary(card, undefined, locale))
  }

  async listOwnedRecycleRows(
    userId: string,
    cardIds: string[],
  ): Promise<Array<{ cardId: string; finish: string; quantity: number; rarity: string | null }>> {
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

  /**
   * Counts, per (cardId, finish), how many owned copies the user has committed to
   * a live trade. Trades do not escrow — the copies stay in `user_cards` until the
   * trade settles — so recycling must treat these as unavailable, otherwise a user
   * could recycle a card they have already promised and leave a dangling trade.
   *
   * Two commitments reserve a copy: an active auction the user created (one copy of
   * the offered card) and a pending offer the user proposed (its committed cards).
   */
  async listRecycleReservedQuantities(
    userId: string,
    cardIds: string[],
  ): Promise<Array<{ cardId: string; finish: string; quantity: number }>> {
    if (cardIds.length === 0) {
      return []
    }

    const [auctions, offerCards] = await Promise.all([
      this.db.tradeAuction.findMany({
        where: {
          creatorId: userId,
          status: 'active',
          offeredCardId: { in: cardIds },
        },
        select: { offeredCardId: true, offeredCardFinish: true },
      }),
      this.db.tradeOfferCard.findMany({
        where: {
          cardId: { in: cardIds },
          offer: { proposerId: userId, status: 'pending' },
        },
        select: { cardId: true, finish: true, quantity: true },
      }),
    ])

    const reservedByKey = new Map<string, { cardId: string; finish: string; quantity: number }>()

    const reserve = (cardId: string, finish: string, quantity: number) => {
      const key = `${cardId}:${finish}`
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

  async recycleCards(
    userId: string,
    consumed: Array<{ cardId: string; finish: string; quantity: number }>,
    rewards: PokemonCardSummary[],
  ): Promise<{ newCardIds: string[] }> {
    const now = new Date()
    const newCardIds = new Set<string>()

    await this.db.$transaction(async (tx) => {
      // Capture ownership before consuming or awarding, so a reward counts as
      // "new" based on what the user held when they started recycling.
      const previouslyOwned = await this.listOwnedCardIdsForCards(
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
        // Consume atomically against the live row inside the transaction. The
        // service validated ownership earlier with a non-transactional read, so
        // a concurrent recycle/trade could have spent these copies in between.
        // If any copy is no longer available we throw to roll back the whole
        // transaction, so no reward is ever granted for cards we failed to spend.
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

  /**
   * Atomically removes `item.quantity` copies of a card from the user, returning
   * false (without mutating) when fewer copies remain than requested. The two
   * guarded writes — decrement when a surplus remains, delete when consuming the
   * last copies — never match a row that is short, so a stale over-consume fails
   * closed. updatedAt is deliberately left untouched: a spent card is not
   * "recently acquired" and must not jump ahead of the reward in the Recent sort.
   */
  private async consumeUserCardCopies(
    tx: Prisma.TransactionClient,
    userId: string,
    item: { cardId: string; finish: string; quantity: number },
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

    // A CHECK (quantity > 0) constraint forbids decrementing to zero, so the row
    // is deleted outright when every owned copy is consumed.
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

  async getLatestPackOpening(userId: string): Promise<{ openedAt: Date } | undefined> {
    const opening = await this.db.packOpening.findFirst({
      where: {
        userId,
      },
      orderBy: {
        openedAt: 'desc',
      },
      select: {
        openedAt: true,
      },
    })

    return opening ?? undefined
  }

  async getBoosterCooldownAnchor(userId: string): Promise<Date | null> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { boosterCooldownAnchor: true },
    })

    return user?.boosterCooldownAnchor ?? null
  }

  private async listUserCollectionRows(
    userId: string,
    locale: SupportedLocale,
    sort: CollectionSort,
    source: CollectionSource,
  ) {
    const rows = await this.listCollectionInventoryRows(userId, source)

    return this.sortCollectionRows(this.mergeCollectionRows(rows), locale, sort)
  }

  private async listCollectionInventoryRows(
    userId: string,
    source: CollectionSource,
  ): Promise<CollectionInventoryRow[]> {
    const where = {
      userId,
      quantity: {
        gt: 0,
      },
    }

    const ownedRows = await this.db.userCard.findMany({
      where,
      include: {
        card: {
          include: {
            set: true,
          },
        },
      },
    })

    if (source === 'owned') {
      return ownedRows
    }

    const giftedRows = await this.db.giftedUserCard.findMany({
      where,
      include: {
        card: {
          include: {
            set: true,
          },
        },
      },
    })

    return [...ownedRows, ...giftedRows]
  }

  private mergeCollectionRows(rows: CollectionInventoryRow[]): CollectionInventoryRow[] {
    const mergedRows = new Map<
      string,
      {
        card: CollectionInventoryRow['card']
        cardId: string
        finish: string
        quantity: number
        firstCollectedAt: Date
        updatedAt: Date
      }
    >()

    for (const row of rows) {
      const key = `${row.cardId}:${row.finish}`
      const existing = mergedRows.get(key)

      if (!existing) {
        mergedRows.set(key, {
          card: row.card,
          cardId: row.cardId,
          finish: row.finish,
          quantity: row.quantity,
          firstCollectedAt: row.firstCollectedAt,
          updatedAt: row.updatedAt,
        })
        continue
      }

      existing.quantity += row.quantity
      existing.firstCollectedAt = new Date(
        Math.min(existing.firstCollectedAt.getTime(), row.firstCollectedAt.getTime()),
      )
      existing.updatedAt = new Date(Math.max(existing.updatedAt.getTime(), row.updatedAt.getTime()))
    }

    return [...mergedRows.values()]
  }

  private sortCollectionRows(
    rows: CollectionInventoryRow[],
    locale: SupportedLocale,
    sort: CollectionSort,
  ): CollectionInventoryRow[] {
    return rows.sort((first, second) => {
      switch (sort) {
        case 'recent': {
          const updatedAtDelta = second.updatedAt.getTime() - first.updatedAt.getTime()

          if (updatedAtDelta !== 0) {
            return updatedAtDelta
          }

          return getLocalizedCardName(first.card, locale).localeCompare(
            getLocalizedCardName(second.card, locale),
          )
        }
        case 'quantity': {
          const quantityDelta = second.quantity - first.quantity

          if (quantityDelta !== 0) {
            return quantityDelta
          }

          const nameDelta = getLocalizedCardName(first.card, locale).localeCompare(
            getLocalizedCardName(second.card, locale),
          )

          if (nameDelta !== 0) {
            return nameDelta
          }

          return second.updatedAt.getTime() - first.updatedAt.getTime()
        }
        case 'name':
          return getLocalizedCardName(first.card, locale).localeCompare(
            getLocalizedCardName(second.card, locale),
          )
        case 'rarity': {
          const rarityDelta = getRarityRank(second.card.rarity) - getRarityRank(first.card.rarity)

          if (rarityDelta !== 0) {
            return rarityDelta
          }

          const nameDelta = getLocalizedCardName(first.card, locale).localeCompare(
            getLocalizedCardName(second.card, locale),
          )

          if (nameDelta !== 0) {
            return nameDelta
          }

          return getFinishRank(first.finish) - getFinishRank(second.finish)
        }
        default:
          return 0
      }
    })
  }
}
