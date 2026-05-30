import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type {
  CollectionSort,
  SupportedLocale,
  TradeAuctionResponse,
  TradeOfferItem,
  UserCollectionCard,
} from '@tcg-collection/shared'
import { usePokemonCollectionAllQuery } from '@/features/dashboard/hooks/usePokemonQueries'
import { toast } from '@/features/toast/toast-store'
import {
  MAX_PENDING_OFFERS_PER_AUCTION_BY_USER,
  cardMatchesAuctionFilters,
  offerCardKey,
  toCardFinish,
} from '../lib/trade-utils'
import { useCreateTradeOfferMutation } from './useTradeQueries'
import { m } from '@/paraglide/messages'

interface SelectedOfferCard {
  card: UserCollectionCard
  quantity: number
}

const PAGE_SIZE = 16

interface UseTradeOfferComposerProps {
  auction: TradeAuctionResponse
  locale: SupportedLocale
  userId?: string
  onOfferCreated: () => void
}

export interface UseTradeOfferComposerResult {
  isAuctionOwner: boolean
  canOffer: boolean
  canOfferReason: 'not_connected' | 'auction_owner' | 'offer_limit_reached' | 'auction_inactive' | null
  offerLimitReached: boolean
  activeOfferCount: number
  remainingOffers: number
  page: number
  setPage: (page: number) => void
  preference: CollectionSort
  setPreference: (preference: CollectionSort) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  collectionPageCount: number
  collectionPage: number
  isCollectionPending: boolean
  filteredCards: UserCollectionCard[]
  selectedEntries: SelectedOfferCard[]
  selectedCardsCount: number
  selectedCardsTotal: number
  selectedCardQuantity: (card: UserCollectionCard) => number
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void
  clearSelection: () => void
  updateSelection: (card: UserCollectionCard, rawValue: string) => void
  isSubmitting: boolean
}

export function useTradeOfferComposer({
  auction,
  locale,
  userId,
  onOfferCreated,
}: UseTradeOfferComposerProps): UseTradeOfferComposerResult {
  const [page, setPage] = useState(1)
  const [preference, setPreference] = useState<CollectionSort>('quantity')
  const [searchQuery, setSearchQuery] = useState('')
  const [selection, setSelection] = useState<Record<string, SelectedOfferCard>>({})

  const collection = usePokemonCollectionAllQuery({
    sort: preference,
    locale,
    enabled: Boolean(userId),
  })

  const createOffer = useCreateTradeOfferMutation({
    locale,
    onSuccess: () => {
      setSelection({})
      onOfferCreated()
    },
    onError: (error) => {
      toast.show(error.message)
    },
  })

  const isAuctionOwner = auction.creatorId === userId
  const activeOfferCount = userId
    ? auction.offers.filter((offer) => offer.proposerId === userId && offer.status === 'pending').length
    : 0

  const remainingOffers = Math.max(0, MAX_PENDING_OFFERS_PER_AUCTION_BY_USER - activeOfferCount)
  const offerLimitReached = remainingOffers <= 0

  const canOffer = Boolean(userId) && !isAuctionOwner && auction.status === 'active' && !offerLimitReached

  const canOfferReason = (() => {
    if (!userId) {
      return 'not_connected' as const
    }

    if (!auction || auction.status !== 'active') {
      return 'auction_inactive' as const
    }

    if (isAuctionOwner) {
      return 'auction_owner' as const
    }

    if (offerLimitReached) {
      return 'offer_limit_reached' as const
    }

    return null
  })()

  const availableCards = collection.data?.cards ?? []
  const eligibleCards = useMemo(() => {
    return availableCards.filter((card) =>
      cardMatchesAuctionFilters(card, auction.requirements, auction.filters),
    )
  }, [availableCards, auction.requirements, auction.filters])
  const filteredCards = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (query.length === 0) {
      return eligibleCards
    }

    return eligibleCards.filter((card) => card.name.toLowerCase().includes(query))
  }, [eligibleCards, searchQuery])

  const collectionPageCount = Math.max(1, Math.ceil(filteredCards.length / PAGE_SIZE))
  const collectionPage = Math.max(1, Math.min(page, collectionPageCount))
  const pagedCards = useMemo(() => {
    const start = (collectionPage - 1) * PAGE_SIZE

    return filteredCards.slice(start, start + PAGE_SIZE)
  }, [collectionPage, filteredCards])

  const selectedEntries = Object.values(selection)
  const selectedCardsCount = selectedEntries.length
  const selectedCardsTotal = selectedEntries.reduce((acc, item) => acc + item.quantity, 0)

  const updateSelection = (card: UserCollectionCard, rawValue: string) => {
    const nextQuantity = Number(rawValue)

    if (Number.isNaN(nextQuantity) || nextQuantity <= 0) {
      setSelection((current) => {
        const key = offerCardKey(card.id, card.finish)

        if (!current[key]) {
          return current
        }

        const next = { ...current }
        delete next[key]

        return next
      })

      return
    }

    const clampedQuantity = Math.min(nextQuantity, card.quantity)
    const key = offerCardKey(card.id, card.finish)

    setSelection((current) => ({
      ...current,
      [key]: {
        card,
        quantity: clampedQuantity,
      },
    }))
  }

  const selectedCardQuantity = (card: UserCollectionCard): number => {
    return selection[offerCardKey(card.id, card.finish)]?.quantity ?? 0
  }

  const createOfferPayload = (): TradeOfferItem[] => {
    return selectedEntries
      .filter((card) => card.quantity > 0)
      .map((card) => ({
        cardId: card.card.id,
        finish: toCardFinish(card.card.finish),
        quantity: card.quantity,
      }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!canOffer) {
      toast.show(m.trade_cannot_make_offer())
      return
    }

    const payload = createOfferPayload()

    if (payload.length === 0) {
      toast.show(m.trade_add_card_before_send_offer())
      return
    }

    createOffer.mutate({
      auctionId: auction.id,
      payload: {
        cards: payload,
      },
    })
  }

  const clearSelection = () => {
    setSelection({})
  }

  return {
    isAuctionOwner,
    canOffer,
    canOfferReason,
    offerLimitReached,
    activeOfferCount,
    remainingOffers,
    page,
    setPage,
    preference,
    setPreference,
    searchQuery,
    setSearchQuery,
    collectionPageCount,
    collectionPage,
    isCollectionPending: collection.isPending,
    filteredCards: pagedCards,
    selectedEntries,
    selectedCardsCount,
    selectedCardsTotal,
    selectedCardQuantity,
    handleSubmit,
    clearSelection,
    updateSelection,
    isSubmitting: createOffer.isPending,
  }
}
