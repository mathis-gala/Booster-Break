import type {
  CreateAuctionRequest,
  SupportedLocale,
  TradeAuctionListResponse,
  TradeAuctionResponse,
} from '@tcg-collection/shared'
import { DEFAULT_LOCALE } from '@tcg-collection/shared'
import type { AuthUser } from '../auth/types'
import {
  isTradeAuctionResponse,
  safeToTradeAuctionResponse,
  toTradeAuctionResponse,
} from './trade-mappers'
import { TRADE_AUCTION_DURATION_MS } from './trade-config'
import { normalizeTradeFilters, normalizeTradeRequirements } from './trade-normalizers'
import { resolveAuthenticatedTradeUser } from './trade-auth'
import { isSupportedTradeCardFinish } from './trade-offer-validation'
import { toTradeServiceError } from './trade-error-mapper'
import {
  TradeRepositoryErrorException,
  type TradeAuctionRow,
  type TradeServiceOptions,
  type TradeServiceResult,
} from './trade-types'

const now = () => new Date()

export class TradeAuctionService {
  constructor(private readonly options: TradeServiceOptions) {}

  async listAuctions(locale: SupportedLocale = DEFAULT_LOCALE): Promise<TradeAuctionListResponse> {
    await this.expireAuctions(now())

    const auctions = await this.options.tradeRepository.listActiveAuctions()
    const mappedAuctions = auctions
      .map((auction) => safeToTradeAuctionResponse(auction, [], locale))
      .filter(isTradeAuctionResponse)

    return { auctions: mappedAuctions }
  }

  async getAuction(
    auctionId: string,
    locale: SupportedLocale = DEFAULT_LOCALE,
    user?: AuthUser,
  ): Promise<TradeServiceResult<TradeAuctionResponse>> {
    await this.expireAuctions(now())

    const auction = await this.options.tradeRepository.getAuctionById(auctionId, user?.id)

    if (!auction) {
      return {
        error: 'auction_not_found',
        message: 'This auction does not exist.',
      }
    }

    try {
      const visibleOffers =
        'offers' in auction && user
          ? auction.offers.filter(
              (offer) => auction.creatorId === user.id || offer.proposerId === user.id,
            )
          : []

      return toTradeAuctionResponse(auction, visibleOffers, locale)
    } catch {
      return {
        error: 'trade_unavailable',
        message: 'Unable to load this auction right now.',
      }
    }
  }

  async createAuction(
    user: AuthUser,
    input: CreateAuctionRequest,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<TradeServiceResult<TradeAuctionResponse>> {
    await this.expireAuctions(now())

    const userOrError = await resolveAuthenticatedTradeUser(
      user,
      'Sign in to create a trade auction.',
    )

    if ('error' in userOrError) {
      return userOrError
    }

    if (!input.offeredCardId || !input.offeredCardFinish) {
      return {
        error: 'trade_unavailable',
        message: 'Choose a card to offer in the auction.',
      }
    }

    if (!isSupportedTradeCardFinish(input.offeredCardFinish)) {
      return {
        error: 'trade_unavailable',
        message: 'Unsupported card finish for the offered card.',
      }
    }

    let auction: TradeAuctionRow
    try {
      auction = await this.options.tradeRepository.createAuction({
        creatorId: userOrError.id,
        offeredCardId: input.offeredCardId,
        offeredCardFinish: input.offeredCardFinish,
        requirements: normalizeTradeRequirements(input.requirements),
        filters: normalizeTradeFilters(input.filters),
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

  async cancelAuction(user: AuthUser, auctionId: string): Promise<TradeServiceResult<void>> {
    await this.expireAuctions(now())

    const userOrError = await resolveAuthenticatedTradeUser(user, 'Sign in to cancel an auction.')

    if ('error' in userOrError) {
      return userOrError
    }

    const auction = await this.options.tradeRepository.getAuctionById(auctionId)

    if (!auction) {
      return {
        error: 'auction_not_found',
        message: 'This auction does not exist.',
      }
    }

    if (auction.creatorId !== userOrError.id) {
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

    const cancelled = await this.options.tradeRepository.cancelAuction(auctionId, userOrError.id)

    if (!cancelled) {
      return {
        error: 'trade_unavailable',
        message: 'Unable to cancel this auction right now.',
      }
    }
  }

  private async expireAuctions(referenceDate: Date): Promise<void> {
    await this.options.tradeRepository.cleanupExpiredAuctions(referenceDate)
  }
}
