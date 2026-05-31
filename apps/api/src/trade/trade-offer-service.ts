import type { CreateOfferRequest, SupportedLocale, TradeOfferResponse } from '@tcg-collection/shared'
import { DEFAULT_LOCALE } from '@tcg-collection/shared'
import { normalizeTradeFilters, normalizeTradeRequirements } from './trade-normalizers'
import { buildTradeOfferAcceptedNotificationInput, buildTradeOfferReceivedNotificationInput } from './trade-notification-factory'
import { resolveAuthenticatedTradeUser } from './trade-auth'
import { normalizeOfferCards } from './trade-offer-utils'
import { isCardFilteredOutByAuction, matchesAuctionRequirements } from './trade-offer-validation'
import { toTradeServiceError } from './trade-error-mapper'
import { toTradeOfferResponse } from './trade-mappers'
import {
  TradeRepositoryErrorException,
  type TradeOfferStatus,
  type TradeServiceOptions,
  type TradeServiceResult,
} from './trade-types'

const now = () => new Date()

const getOfferSignature = (
  cards: Array<{ cardId: string; finish: string; quantity: number }>,
): string =>
  cards
    .map((card) => `${card.cardId}:${card.finish}:${card.quantity}`)
    .sort((first, second) => first.localeCompare(second))
    .join('|')

export class TradeOfferService {
  constructor(private readonly options: TradeServiceOptions) {}

  async createOffer(
    cookieHeader: string | undefined,
    auctionId: string,
    input: CreateOfferRequest,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<TradeServiceResult<TradeOfferResponse>> {
    await this.expireAuctions(now())

    const userOrError = await resolveAuthenticatedTradeUser(
      this.options.authService,
      cookieHeader,
      'Sign in to submit a trade offer.',
    )

    if ('error' in userOrError) {
      return userOrError
    }

    const auction = await this.options.tradeRepository.getAuctionById(auctionId, true)

    if (!auction) {
      return {
        error: 'auction_not_found',
        message: 'This auction does not exist.',
      }
    }

    if (auction.creatorId === userOrError.id) {
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

    const offerCards = normalizeOfferCards(input.cards)

    if (offerCards.length === 0) {
      return {
        error: 'offer_invalid',
        message: 'Add at least one card to your offer.',
      }
    }

    const existingOffers = 'offers' in auction ? auction.offers : []
    const hasSamePendingOffer = existingOffers.some((offer) => {
      return (
        offer.proposerId === userOrError.id &&
        offer.status === 'pending' &&
        getOfferSignature(offer.cards) === getOfferSignature(offerCards)
      )
    })

    if (hasSamePendingOffer) {
      return toTradeServiceError('duplicate_offer')
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
        userOrError.id,
        offerCard.cardId,
        offerCard.finish,
      )

      if (!ownedQuantity || ownedQuantity < offerCard.quantity) {
        return {
          error: 'card_not_owned',
          message: 'You do not own one or more cards in this offer.',
        }
      }

      const filterCard = {
        id: card.id,
        setId: card.setId,
        rarity: card.rarity,
        category: card.category,
      }

      if (!matchesAuctionRequirements(filterCard, offerCard.finish, requirements)) {
        return {
          error: 'requirements_mismatch',
          message: 'One or more cards do not satisfy the auction requirements.',
        }
      }

      if (isCardFilteredOutByAuction(filterCard, offerCard.finish, filters)) {
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
        proposerId: userOrError.id,
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

    try {
      await this.options.tradeRepository.createTradeNotification(
        buildTradeOfferReceivedNotificationInput(auction, createdOffer),
      )
    } catch (error: unknown) {
      console.error('Unable to create trade offer received notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        offerId: createdOffer.id,
        auctionId: createdOffer.auctionId,
      })
    }

    return toTradeOfferResponse(createdOffer, locale)
  }

  async cancelOffer(
    cookieHeader: string | undefined,
    offerId: string,
  ): Promise<TradeServiceResult<void>> {
    await this.expireAuctions(now())

    const userOrError = await resolveAuthenticatedTradeUser(
      this.options.authService,
      cookieHeader,
      'Sign in to cancel a trade offer.',
    )

    if ('error' in userOrError) {
      return userOrError
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

    if (offer.proposerId !== userOrError.id && offer.auction.creatorId !== userOrError.id) {
      return {
        error: 'offer_not_owned',
        message: 'You cannot cancel this offer.',
      }
    }

    const newStatus: TradeOfferStatus = offer.proposerId === userOrError.id ? 'cancelled' : 'rejected'
    const updated = await this.options.tradeRepository.updateOfferStatus(offerId, newStatus)

    if (!updated) {
      return {
        error: 'trade_unavailable',
        message: 'Unable to cancel this offer right now.',
      }
    }
  }

  async acceptOffer(
    cookieHeader: string | undefined,
    auctionId: string,
    offerId: string,
  ): Promise<TradeServiceResult<void>> {
    await this.expireAuctions(now())

    const userOrError = await resolveAuthenticatedTradeUser(
      this.options.authService,
      cookieHeader,
      'Sign in to accept a trade offer.',
    )

    if ('error' in userOrError) {
      return userOrError
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

    if (offer.auction.creatorId !== userOrError.id) {
      return {
        error: 'auction_not_owned',
        message: 'Only the auction creator can accept an offer.',
      }
    }

    const result = await this.options.tradeRepository.acceptOffer(auctionId, offerId, now())

    if (!result.ok) {
      return toTradeServiceError(result.error)
    }

    try {
      await this.options.tradeRepository.createTradeNotification(
        buildTradeOfferAcceptedNotificationInput(offer),
      )
    } catch (error: unknown) {
      console.error('Unable to create trade accepted notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        offerId: offer.id,
        userId: offer.proposerId,
      })
    }
  }

  private async expireAuctions(referenceDate: Date): Promise<void> {
    await this.options.tradeRepository.cleanupExpiredAuctions(referenceDate)
  }
}
