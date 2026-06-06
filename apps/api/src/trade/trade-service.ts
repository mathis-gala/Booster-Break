import type {
  CreateAuctionRequest,
  CreateOfferRequest,
  SupportedLocale,
  TradeAuctionListResponse,
  TradeAuctionResponse,
  TradeNotificationListResponse,
  TradeOfferResponse,
} from '@tcg-collection/shared'
import { DEFAULT_LOCALE } from '@tcg-collection/shared'
import type { AuthUser } from '../auth/types'
import { TradeAuctionService } from './trade-auction-service'
import { TradeNotificationService } from './trade-notification-service'
import { TradeOfferService } from './trade-offer-service'
import type { TradeServiceOptions, TradeServiceResult } from './trade-types'

export class TradeService {
  private readonly auctionService: TradeAuctionService
  private readonly offerService: TradeOfferService
  private readonly notificationService: TradeNotificationService

  constructor(options: TradeServiceOptions) {
    this.auctionService = new TradeAuctionService(options)
    this.offerService = new TradeOfferService(options)
    this.notificationService = new TradeNotificationService(options)
  }

  listAuctions(locale: SupportedLocale = DEFAULT_LOCALE): Promise<TradeAuctionListResponse> {
    return this.auctionService.listAuctions(locale)
  }

  getAuction(
    auctionId: string,
    locale: SupportedLocale = DEFAULT_LOCALE,
    user?: AuthUser,
  ): Promise<TradeServiceResult<TradeAuctionResponse>> {
    return this.auctionService.getAuction(auctionId, locale, user)
  }

  listTradeNotifications(
    user: AuthUser,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<TradeServiceResult<TradeNotificationListResponse>> {
    return this.notificationService.listTradeNotifications(user, locale)
  }

  markTradeNotificationViewed(
    user: AuthUser,
    notificationId: string,
  ): Promise<TradeServiceResult<void>> {
    return this.notificationService.markTradeNotificationViewed(user, notificationId)
  }

  createAuction(
    user: AuthUser,
    input: CreateAuctionRequest,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<TradeServiceResult<TradeAuctionResponse>> {
    return this.auctionService.createAuction(user, input, locale)
  }

  createOffer(
    user: AuthUser,
    auctionId: string,
    input: CreateOfferRequest,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<TradeServiceResult<TradeOfferResponse>> {
    return this.offerService.createOffer(user, auctionId, input, locale)
  }

  cancelOffer(user: AuthUser, offerId: string): Promise<TradeServiceResult<void>> {
    return this.offerService.cancelOffer(user, offerId)
  }

  cancelAuction(user: AuthUser, auctionId: string): Promise<TradeServiceResult<void>> {
    return this.auctionService.cancelAuction(user, auctionId)
  }

  acceptOffer(
    user: AuthUser,
    auctionId: string,
    offerId: string,
  ): Promise<TradeServiceResult<void>> {
    return this.offerService.acceptOffer(user, auctionId, offerId)
  }
}
