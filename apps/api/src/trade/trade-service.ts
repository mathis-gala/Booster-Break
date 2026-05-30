import type {
  AuctionFilters,
  AuctionRequirements,
  SupportedLocale,
  CardFinish,
  CreateAuctionRequest,
  CreateOfferRequest,
  TradeAuctionListResponse,
  TradeAuctionResponse,
  TradeOfferResponse,
  TradeOfferStatus,
} from '@tcg-collection/shared'
import { DEFAULT_LOCALE } from '@tcg-collection/shared'
import type { TradeAuctionRow, TradeOfferWithCards } from './trade-types'
import { toTradeAuctionResponse, toTradeOfferResponse } from './trade-mappers'
import { TRADE_AUCTION_DURATION_MS } from './trade-config'
import {
  type TradeOfferCardWrite,
  type TradeRepository,
  TradeRepositoryErrorException,
  type TradeServiceError,
  type TradeServiceOptions,
  type TradeServiceResult,
} from './trade-types'
import { normalizeTradeFilters, normalizeTradeRequirements } from './trade-normalizers'
import { normalizeRarity } from '@tcg-collection/shared'

const now = () => new Date()
const isTradeAuctionResponse = (value: TradeAuctionResponse | null): value is TradeAuctionResponse =>
  value !== null

export class TradeService {
  constructor(private readonly options: TradeServiceOptions) {}

  async listAuctions(locale: SupportedLocale = DEFAULT_LOCALE): Promise<TradeAuctionListResponse> {
    await this.expireAuctions(now())

    const auctions = await this.options.tradeRepository.listActiveAuctions()
    const mappedAuctions = auctions
      .map((auction) => safeTradeAuctionResponse(auction, [], locale))
      .filter(isTradeAuctionResponse)

    return {
      auctions: mappedAuctions,
    }
  }

