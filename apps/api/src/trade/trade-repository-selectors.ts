import type { Prisma } from '@prisma/client'

export const tradeAuctionCreatorSelect = {
  id: true,
  pseudo: true,
  displayName: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect

export const tradeOfferAuctionSelect = {
  id: true,
  creatorId: true,
  status: true,
  offeredCardId: true,
  offeredCardFinish: true,
  expiresAt: true,
} satisfies Prisma.TradeAuctionSelect

export const tradeOfferProposerSelect = {
  id: true,
  pseudo: true,
} satisfies Prisma.UserSelect

export const tradePokemonCardSelect = {
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
} satisfies Prisma.PokemonCardSelect

export const tradeAuctionCardInclude = {
  creator: {
    select: tradeAuctionCreatorSelect,
  },
  offeredCard: {
    select: tradePokemonCardSelect,
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
    select: tradePokemonCardSelect,
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

export type TradeAuctionWithCardPayload = Prisma.TradeAuctionGetPayload<{
  include: typeof tradeAuctionCardInclude
}>

export type TradeOfferWithAuctionPayload = Prisma.TradeOfferGetPayload<{
  include: typeof tradeOfferWithAuctionAndCardsInclude
}>

export type TradeAuctionWithOffersPayload = Prisma.TradeAuctionGetPayload<{
  include: typeof tradeAuctionCardInclude & typeof tradeAuctionWithOffersInclude
}>
