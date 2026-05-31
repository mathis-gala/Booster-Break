import type {
  CardFinish,
  CollectionSort,
  PokemonCardSummary,
  PokemonSetSummary,
  SupportedLocale,
  UserCollectionResponse,
  UserCollectionCard,
} from '@tcg-collection/shared'
import { getFinishRank, getRarityRank } from '@tcg-collection/shared'
import type { AppPrisma } from '../db/prisma'
import {
  getLocalizedCardName,
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
    options: { page: number; pageSize: number; sort: CollectionSort; locale: SupportedLocale },
  ): Promise<UserCollectionResponse> {
    const where = {
      userId,
      quantity: {
        gt: 0,
      },
    }
    const [total, aggregate] = await Promise.all([
      this.db.userCard.count({ where }),
      this.db.userCard.aggregate({
        where,
        _sum: {
          quantity: true,
        },
      }),
    ])
    const pageCount = Math.max(1, Math.ceil(total / options.pageSize))
    const page = Math.min(Math.max(options.page, 1), pageCount)
    const rows =
      options.sort === 'rarity'
        ? await this.listUserCollectionByRarity(userId, page, options.pageSize, options.locale)
        : await this.db.userCard.findMany({
            where,
            include: {
              card: true,
            },
            orderBy: toCollectionOrderBy(options.sort, options.locale),
            skip: (page - 1) * options.pageSize,
            take: options.pageSize,
          })

    return {
      cards: rows.map((row) => ({
        ...toCardSummary(row.card, row.finish as CardFinish, options.locale),
        quantity: row.quantity,
        firstCollectedAt: row.firstCollectedAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      pagination: {
        page,
        pageSize: options.pageSize,
        total,
        totalCards: aggregate._sum.quantity ?? 0,
        pageCount,
      },
      sort: options.sort,
    }
  }

  async recordPackOpening(
    userId: string,
    setId: string,
    cards: PokemonCardSummary[],
  ): Promise<string> {
    const openingId = crypto.randomUUID()
    const openedAt = new Date()

    await this.db.$transaction(async (tx) => {
      await tx.packOpening.create({
        data: {
          id: openingId,
          userId,
          setId,
          openedAt,
        },
      })

      for (const [index, card] of cards.entries()) {
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

    return openingId
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

  private async listUserCollectionByRarity(
    userId: string,
    page: number,
    pageSize: number,
    locale: SupportedLocale,
  ) {
    const rows = await this.db.userCard.findMany({
      where: {
        userId,
        quantity: {
          gt: 0,
        },
      },
      include: {
        card: true,
      },
    })

    return rows
      .sort((first, second) => {
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
      })
      .slice((page - 1) * pageSize, page * pageSize)
  }
}

const toCollectionOrderBy = (sort: CollectionSort, locale: SupportedLocale) => {
  const localizedNameOrderBy = getLocalizedNameOrderBy(locale)

  switch (sort) {
    case 'quantity':
      return [
        {
          quantity: 'desc' as const,
        },
        ...localizedNameOrderBy,
        {
          updatedAt: 'desc' as const,
        },
      ]
    case 'name':
      return [...localizedNameOrderBy]
    case 'rarity':
      return [
        {
          card: {
            rarity: 'asc' as const,
          },
        },
        ...localizedNameOrderBy,
        {
          updatedAt: 'desc' as const,
        },
      ]
    case 'recent':
      return [
        {
          updatedAt: 'desc' as const,
        },
        ...localizedNameOrderBy,
      ]
  }
}

const getLocalizedNameOrderBy = (locale: SupportedLocale) => {
  if (locale === 'fr') {
    return [
      {
        card: {
          nameFr: 'asc' as const,
        },
      },
      {
        card: {
          name: 'asc' as const,
        },
      },
    ]
  }

  return [
    {
      card: {
        nameEn: 'asc' as const,
      },
    },
    {
      card: {
        name: 'asc' as const,
      },
    },
  ]
}
