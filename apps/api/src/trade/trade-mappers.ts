import type {
  SupportedLocale,
  TradeAuctionResponse,
  TradeOfferResponse,
  TradeNotificationPayload,
  TradeNotificationResponse,
} from '@tcg-collection/shared'
import { DEFAULT_LOCALE } from '@tcg-collection/shared'
import type {
  TradeAuctionCardSummary,
  TradeAuctionRow,
  TradeAuctionWithOffers,
  TradeOfferCardRow,
  TradeOfferRow,
  TradeOfferWithCards,
  TradeNotificationRow,
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

const UNKNOWN_TRADE_CARD: TradeAuctionCardSummary = {
  id: '',
  setId: '',
  name: 'Unknown card',
  nameEn: null,
  nameFr: null,
  localId: '',
  rarity: null,
  category: null,
  rawJson: '{}',
  imageSmall: null,
  imageLarge: null,
}

const UNKNOWN_TRADE_USER: {
  id: string
  pseudo: string
  displayName: string | null
  avatarUrl: string | null
} = {
  id: '',
  pseudo: 'Anonymous',
  displayName: null,
  avatarUrl: null,
}

const resolveCardSummary = (card: TradeAuctionCardSummary | undefined): TradeAuctionCardSummary =>
  card ?? UNKNOWN_TRADE_CARD

const resolveUserSummary = (
  user:
    | { id: string; pseudo: string; displayName: string | null; avatarUrl: string | null }
    | undefined,
) => user ?? UNKNOWN_TRADE_USER

const cloneOfferCards = (cards: TradeOfferCardPayload[]): TradeOfferCardRow[] =>
  cards.map((card) => ({
    ...card,
    finish: normalizeCardFinish(card.finish) ?? 'normal',
    card: cloneCardSummary(resolveCardSummary(card.card as TradeAuctionCardSummary | undefined)),
  }))

export const mapTradeOfferWithCards = (offer: TradeOfferWithCardsPayload): TradeOfferWithCards => ({
  id: offer.id,
  auctionId: offer.auctionId,
  proposerId: offer.proposerId,
  status: offer.status,
  createdAt: offer.createdAt,
  updatedAt: offer.updatedAt,
  proposer: {
    ...resolveUserSummary(offer.proposer),
  },
  cards: cloneOfferCards((offer.cards as TradeOfferCardPayload[] | undefined) ?? []),
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
    ...resolveUserSummary(offer.proposer),
  },
  auction: offer.auction
    ? {
        id: offer.auction.id,
        creatorId: offer.auction.creatorId,
        status: offer.auction.status,
        offeredCardId: offer.auction.offeredCardId,
        offeredCardFinish: normalizeCardFinish(offer.auction.offeredCardFinish) ?? 'normal',
        expiresAt: offer.auction.expiresAt,
        offeredCard: offer.auction.offeredCard
          ? cloneCardSummary(resolveCardSummary(offer.auction.offeredCard))
          : undefined,
      }
    : null,
  cards: cloneOfferCards((offer.cards as TradeOfferCardPayload[] | undefined) ?? []),
})

export const toTradeNotificationResponse = (
  notification: TradeNotificationRow,
): TradeNotificationResponse => ({
  id: notification.id,
  type: notification.type,
  message: notification.message,
  viewed: notification.viewed,
  createdAt: notification.createdAt.toISOString(),
  payload: notification.payload as TradeNotificationPayload,
})

const mapTradeOfferCardsToResponseSafe = (
  cards: TradeOfferCardRow[],
  locale: SupportedLocale = DEFAULT_LOCALE,
): TradeOfferResponse['cards'] =>
  cards.map((offerCard) => ({
    finish: normalizeCardFinish(offerCard.finish) ?? 'normal',
    card: toCardSummary(
      {
        ...resolveCardSummary(offerCard.card),
      },
      normalizeCardFinish(offerCard.finish),
      locale,
    ),
    quantity: offerCard.quantity,
  }))

export const toTradeOfferResponse = (
  offer: TradeOfferRow | TradeOfferWithCards,
  locale: SupportedLocale = DEFAULT_LOCALE,
): TradeOfferResponse => ({
  id: offer.id,
  proposerId: offer.proposerId,
  proposerPseudo: resolveUserSummary(offer.proposer).pseudo,
  proposerDisplayName: resolveUserSummary(offer.proposer).displayName ?? undefined,
  proposerAvatarUrl: resolveUserSummary(offer.proposer).avatarUrl ?? undefined,
  status: offer.status,
  createdAt: offer.createdAt.toISOString(),
  updatedAt: offer.updatedAt.toISOString(),
  cards: mapTradeOfferCardsToResponseSafe(offer.cards ?? [], locale),
})

const resolveOfferCount = (offerCount: { offers?: number } | undefined): number => {
  const safeCount = offerCount?.offers

  if (typeof safeCount !== 'number' || !Number.isFinite(safeCount)) {
    return 0
  }

  return Math.max(0, safeCount)
}

export const toTradeAuctionResponse = (
  auction: TradeAuctionRow,
  offers: TradeOfferWithCards[],
  locale: SupportedLocale = DEFAULT_LOCALE,
): TradeAuctionResponse => ({
  id: auction.id,
  creatorId: auction.creatorId,
  creatorPseudo: resolveUserSummary(auction.creator).pseudo,
  creatorDisplayName: resolveUserSummary(auction.creator).displayName ?? undefined,
  creatorAvatarUrl: resolveUserSummary(auction.creator).avatarUrl ?? undefined,
  offeredCard: toCardSummary(
    {
      ...resolveCardSummary(auction.offeredCard),
    },
    normalizeCardFinish(auction.offeredCardFinish),
    locale,
  ),
  offeredCardFinish: normalizeCardFinish(auction.offeredCardFinish) ?? 'normal',
  requirements: auction.requirements,
  filters: auction.filters,
  status: auction.status,
  createdAt: auction.createdAt.toISOString(),
  expiresAt: auction.expiresAt.toISOString(),
  offerCount: resolveOfferCount(auction._count),
  offers: offers.map((offer) => toTradeOfferResponse(offer, locale)),
})

export const isTradeAuctionResponse = (
  value: TradeAuctionResponse | null,
): value is TradeAuctionResponse => value !== null

export const safeToTradeAuctionResponse = (
  auction: TradeAuctionRow,
  offers: TradeOfferWithCards[] = [],
  locale: SupportedLocale,
): TradeAuctionResponse | null => {
  try {
    return toTradeAuctionResponse(auction, offers, locale)
  } catch (error: unknown) {
    const baseLog = {
      auctionId: auction.id,
      message: error instanceof Error ? error.message : 'Unknown error',
    }

    console.error('Unable to serialize trade auction for list response', baseLog)
    return null
  }
}
