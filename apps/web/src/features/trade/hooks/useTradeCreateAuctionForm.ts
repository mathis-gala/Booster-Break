import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  pokemonRarityOrder,
  type CollectionSort,
} from '@tcg-collection/shared'
import type { CreateAuctionRequest, UserCollectionCard } from '@tcg-collection/shared'
import { toast } from '@/features/toast/toast-store'
import {
  usePokemonCollectionAllQueryOption,
  usePokemonCollectionQueryOption,
  usePokemonSetsQueryOption,
} from '@/lib/queries/pokemon'
import {
  MAX_ACTIVE_AUCTIONS_PER_USER,
  offerCardKey,
  toAuctionFiltersPayload,
  toAuctionRequirementsPayload,
  type TradeTextListFields,
  toCardFinish,
  formatTradeType,
} from '../lib/trade-utils'
import { useCreateTradeAuctionMutationOption } from '@/lib/mutations/trade'
import type { TradeFilterOption } from '../components/TradeFilterDropdown'
import { matchesCardNameSearch } from '@/features/dashboard/lib/card-search'
import { formatCardFinish } from '@/features/dashboard/lib/card-format'

const defaultFilterForm: TradeTextListFields = {
  setIds: [],
  rarities: [],
  types: [],
  finishes: [],
}

const normalizeCollectionValue = (value: string): string => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

const getRarityRank = (() => {
  const rankByNormalizedRarity = new Map<string, number>()

  pokemonRarityOrder.forEach((rarity, index) => {
    const normalized = normalizeCollectionValue(rarity)

    if (!rankByNormalizedRarity.has(normalized)) {
      rankByNormalizedRarity.set(normalized, index)
    }
  })

  return (rarity: string): number => {
    return rankByNormalizedRarity.get(normalizeCollectionValue(rarity)) ?? Number.MAX_SAFE_INTEGER
  }
})()

export interface UseTradeCreateAuctionFormProps {
  authAuthenticated: boolean
  activeAuctions: number
  onAuctionCreated: () => void
}

export interface UseTradeCreateAuctionFormResult {
  page: number
  setPage: (page: number) => void
  preference: CollectionSort
  setPreference: (preference: CollectionSort) => void
  selectedKey: string
  requirements: TradeTextListFields
  setRequirements: (next: TradeTextListFields) => void
  filters: TradeTextListFields
  setFilters: (next: TradeTextListFields) => void
  selectedCard: UserCollectionCard | undefined
  setSearchQuery: (query: string) => void
  searchQuery: string
  availableCards: UserCollectionCard[]
  filteredCards: UserCollectionCard[]
  collectionPage: number
  collectionPageCount: number
  collectionIsPending: boolean
  setIdOptions: TradeFilterOption[]
  rarityOptions: TradeFilterOption[]
  typeOptions: TradeFilterOption[]
  handleSelectCard: (card: UserCollectionCard) => void
  handleSearch: (query: string) => void
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void
  canCreateAuction: boolean
  isSubmitting: boolean
  remainingAuctions: number
  selectedSummary: string | null
}

