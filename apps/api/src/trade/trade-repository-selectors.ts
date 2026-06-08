import type { Prisma } from '@prisma/client'

const buildTradePokemonCardSelect = (): Prisma.PokemonCardSelect => ({
  id: true,
  setId: true,
  name: true,
  nameEn: true,
  nameFr: true,
  localId: true,
  rarity: true,
  category: true,
  rawJson: true,
  imageSmall: true,
  imageLarge: true,
})

export const tradeAuctionCreatorSelect = {
  id: true,
  pseudo: true,
  displayName: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect

export const tradePokemonCardSelect = buildTradePokemonCardSelect()

export const tradeOfferAuctionSelect = {
  id: true,
  creatorId: true,
  status: true,
  offeredCardId: true,
  offeredCardFinish: true,
  creator: {
    select: tradeAuctionCreatorSelect,
  },
  offeredCard: {
    select: buildTradePokemonCardSelect(),
  },
  expiresAt: true,
} satisfies Prisma.TradeAuctionSelect

export const tradeOfferProposerSelect = {
  id: true,
  pseudo: true,
  displayName: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect

export const tradeAuctionCardInclude = {
  creator: {
    select: tradeAuctionCreatorSelect,
  },
  offeredCard: {
    select: buildTradePokemonCardSelect(),
  },
  _count: {
    select: {
      offers: {
        where: {
          status: 'pending',
        },
      },
    },
  },
} satisfies Prisma.TradeAuctionInclude

export const tradeOfferCardInclude = {
  card: {
    select: buildTradePokemonCardSelect(),
  },
} satisfies Prisma.TradeOfferCardInclude

export const tradeOfferInclude = {
  proposer: {
    select: tradeOfferProposerSelect,
  },
  cards: {
    include: tradeOfferCardInclude,
  },
} satisfies Prisma.TradeOfferInclude

export const tradeAuctionWithOffersInclude = {
  offers: {
    orderBy: {
      createdAt: 'desc',
    },
    include: tradeOfferInclude,
  },
} satisfies Prisma.TradeAuctionInclude

export const tradePokemonCardsByIdsSelect = tradePokemonCardSelect

export const tradeAuctionIdSelect = {
  id: true,
} satisfies Prisma.TradeAuctionSelect

export const tradeUserCardQuantitySelect = {
  quantity: true,
} satisfies Prisma.UserCardSelect

export const tradeOfferWithAuctionAndCardsInclude = {
  proposer: {
    select: tradeOfferProposerSelect,
  },
  auction: {
    select: tradeOfferAuctionSelect,
  },
  cards: {
    include: tradeOfferCardInclude,
  },
} satisfies Prisma.TradeOfferInclude

export const tradeNotificationSelect = {
  id: true,
  userId: true,
  type: true,
  message: true,
  payload: true,
  viewed: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TradeNotificationSelect

export type TradeAuctionWithCardPayload = Prisma.TradeAuctionGetPayload<{
  include: typeof tradeAuctionCardInclude
}>

export type TradeOfferWithAuctionPayload = Prisma.TradeOfferGetPayload<{
  include: typeof tradeOfferWithAuctionAndCardsInclude
}>

export type TradeAuctionWithOffersPayload = Prisma.TradeAuctionGetPayload<{
  include: typeof tradeAuctionCardInclude & typeof tradeAuctionWithOffersInclude
}>
