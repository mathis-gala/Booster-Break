import type { TradeAuctionResponse, TradeOfferResponse } from '@tcg-collection/shared'
import type {
  TradeAuctionCardSummary,
  TradeAuctionRow,
  TradeAuctionWithOffers,
  TradeOfferCardRow,
  TradeOfferRow,
  TradeOfferWithCards,
} from './trade-types'
import type {
  TradeAuctionWithOffersPayload,
  TradeOfferWithAuctionPayload,
} from './trade-repository-selectors'
import { toCardSummary } from '../pokemon/pokemon-mappers'
import {
  normalizeCardFinish,
  normalizeTradeFilters,
  normalizeTradeRequirements,
} from './trade-normalizers'

type TradeOfferWithCardsPayload = TradeAuctionWithOffersPayload['offers'][number]
type TradeOfferCardPayload = TradeOfferWithAuctionPayload['cards'][number]

const cloneCardSummary = (card: TradeAuctionCardSummary): TradeAuctionCardSummary => ({
  ...card,
})

const cloneOfferCards = (cards: TradeOfferCardPayload[]): TradeOfferCardRow[] =>
  cards.map((card) => ({
    ...card,
    finish: normalizeCardFinish(card.finish) ?? 'normal',
    card: cloneCardSummary(card.card),
  }))

export const mapTradeOfferWithCards = (offer: TradeOfferWithCardsPayload): TradeOfferWithCards => ({
  id: offer.id,
  auctionId: offer.auctionId,
  proposerId: offer.proposerId,
  status: offer.status,
  createdAt: offer.createdAt,
  updatedAt: offer.updatedAt,
  proposer: {
    ...offer.proposer,
  },
  cards: cloneOfferCards(offer.cards),
})

export const mapTradeAuctionWithOffers = (
  auction: TradeAuctionWithOffersPayload,
): TradeAuctionWithOffers => ({
  ...auction,
  offeredCardFinish: normalizeCardFinish(auction.offeredCardFinish) ?? 'normal',
  requirements: normalizeTradeRequirements(auction.requirements),
  filters: normalizeTradeFilters(auction.filters),
  offers: auction.offers.map((offer) => mapTradeOfferWithCards(offer)),
})

export const mapTradeOfferWithAuction = (offer: TradeOfferWithAuctionPayload): TradeOfferRow => ({
  id: offer.id,
  auctionId: offer.auctionId,
  proposerId: offer.proposerId,
  status: offer.status,
  createdAt: offer.createdAt,
  updatedAt: offer.updatedAt,
  proposer: {
    ...offer.proposer,
  },
  auction: offer.auction
    ? {
        id: offer.auction.id,
        creatorId: offer.auction.creatorId,
        status: offer.auction.status,
        offeredCardId: offer.auction.offeredCardId,
        offeredCardFinish: normalizeCardFinish(offer.auction.offeredCardFinish) ?? 'normal',
        expiresAt: offer.auction.expiresAt,
      }
    : null,
  cards: cloneOfferCards(offer.cards),
})

const mapTradeOfferCardsToResponse = (cards: TradeOfferCardRow[]): TradeOfferResponse['cards'] =>
  cards.map((offerCard) => ({
    finish: normalizeCardFinish(offerCard.finish) ?? 'normal',
    card: toCardSummary(
      {
        ...offerCard.card,
      },
      normalizeCardFinish(offerCard.finish),
    ),
    quantity: offerCard.quantity,
  }))

export const toTradeOfferResponse = (
  offer: TradeOfferRow | TradeOfferWithCards,
): TradeOfferResponse => ({
  id: offer.id,
  proposerId: offer.proposerId,
  proposerPseudo: offer.proposer.pseudo,
  status: offer.status,
  createdAt: offer.createdAt.toISOString(),
  updatedAt: offer.updatedAt.toISOString(),
  cards: mapTradeOfferCardsToResponse(offer.cards),
})

export const toTradeAuctionResponse = (
  auction: TradeAuctionRow,
  offers: TradeOfferWithCards[],
): TradeAuctionResponse => ({
  id: auction.id,
  creatorId: auction.creatorId,
  creatorPseudo: auction.creator.pseudo,
  offeredCard: toCardSummary(
    {
      ...auction.offeredCard,
    },
    normalizeCardFinish(auction.offeredCardFinish),
  ),
  offeredCardFinish: normalizeCardFinish(auction.offeredCardFinish) ?? 'normal',
  requirements: auction.requirements,
  filters: auction.filters,
  status: auction.status,
  createdAt: auction.createdAt.toISOString(),
  expiresAt: auction.expiresAt.toISOString(),
  offerCount: auction._count.offers,
  offers: offers.map((offer) => toTradeOfferResponse(offer)),
})