export function useTradeCreateAuctionForm({
  authAuthenticated,
  activeAuctions,
  onAuctionCreated,
}: UseTradeCreateAuctionFormProps): UseTradeCreateAuctionFormResult {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [preference, setPreference] = useState<CollectionSort>('quantity')
  const pageSize = 18

  const allCardsCollection = useQuery(
    usePokemonCollectionAllQueryOption(
      {
        sort: preference,
        source: 'owned',
      },
      {
        enabled: authAuthenticated,
      },
    ),
  )

  const collection = useQuery(
    usePokemonCollectionQueryOption(
      {
        page,
        pageSize,
        sort: preference,
        source: 'owned',
      },
      {
        keepPreviousData: true,
        enabled: authAuthenticated,
      },
    ),
  )

  const setsQuery = useQuery(usePokemonSetsQueryOption())

  const [selectedKey, setSelectedKey] = useState('')
  const [requirements, setRequirements] = useState<TradeTextListFields>({ ...defaultFilterForm })
  const [filters, setFilters] = useState<TradeTextListFields>({ ...defaultFilterForm })
  const [selectedCard, setSelectedCard] = useState<UserCollectionCard | undefined>()
  const [searchQuery, setSearchQuery] = useState('')

  const createAuction = useMutation(
    useCreateTradeAuctionMutationOption(queryClient, {
      onSuccess: () => {
        setSelectedCard(undefined)
        setSelectedKey('')
        setRequirements({ ...defaultFilterForm })
        setFilters({ ...defaultFilterForm })
        onAuctionCreated()
        collection.refetch()
      },
      onError: (error) => {
        toast.show(error.message)
      },
    }),
  )

  const hasSearchQuery = searchQuery.trim().length > 0
  const availableCards = useMemo(
    () => (hasSearchQuery ? (allCardsCollection.data?.cards ?? []) : (collection.data?.cards ?? [])),
    [allCardsCollection.data?.cards, collection.data?.cards, hasSearchQuery],
  )

  const matchingCards = useMemo(() => {
    if (!hasSearchQuery) {
      return availableCards
    }

    return availableCards.filter((card) => matchesCardNameSearch(card, searchQuery))
  }, [availableCards, hasSearchQuery, searchQuery])

  const collectionPageCount = hasSearchQuery
    ? Math.max(1, Math.ceil(matchingCards.length / pageSize))
    : (collection.data?.pagination.pageCount ?? 1)
  const collectionPage = Math.min(Math.max(page, 1), collectionPageCount)
  const filteredCards = useMemo(() => {
    if (!hasSearchQuery) {
      return matchingCards
    }

    const start = (collectionPage - 1) * pageSize

    return matchingCards.slice(start, start + pageSize)
  }, [collectionPage, hasSearchQuery, matchingCards, pageSize])

  const setIdOptions = useMemo<TradeFilterOption[]>(() => {
    return (setsQuery.data ?? [])
      .map((set) => ({
        value: set.id,
        label: set.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [setsQuery.data])

  const selectorCards = useMemo(
    () => allCardsCollection.data?.cards ?? [],
    [allCardsCollection.data?.cards],
  )

  const rarityOptions = useMemo(() => {
    const knownRarities = new Map<string, string>()

    for (const value of pokemonRarityOrder) {
      const normalized = normalizeCollectionValue(value)

      if (!knownRarities.has(normalized)) {
        knownRarities.set(normalized, value)
      }
    }

    for (const card of selectorCards) {
      if (card.rarity) {
        const normalized = normalizeCollectionValue(card.rarity)

        if (!knownRarities.has(normalized)) {
          knownRarities.set(normalized, card.rarity)
        }
      }
    }

    const orderedRarities = Array.from(knownRarities.values()).sort((a, b) => {
      const firstIndex = getRarityRank(a)
      const secondIndex = getRarityRank(b)

      if (firstIndex !== secondIndex) {
        return firstIndex - secondIndex
      }

      return a.localeCompare(b)
    })

    return orderedRarities.map((value) => ({
      value,
      label: value,
    }))
  }, [selectorCards])

  const typeOptions = useMemo(() => {
    const knownTypes: string[] = ['Pokemon', 'Trainer', 'Energy']
    const values = new Set(knownTypes)

    for (const card of selectorCards) {
      if (card.supertype) {
        values.add(card.supertype)
      }
    }

    const normalizedSeen = new Set<string>()

    return [...new Set(Array.from(values))]
      .filter((value) => {
        const normalized = normalizeCollectionValue(value)

        if (normalizedSeen.has(normalized)) {
          return false
        }

        normalizedSeen.add(normalized)

        return true
      })
      .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
      .map((value) => ({
        value,
        label: formatTradeType(value),
      }))
  }, [selectorCards])

  const handleSelectCard = (card: UserCollectionCard) => {
    setSelectedCard(card)
    setSelectedKey(offerCardKey(card.id, card.finish ?? undefined))
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setPage(1)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedCard) {
      return
    }

    const payload: CreateAuctionRequest = {
      offeredCardId: selectedCard.id,
      offeredCardFinish: toCardFinish(selectedCard.finish),
      requirements: toAuctionRequirementsPayload(requirements),
      filters: toAuctionFiltersPayload(filters),
    }

    createAuction.mutate(payload)
  }

  const selectedSummary = useMemo(() => {
    if (!selectedCard) {
      return null
    }

    return `${selectedCard.name} · ${formatCardFinish(selectedCard.finish ?? 'normal')}`
  }, [selectedCard])

  const remainingAuctions = Math.max(0, MAX_ACTIVE_AUCTIONS_PER_USER - activeAuctions)
  const canCreateAuction = authAuthenticated && selectedCard !== undefined && remainingAuctions > 0

  return {
    page,
    setPage,
    preference,
    setPreference,
    selectedKey,
    requirements,
    setRequirements,
    filters,
    setFilters,
    selectedCard,
    setSearchQuery,
    searchQuery,
    availableCards,
    filteredCards,
    collectionPage,
    collectionPageCount,
    collectionIsPending: hasSearchQuery ? allCardsCollection.isPending : collection.isPending,
    setIdOptions,
    rarityOptions,
    typeOptions,
    handleSelectCard,
    handleSearch,
    handleSubmit,
    canCreateAuction,
    isSubmitting: createAuction.isPending,
    remainingAuctions,
    selectedSummary,
  }
}
