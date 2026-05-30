import type {
  TradeApiError,
  TradeErrorCode,
  CardFinish,
  AuctionRequirements,
  AuctionFilters,
  TradeOfferStatus,
  TradeAuctionStatus,
} from '@tcg-collection/shared'
import type { AuthService } from '../auth/auth-service'

export interface TradeControllerOptions<TService = unknown> {
  service: TService
  authService: AuthService
}

export type TradeControllerErrorCode = TradeServiceError['error']

export interface TradeServiceOptions {
  authService: AuthService
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
  | 'cannot_trade_self'
  | 'max_auctions_reached'
  | 'card_in_auction'
  | 'offer_not_found'
  | 'offer_invalid'
  | 'card_not_owned'
  | 'max_offers_reached'
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

export interface TradeAuctionWithOffers extends TradeAuctionRow {
  offers: TradeOfferWithCards[]
}

export interface TradeOfferCardWrite {
  cardId: string
  finish: CardFinish
  quantity: number
}

export interface TradeRepository {
  cleanupExpiredAuctions(referenceDate: Date): Promise<number>
  countActiveAuctionsByCreator(creatorId: string): Promise<number>
  isCardInActiveAuction(offeredCardId: string, offeredCardFinish: CardFinish): Promise<boolean>
  createAuction(input: {
    creatorId: string
    offeredCardId: string
    offeredCardFinish: CardFinish
    requirements?: AuctionRequirements
    filters?: AuctionFilters
    expiresAt: Date
  }): Promise<TradeAuctionRow>
  listActiveAuctions(): Promise<TradeAuctionRow[]>
  getAuctionById(
    auctionId: string,
    includeOffers?: boolean,
  ): Promise<TradeAuctionRow | TradeAuctionWithOffers | null>
  cancelAuction(auctionId: string, creatorId: string): Promise<boolean>
  countPendingOffersByUser(auctionId: string, proposerId: string): Promise<number>
  createOffer(input: {
    auctionId: string
    proposerId: string
    cards: TradeOfferCardWrite[]
    now: Date
  }): Promise<{ id: string }>
  getOfferById(offerId: string): Promise<TradeOfferRow | null>
  updateOfferStatus(offerId: string, status: TradeOfferStatus): Promise<boolean>
  acceptOffer(
    auctionId: string,
    offerId: string,
    now: Date,
  ): Promise<{ ok: true } | { ok: false; error: TradeRepositoryError | 'trade_unavailable' }>
  findCards(cardIds: string[]): Promise<TradeAuctionCardSummary[]>
  getUserCardQuantity(
    userId: string,
    cardId: string,
    finish: CardFinish,
  ): Promise<number | undefined>
}
