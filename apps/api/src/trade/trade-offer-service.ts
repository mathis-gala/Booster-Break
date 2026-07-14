import type {
  CreateOfferRequest,
  SupportedLocale,
  TradeOfferResponse,
} from '@tcg-collection/shared'
import { DEFAULT_LOCALE } from '@tcg-collection/shared'
import type { AuthUser } from '../auth/types'
import { normalizeTradeFilters, normalizeTradeRequirements } from './trade-normalizers'
import { resolveAuthenticatedTradeUser } from './trade-auth'
import { getOfferSignature, normalizeOfferCards } from './trade-offer-utils'
import { isCardFilteredOutByAuction, matchesAuctionRequirements } from './trade-offer-validation'
import { toTradeServiceError } from './trade-error-mapper'
import { toTradeOfferResponse } from './trade-mappers'
import {
  TradeRepositoryErrorException,
  type TradeServiceOptions,
  type TradeServiceResult,
} from './trade-types'

const now = () => new Date()

export class TradeOfferService {
  constructor(private readonly options: TradeServiceOptions) {}

  async createOffer(
    user: AuthUser,
    auctionId: string,
    input: CreateOfferRequest,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<TradeServiceResult<TradeOfferResponse>> {
    await this.expireAuctions(now())

    const userOrError = await resolveAuthenticatedTradeUser(
      user,
      'Sign in to submit a trade offer.',
    )

    if ('error' in userOrError) {
      return userOrError
    }

    const auction = await this.options.tradeRepository.getAuctionById(auctionId, userOrError.id)

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

    let offer
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

    return toTradeOfferResponse(offer, locale)
  }

  async cancelOffer(user: AuthUser, offerId: string): Promise<TradeServiceResult<void>> {
    await this.expireAuctions(now())

    const userOrError = await resolveAuthenticatedTradeUser(
      user,
      'Sign in to cancel a trade offer.',
    )

    if ('error' in userOrError) {
      return userOrError
    }

    const result = await this.options.tradeRepository.cancelOffer(offerId, userOrError.id, now())

    if (!result.ok) {
      return toTradeServiceError(result.error)
    }
  }

  async acceptOffer(
    user: AuthUser,
    auctionId: string,
    offerId: string,
  ): Promise<TradeServiceResult<void>> {
    await this.expireAuctions(now())

    const userOrError = await resolveAuthenticatedTradeUser(
      user,
      'Sign in to accept a trade offer.',
    )

    if ('error' in userOrError) {
      return userOrError
    }

    const result = await this.options.tradeRepository.acceptOffer(
      auctionId,
      offerId,
      userOrError.id,
      now(),
    )

    if (!result.ok) {
      return toTradeServiceError(result.error)
    }
  }

  private async expireAuctions(referenceDate: Date): Promise<void> {
    await this.options.tradeRepository.cleanupExpiredAuctions(referenceDate)
  }
}
