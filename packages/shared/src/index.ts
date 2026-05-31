import { normalizeRarity } from './pokemon-rarity'

export const supportedLocaleValues = ['fr', 'en'] as const
export type SupportedLocale = (typeof supportedLocaleValues)[number]
export const supportedLocales = supportedLocaleValues
export const DEFAULT_LOCALE: SupportedLocale = 'fr'

export interface HealthResponse {
  ok: boolean
  service: string
  timestamp: string
}

export interface AuthUser {
  id: string
  pseudo: string
  displayName?: string
  avatarUrl?: string
}

export type AuthMeResponse =
  | {
      authenticated: true
      user: AuthUser
    }
  | {
      authenticated: false
    }

export interface PokemonSetSummary {
  id: string
  name: string
  series: string
  total: number
  releaseDate: string
  symbolUrl?: string
  logoUrl?: string
  boosterImageUrl?: string
}

export type CardFinish = 'normal' | 'holo' | 'reverse_holo'

export interface PokemonCardSummary {
  id: string
  setId: string
  name: string
  number: string
  rarity?: string
  supertype?: string
  finishes?: CardFinish[]
  finish?: CardFinish
  imageSmall?: string
  imageLarge?: string
}

export interface UserCollectionCard extends PokemonCardSummary {
  quantity: number
  firstCollectedAt: string
  updatedAt: string
}

export type CollectionSort = 'recent' | 'quantity' | 'name' | 'rarity'

export interface CollectionPagination {
  page: number
  pageSize: number
  total: number
  totalCards: number
  pageCount: number
}

export interface UserCollectionResponse {
  cards: UserCollectionCard[]
  pagination: CollectionPagination
  sort: CollectionSort
}

export type PackOpenStatusResponse =
  | {
      authenticated: true
      canOpen: boolean
      cooldownSeconds: number
      cooldownDurationSeconds: number
      nextOpenAt?: string
      lastOpenedAt?: string
    }
  | {
      authenticated: false
      canOpen: false
      cooldownSeconds: 0
      cooldownDurationSeconds: number
    }

export interface OpenPackResponse {
  openingId: string
  set: PokemonSetSummary
  cards: PokemonCardSummary[]
}

export type TradeAuctionStatus = 'active' | 'accepted' | 'cancelled' | 'expired'

export type TradeOfferStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled'

export interface AuctionRequirements {
  cardIds?: string[]
  setIds?: string[]
  rarities?: string[]
  types?: string[]
  finishes?: CardFinish[]
}

export interface AuctionFilters {
  excludedCardIds?: string[]
  excludedSetIds?: string[]
  excludedRarities?: string[]
  excludedTypes?: string[]
  excludedFinishes?: CardFinish[]
}

export interface TradeConstraintCardCandidate {
  id: string
  setId: string
  rarity?: string | null
  type?: string | null
}

const hasNormalizedTradeValue = (
  value: string | null | undefined,
  candidates: string[] | undefined,
): boolean => {
  if (!candidates?.length) {
    return false
  }

  const normalizedValue = normalizeRarity(value ?? '')

  return candidates.some((candidate) => normalizeRarity(candidate) === normalizedValue)
}

export const matchesTradeRequirements = (
  card: TradeConstraintCardCandidate,
  finish: CardFinish,
  requirements: AuctionRequirements = {},
): boolean => {
  if (requirements.cardIds?.length && !requirements.cardIds.includes(card.id)) {
    return false
  }

  if (requirements.setIds?.length && !requirements.setIds.includes(card.setId)) {
    return false
  }

  if (
    requirements.rarities?.length &&
    !hasNormalizedTradeValue(card.rarity, requirements.rarities)
  ) {
    return false
  }

  if (requirements.types?.length && !requirements.types.includes(card.type ?? '')) {
    return false
  }

  if (requirements.finishes?.length && !requirements.finishes.includes(finish)) {
    return false
  }

  return true
}

export const isCardExcludedFromTrade = (
  card: TradeConstraintCardCandidate,
  finish: CardFinish,
  filters: AuctionFilters = {},
): boolean => {
  if (filters.excludedCardIds?.length && filters.excludedCardIds.includes(card.id)) {
    return true
  }

  if (filters.excludedSetIds?.length && filters.excludedSetIds.includes(card.setId)) {
    return true
  }

  if (
    filters.excludedRarities?.length &&
    hasNormalizedTradeValue(card.rarity, filters.excludedRarities)
  ) {
    return true
  }

  if (filters.excludedTypes?.length && filters.excludedTypes.includes(card.type ?? '')) {
    return true
  }

  if (filters.excludedFinishes?.length && filters.excludedFinishes.includes(finish)) {
    return true
  }

  return false
}