  async getAuction(
    auctionId: string,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<TradeServiceResult<TradeAuctionResponse>> {
    await this.expireAuctions(now())

    const auction = await this.options.tradeRepository.getAuctionById(auctionId, true)

    if (!auction) {
      return {
        error: 'auction_not_found',
        message: 'This auction does not exist.',
      }
    }

    try {
      return toTradeAuctionResponse(auction, 'offers' in auction ? auction.offers : [], locale)
    } catch (error: unknown) {
      return {
        error: 'trade_unavailable',
        message: 'Unable to load this auction right now.',
      }
    }
  }

  async createAuction(
    cookieHeader: string | undefined,
    input: CreateAuctionRequest,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<TradeServiceResult<TradeAuctionResponse>> {
    await this.expireAuctions(now())

    const user = await this.options.authService.getCurrentUser(cookieHeader)

    if (!user) {
      return {
        error: 'unauthenticated',
        message: 'Sign in to create a trade auction.',
      }
    }

    if (!input.offeredCardId || !input.offeredCardFinish) {
      return {
        error: 'trade_unavailable',
        message: 'Choose a card to offer in the auction.',
      }
    }

    const requirements = normalizeTradeRequirements(input.requirements)
    const filters = normalizeTradeFilters(input.filters)

    if (!isCardFinish(input.offeredCardFinish)) {
      return {
        error: 'trade_unavailable',
        message: 'Unsupported card finish for the offered card.',
      }
    }

    let auction: TradeAuctionRow
    try {
      auction = await this.options.tradeRepository.createAuction({
        creatorId: user.id,
        offeredCardId: input.offeredCardId,
        offeredCardFinish: input.offeredCardFinish,
        requirements,
        filters,
        expiresAt: new Date(now().getTime() + TRADE_AUCTION_DURATION_MS),
      })
    } catch (error: unknown) {
      if (error instanceof TradeRepositoryErrorException) {
        return toTradeServiceError(error.code)
      }

      return {
        error: 'trade_unavailable',
        message: 'Unable to create the auction right now.',
      }
    }

    return toTradeAuctionResponse(auction, [], locale)
  }

  async createOffer(
    cookieHeader: string | undefined,
    auctionId: string,
    input: CreateOfferRequest,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<TradeServiceResult<TradeOfferResponse>> {
    await this.expireAuctions(now())

    const user = await this.options.authService.getCurrentUser(cookieHeader)

    if (!user) {
      return {
        error: 'unauthenticated',
        message: 'Sign in to submit a trade offer.',
      }
    }

    const auction = await this.options.tradeRepository.getAuctionById(auctionId)

    if (!auction) {
      return {
        error: 'auction_not_found',
        message: 'This auction does not exist.',
      }
    }

    if (auction.creatorId === user.id) {
      return {
        error: 'cannot_trade_self',
        message: 'You cannot offer cards on your own auction.',
      }
    }

    if (auction.status !== 'active') {
      return {
        error: 'auction_closed',
        message: 'This auction is no longer active.',
      }
    }

    if (auction.expiresAt.getTime() <= now().getTime()) {
      return {
        error: 'auction_expired',
        message: 'This auction has expired.',
      }
    }

    const offerCards = this.normalizeOfferCards(input.cards)

    if (offerCards.length === 0) {
      return {
        error: 'offer_invalid',
        message: 'Add at least one card to your offer.',
      }
    }

    const cardIds = offerCards.map((offerCard) => offerCard.cardId)
    const cards = await this.options.tradeRepository.findCards(cardIds)
    const cardById = new Map(cards.map((card) => [card.id, card]))

    const requirements = normalizeTradeRequirements(auction.requirements)
    const filters = normalizeTradeFilters(auction.filters)

    for (const offerCard of offerCards) {
      const card = cardById.get(offerCard.cardId)

      if (!card) {
        return {
          error: 'offer_invalid',
          message: 'One offered card does not exist anymore.',
        }
      }

      const ownedQuantity = await this.options.tradeRepository.getUserCardQuantity(
        user.id,
        offerCard.cardId,
        offerCard.finish,
      )

      if (!ownedQuantity || ownedQuantity < offerCard.quantity) {
        return {
          error: 'card_not_owned',
          message: 'You do not own one or more cards in this offer.',
        }
      }

      if (!matchesRequirements(card, offerCard.finish, requirements)) {
        return {
          error: 'requirements_mismatch',
          message: 'One or more cards do not satisfy the auction requirements.',
        }
      }

      if (isFilteredOut(card, offerCard.finish, filters)) {
        return {
          error: 'offer_invalid',
          message: 'One or more cards are blocked by the auction filters.',
        }
      }
    }

    let offer: { id: string }
    try {
      offer = await this.options.tradeRepository.createOffer({
        auctionId,
        proposerId: user.id,
        cards: offerCards,
        now: now(),
      })
    } catch (error: unknown) {
      if (error instanceof TradeRepositoryErrorException) {
        return toTradeServiceError(error.code)
      }

      return {
        error: 'trade_unavailable',
        message: 'Unable to create the offer right now.',
      }
    }

    const createdOffer = await this.options.tradeRepository.getOfferById(offer.id)

    if (!createdOffer) {
      return {
        error: 'trade_unavailable',
        message: 'Failed to create offer. Please try again.',
      }
    }

    return toTradeOfferResponse(createdOffer, locale)
  }

  async cancelOffer(
    cookieHeader: string | undefined,
    offerId: string,
  ): Promise<TradeServiceResult<void>> {
    await this.expireAuctions(now())

    const user = await this.options.authService.getCurrentUser(cookieHeader)

    if (!user) {
      return {
        error: 'unauthenticated',
        message: 'Sign in to cancel a trade offer.',
      }
    }

    const offer = await this.options.tradeRepository.getOfferById(offerId)

    if (!offer || !offer.auction) {
      return {
        error: 'offer_not_found',
        message: 'This offer does not exist.',
      }
    }

    if (offer.status !== 'pending') {
      return {
        error: 'auction_closed',
        message: 'Only pending offers can be cancelled.',
      }
    }

    if (offer.proposerId !== user.id && offer.auction.creatorId !== user.id) {
      return {
        error: 'offer_not_owned',
        message: 'You cannot cancel this offer.',
      }
    }

    const newStatus: TradeOfferStatus = offer.proposerId === user.id ? 'cancelled' : 'rejected'
    const updated = await this.options.tradeRepository.updateOfferStatus(offerId, newStatus)

    if (!updated) {
      return {
        error: 'trade_unavailable',
        message: 'Unable to cancel this offer right now.',
      }
    }

    return
  }

  async cancelAuction(
    cookieHeader: string | undefined,
    auctionId: string,
  ): Promise<TradeServiceResult<void>> {
    await this.expireAuctions(now())

    const user = await this.options.authService.getCurrentUser(cookieHeader)

    if (!user) {
      return {
        error: 'unauthenticated',
        message: 'Sign in to cancel an auction.',
      }
    }

    const auction = await this.options.tradeRepository.getAuctionById(auctionId)

    if (!auction) {
      return {
        error: 'auction_not_found',
        message: 'This auction does not exist.',
      }
    }

    if (auction.creatorId !== user.id) {
      return {
        error: 'auction_not_owned',
        message: 'Only the auction creator can cancel it.',
      }
    }

    if (auction.status !== 'active') {
      return {
        error: 'auction_closed',
        message: 'This auction is no longer active.',
      }
    }

    const cancelled = await this.options.tradeRepository.cancelAuction(auctionId, user.id)

    if (!cancelled) {
      return {
        error: 'trade_unavailable',
        message: 'Unable to cancel this auction right now.',
      }
    }

    return
  }

  async acceptOffer(
    cookieHeader: string | undefined,
    auctionId: string,
    offerId: string,
  ): Promise<TradeServiceResult<void>> {
    await this.expireAuctions(now())

    const user = await this.options.authService.getCurrentUser(cookieHeader)

    if (!user) {
      return {
        error: 'unauthenticated',
        message: 'Sign in to accept a trade offer.',
      }
    }

    const offer = await this.options.tradeRepository.getOfferById(offerId)

    if (!offer || !offer.auction) {
      return {
        error: 'offer_not_found',
        message: 'This offer does not exist.',
      }
    }

    if (offer.auctionId !== auctionId) {
      return {
        error: 'offer_not_found',
        message: 'This offer does not belong to the selected auction.',
      }
    }

    if (offer.auction.creatorId !== user.id) {
      return {
        error: 'auction_not_owned',
        message: 'Only the auction creator can accept an offer.',
      }
    }

    const result = await this.options.tradeRepository.acceptOffer(auctionId, offerId, now())

    if (!result.ok) {
      return toTradeServiceError(result.error)
    }

    return
  }

  private async expireAuctions(referenceDate: Date): Promise<void> {
    await this.options.tradeRepository.cleanupExpiredAuctions(referenceDate)
  }

  private normalizeOfferCards(cards: CreateOfferRequest['cards']): TradeOfferCardWrite[] {
    const merged = new Map<string, TradeOfferCardWrite>()

    for (const card of cards) {
      const key = `${card.cardId}:${card.finish}`
      const existing = merged.get(key)

      if (existing) {
        existing.quantity += card.quantity
        continue
      }

      merged.set(key, {
        cardId: card.cardId,
        finish: card.finish,
        quantity: card.quantity,
      })
    }

    return Array.from(merged.values()).filter((card) => card.quantity > 0)
  }
}

const safeTradeAuctionResponse = (
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

export const isTradeServiceError = (result: unknown): result is TradeServiceError => {
  return typeof result === 'object' && result !== null && 'error' in result
}

const isCardFinish = (value: string): value is CardFinish => {
  return value === 'normal' || value === 'holo' || value === 'reverse_holo'
}

const matchesRequirements = (
  card: {
    id: string
    setId: string
    rarity: string | null
    category: string | null
  },
  finish: CardFinish,
  requirements: AuctionRequirements,
): boolean => {
  if (requirements.cardIds?.length && !requirements.cardIds.includes(card.id)) {
    return false
  }

  if (requirements.setIds?.length && !requirements.setIds.includes(card.setId)) {
    return false
  }

  if (
    requirements.rarities?.length &&
    !requirements.rarities.some(
      (rarity) => normalizeRarity(rarity) === normalizeRarity(card.rarity ?? ''),
    )
  ) {
    return false
  }

  if (requirements.types?.length && !requirements.types.includes(card.category ?? '')) {
    return false
  }

  if (requirements.finishes?.length && !requirements.finishes.includes(finish)) {
    return false
  }

  return true
}

const isFilteredOut = (
  card: {
    id: string
    setId: string
    rarity: string | null
    category: string | null
  },
  finish: CardFinish,
  filters: AuctionFilters,
): boolean => {
  if (filters.excludedCardIds?.length && filters.excludedCardIds.includes(card.id)) {
    return true
  }

  if (filters.excludedSetIds?.length && filters.excludedSetIds.includes(card.setId)) {
    return true
  }

  if (
    filters.excludedRarities?.length &&
    filters.excludedRarities.some(
      (rarity) => normalizeRarity(rarity) === normalizeRarity(card.rarity ?? ''),
    )
  ) {
    return true
  }

  if (filters.excludedTypes?.length && filters.excludedTypes.includes(card.category ?? '')) {
    return true
  }

  if (filters.excludedFinishes?.length && filters.excludedFinishes.includes(finish)) {
    return true
  }

  return false
}

const toTradeServiceError = (error: string): TradeServiceError => {
  switch (error) {
    case 'max_auctions_reached':
      return {
        error: 'max_auctions_reached',
        message: 'You already reached the maximum number of active auctions.',
      }
    case 'card_in_auction':
      return {
        error: 'card_in_auction',
        message: 'This card is already locked in another active auction.',
      }
    case 'max_offers_reached':
      return {
        error: 'max_offers_reached',
        message: 'You reached the maximum number of offers for this auction.',
      }
    case 'auction_not_found':
      return {
        error: 'auction_not_found',
        message: 'The selected auction does not exist.',
      }
    case 'auction_expired':
      return {
        error: 'auction_expired',
        message: 'The selected auction has expired.',
      }
    case 'auction_closed':
      return {
        error: 'auction_closed',
        message: 'The selected auction is closed.',
      }
    case 'cannot_trade_self':
      return {
        error: 'cannot_trade_self',
        message: 'You cannot offer cards on your own auction.',
      }
    case 'offer_not_found':
      return {
        error: 'offer_not_found',
        message: 'This offer does not exist anymore.',
      }
    case 'offer_invalid':
      return {
        error: 'offer_invalid',
        message: 'This offer cannot be accepted right now.',
      }
    case 'card_not_owned':
      return {
        error: 'card_not_owned',
        message: 'A player does not have enough cards for this trade anymore.',
      }
    default:
      return {
        error: 'trade_unavailable',
        message: 'Trade operation is not available right now.',
      }
  }
}
