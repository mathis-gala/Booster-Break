import type {
  TradeApiError,
  TradeErrorCode,
  TradeNotificationPayload,
  TradeNotificationType,
  CardFinish,
  AuctionRequirements,
  AuctionFilters,
  TradeOfferStatus,
  TradeAuctionStatus,
} from '@tcg-collection/shared'
import type { AuthService } from '../auth/auth-service'

export type { TradeOfferStatus } from '@tcg-collection/shared'

export interface TradeControllerOptions<TService = unknown> {
  service: TService
  authService: AuthService
}

export type TradeControllerErrorCode = TradeServiceError['error']

export interface TradeServiceOptions {
  tradeRepository: TradeRepository
}

export type TradeServiceError = TradeApiError & {
  error: TradeErrorCode
}

export type TradeServiceResult<T> = T | TradeServiceError

export type TradeRepositoryError =
  | 'auction_not_found'
  | 'auction_expired'
  | 'auction_closed'
  | 'auction_not_owned'
  | 'cannot_trade_self'
  | 'max_auctions_reached'
  | 'card_in_auction'
  | 'offer_not_found'
  | 'offer_not_owned'
  | 'offer_invalid'
  | 'card_not_owned'
  | 'max_offers_reached'
  | 'duplicate_offer'
  | 'notification_not_found'
  | 'notification_not_owned'
  | 'trade_unavailable'

export class TradeRepositoryErrorException extends Error {
  readonly code: TradeRepositoryError

  constructor(code: TradeRepositoryError, message?: string) {
    super(message ?? code)
    this.code = code
  }
}

export interface TradeAuctionCardSummary {
  id: string
  setId: string
  name: string
  nameEn: string | null
  nameFr: string | null
  localId: string
  rarity: string | null
  category: string | null
  rawJson: string
  imageSmall: string | null
  imageLarge: string | null
}

export interface TradeOfferCardRow {
  offerId: string
  cardId: string
  finish: CardFinish
  quantity: number
  card: TradeAuctionCardSummary
}

export interface TradeAuctionRow {
  id: string
  creatorId: string
  offeredCardId: string
  offeredCardFinish: CardFinish
  requirements: AuctionRequirements
  filters: AuctionFilters
  status: TradeAuctionStatus
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
  creator: {
    id: string
    pseudo: string
    displayName: string | null
    avatarUrl: string | null
  }
  offeredCard: TradeAuctionCardSummary
  _count: {
    offers: number
  }
}

export interface TradeOfferRow {
  id: string
  auctionId: string
  proposerId: string
  status: TradeOfferStatus
  createdAt: Date
  updatedAt: Date
  proposer: {
    id: string
    pseudo: string
    displayName: string | null
    avatarUrl: string | null
  }
  auction?: {
    id: string
    creatorId: string
    status: TradeAuctionStatus
    offeredCardId: string
    offeredCardFinish: CardFinish
    expiresAt: Date
    creator?: {
      id: string
      pseudo: string
      displayName: string | null
      avatarUrl: string | null
    }
    offeredCard?: TradeAuctionCardSummary
  } | null
  cards: TradeOfferCardRow[]
}

export interface TradeOfferWithCards {
  id: string
  auctionId: string
  proposerId: string
  status: TradeOfferStatus
  createdAt: Date
  updatedAt: Date
  proposer: {
    id: string
    pseudo: string
    displayName: string | null
    avatarUrl: string | null
  }
  cards: TradeOfferCardRow[]
}

export interface TradeNotificationRow {
  id: string
  userId: string
  type: TradeNotificationType
  message: string
  payload: TradeNotificationPayload
  viewed: boolean
  createdAt: Date
  updatedAt: Date
}

export interface TradeRepositoryNotificationInput {
  userId: string
  type: TradeNotificationType
  message: string
  payload: TradeNotificationPayload
}

export interface TradeCardFilterCandidate {
  id: string
  setId: string
  rarity: string | null
  category: string | null
}

export interface CreateTradeAuctionCommand {
  creatorId: string
  offeredCardId: string
  offeredCardFinish: CardFinish
  requirements?: AuctionRequirements
  filters?: AuctionFilters
  expiresAt: Date
}

export interface CreateTradeOfferCommand {
  auctionId: string
  proposerId: string
  cards: TradeOfferCardWrite[]
  now: Date
}

export interface TradeAuctionWithOffers extends TradeAuctionRow {
  offers: TradeOfferWithCards[]
}

export interface TradeOfferCardWrite {
  cardId: string
  finish: CardFinish
  quantity: number
}

export interface TradeAuctionRepository {
  cleanupExpiredAuctions(referenceDate: Date): Promise<number>
  createAuction(input: CreateTradeAuctionCommand): Promise<TradeAuctionRow>
  listActiveAuctions(): Promise<TradeAuctionRow[]>
  getAuctionById(
    auctionId: string,
    viewerId?: string,
  ): Promise<TradeAuctionRow | TradeAuctionWithOffers | null>
  cancelAuction(auctionId: string, creatorId: string): Promise<boolean>
}

export interface TradeOfferRepository {
  createOffer(input: CreateTradeOfferCommand): Promise<TradeOfferRow>
  getOfferById(offerId: string): Promise<TradeOfferRow | null>
  cancelOffer(
    offerId: string,
    actorId: string,
    now: Date,
  ): Promise<{ ok: true } | { ok: false; error: TradeRepositoryError | 'trade_unavailable' }>
  acceptOffer(
    auctionId: string,
    offerId: string,
    creatorId: string,
    now: Date,
  ): Promise<
    { ok: true } | { ok: false; error: TradeRepositoryError | 'trade_unavailable'; reason?: string }
  >
}

export interface TradeCardRepository {
  findCards(cardIds: string[]): Promise<TradeAuctionCardSummary[]>
  getUserCardQuantity(
    userId: string,
    cardId: string,
    finish: CardFinish,
  ): Promise<number | undefined>
}

export interface TradeNotificationRepository {
  listTradeNotifications(userId: string): Promise<TradeNotificationRow[]>
  markTradeNotificationViewed(notificationId: string, userId: string): Promise<boolean>
}

export type TradeRepository = TradeAuctionRepository &
  TradeOfferRepository &
  TradeCardRepository &
  TradeNotificationRepository
