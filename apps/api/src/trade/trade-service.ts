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
    cookieHeader?: string,
  ): Promise<TradeServiceResult<TradeAuctionResponse>> {
    return this.auctionService.getAuction(auctionId, locale, cookieHeader)
  }

  listTradeNotifications(
    cookieHeader: string | undefined,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<TradeServiceResult<TradeNotificationListResponse>> {
    return this.notificationService.listTradeNotifications(cookieHeader, locale)
  }

  markTradeNotificationViewed(
    cookieHeader: string | undefined,
    notificationId: string,
  ): Promise<TradeServiceResult<void>> {
    return this.notificationService.markTradeNotificationViewed(cookieHeader, notificationId)
  }

  createAuction(
    cookieHeader: string | undefined,
    input: CreateAuctionRequest,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<TradeServiceResult<TradeAuctionResponse>> {
    return this.auctionService.createAuction(cookieHeader, input, locale)
  }

  createOffer(
    cookieHeader: string | undefined,
    auctionId: string,
    input: CreateOfferRequest,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<TradeServiceResult<TradeOfferResponse>> {
    return this.offerService.createOffer(cookieHeader, auctionId, input, locale)
  }

  cancelOffer(
    cookieHeader: string | undefined,
    offerId: string,
  ): Promise<TradeServiceResult<void>> {
    return this.offerService.cancelOffer(cookieHeader, offerId)
  }

  cancelAuction(
    cookieHeader: string | undefined,
    auctionId: string,
  ): Promise<TradeServiceResult<void>> {
    return this.auctionService.cancelAuction(cookieHeader, auctionId)
  }

  acceptOffer(
    cookieHeader: string | undefined,
    auctionId: string,
    offerId: string,
  ): Promise<TradeServiceResult<void>> {
    return this.offerService.acceptOffer(cookieHeader, auctionId, offerId)
  }
}
