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

export type PokemonRepositoryError = 'pack_open_cooldown'

export class PokemonRepositoryErrorException extends Error {
  constructor(
    public readonly code: PokemonRepositoryError,
    message?: string,
  ) {
    super(message)
    this.name = 'PokemonRepositoryErrorException'
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

    return {
      cards: pagedRows.map((row) => ({
        ...toCardSummary(row.card, row.finish as CardFinish, options.locale),
        quantity: row.quantity,
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
    cooldownSeconds: number,
  ): Promise<{ openingId: string; newCardIds: string[] }> {
    const openingId = crypto.randomUUID()
    const openedAt = new Date()
    const newCardIds = new Set<string>()

    await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`pack-opening:${userId}`}))`

      const latestOpening = await tx.packOpening.findFirst({
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

      if (latestOpening) {
        const nextOpenAt = new Date(latestOpening.openedAt.getTime() + cooldownSeconds * 1000)

        if (nextOpenAt > openedAt) {
          throw new PokemonRepositoryErrorException('pack_open_cooldown')
        }
      }

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
