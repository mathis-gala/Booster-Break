export const supportedLocales = ['fr', 'en'] as const
export type SupportedLocale = (typeof supportedLocales)[number]

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

export {
  getFinishRank,
  getPackRarityChance,
  getRarityRank,
  getRarityWeight,
  isRareOrBetter,
  pokemonRarityOrder,
} from './pokemon-rarity'