export const matchesTradeConstraints = (
  card: TradeConstraintCardCandidate,
  finish: CardFinish,
  requirements: AuctionRequirements = {},
  filters: AuctionFilters = {},
): boolean => {
  return (
    matchesTradeRequirements(card, finish, requirements) &&
    !isCardExcludedFromTrade(card, finish, filters)
  )
}

export interface TradeOfferItem {
  cardId: string
  finish: CardFinish
  quantity: number
}

export interface CreateAuctionRequest {
  offeredCardId: string
  offeredCardFinish: CardFinish
  requirements?: AuctionRequirements
  filters?: AuctionFilters
}

export interface CreateOfferRequest {
  cards: TradeOfferItem[]
}

export interface TradeOfferCardResponse {
  card: PokemonCardSummary
  finish: CardFinish
  quantity: number
}

export interface TradeOfferResponse {
  id: string
  proposerId: string
  proposerPseudo: string
  proposerDisplayName?: string
  proposerAvatarUrl?: string
  status: TradeOfferStatus
  createdAt: string
  updatedAt: string
  cards: TradeOfferCardResponse[]
}

export interface TradeAuctionResponse {
  id: string
  creatorId: string
  creatorPseudo: string
  creatorDisplayName?: string
  creatorAvatarUrl?: string
  offeredCard: PokemonCardSummary
  offeredCardFinish: CardFinish
  requirements: AuctionRequirements
  filters: AuctionFilters
  status: TradeAuctionStatus
  createdAt: string
  expiresAt: string
  offerCount: number
  offers: TradeOfferResponse[]
}

export interface TradeAuctionListResponse {
  auctions: TradeAuctionResponse[]
}

export interface TradeApiError {
  error: TradeErrorCode
  message: string
}

export type TradeNotificationType = 'trade_offer_accepted' | 'trade_offer_received'

export interface TradeNotificationCardPayload {
  cardId: string
  name: string
  imageSmall?: string
  imageLarge?: string
  finish: CardFinish
  quantity: number
  setId?: string
  number?: string
}

export type TradeOfferAcceptedNotificationRecipientRole = 'auction_creator' | 'offer_proposer'

export interface TradeOfferAcceptedNotificationPayload {
  offerId: string
  auctionId: string
  recipientRole?: TradeOfferAcceptedNotificationRecipientRole
  creatorId?: string
  creatorPseudo?: string
  creatorDisplayName?: string
  creatorAvatarUrl?: string
  proposerId: string
  proposerPseudo: string
  proposerDisplayName?: string
  proposerAvatarUrl?: string
  offeredCard: TradeNotificationCardPayload
  offeredTo?: string
  exchangedCards: TradeNotificationCardPayload[]
}

export interface TradeOfferReceivedNotificationPayload {
  offerId: string
  auctionId: string
  proposerId: string
  proposerPseudo: string
  proposerDisplayName?: string
  proposerAvatarUrl?: string
  offeredCard: TradeNotificationCardPayload
  offeredCards: TradeNotificationCardPayload[]
}

export type TradeNotificationPayload =
  | TradeOfferAcceptedNotificationPayload
  | TradeOfferReceivedNotificationPayload

export interface TradeNotificationBaseResponse {
  id: string
  message: string
  viewed: boolean
  createdAt: string
}

export interface TradeOfferAcceptedNotificationResponse extends TradeNotificationBaseResponse {
  type: 'trade_offer_accepted'
  payload: TradeOfferAcceptedNotificationPayload
}

export interface TradeOfferReceivedNotificationResponse extends TradeNotificationBaseResponse {
  type: 'trade_offer_received'
  payload: TradeOfferReceivedNotificationPayload
}

export type TradeNotificationResponse =
  | TradeOfferAcceptedNotificationResponse
  | TradeOfferReceivedNotificationResponse

export interface TradeNotificationListResponse {
  notifications: TradeNotificationResponse[]
}

export type TradeErrorCode =
  | 'auction_not_found'
  | 'auction_not_owned'
  | 'auction_not_active'
  | 'auction_closed'
  | 'auction_expired'
  | 'card_not_owned'
  | 'cannot_trade_self'
  | 'max_auctions_reached'
  | 'auction_limit_reached'
  | 'card_in_auction'
  | 'max_offers_reached'
  | 'duplicate_offer'
  | 'offer_not_found'
  | 'offer_not_owned'
  | 'offer_invalid'
  | 'requirements_mismatch'
  | 'trade_unavailable'
  | 'unauthenticated'
  | 'notification_not_found'
  | 'notification_not_owned'

export {
  getFinishRank,
  getPackRarityChance,
  getRarityRank,
  getRarityWeight,
  normalizeRarity,
  isRareOrBetter,
  pokemonRarityOrder,
} from './pokemon-rarity'
