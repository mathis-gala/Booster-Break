import { useMemo } from 'react'
import { type CollectionSort } from '@tcg-collection/shared'
import type { AuthMeResponse } from '@tcg-collection/shared'
import { m } from '@/paraglide/messages'
import { formatCardFinish } from '@/features/dashboard/lib/card-format'
import { formatRarity } from '@/features/i18n/rarity-labels'
import { formatTradeType, MAX_ACTIVE_AUCTIONS_PER_USER } from '../lib/trade-utils'
import { useTradeCreateAuctionForm } from '../hooks/useTradeCreateAuctionForm'
import { TradeCreateAuctionCardSection } from './TradeCreateAuctionCardSection'
import { TradeCreateAuctionFiltersSection } from './TradeCreateAuctionFiltersSection'

interface TradeCreateAuctionPanelProps {
  auth: AuthMeResponse
  activeAuctions: number
  onAuctionCreated: () => void
}

export function TradeCreateAuctionPanel({
  auth,
  activeAuctions,
  onAuctionCreated,
}: TradeCreateAuctionPanelProps) {
  const {
    availableCards,
    canCreateAuction,
    collectionIsPending,
    collectionPage,
    collectionPageCount,
    filters,
    filteredCards,
    handleSearch,
    handleSelectCard,
    handleSubmit,
    isSubmitting,
    page,
    preference,
    requirements,
    searchQuery,
    selectedCard,
    selectedKey,
    setFilters,
    setPage,
    setPreference,
    setRequirements,
    setIdOptions,
    rarityOptions,
    typeOptions,
  } = useTradeCreateAuctionForm({
    activeAuctions,
    authAuthenticated: auth.authenticated,
    onAuctionCreated,
  })

  const tradePreferenceOptions: readonly { value: CollectionSort; label: string }[] = [
    { value: 'quantity', label: m.sort_quantity() },
    { value: 'rarity', label: m.sort_rarity() },
    { value: 'name', label: m.sort_name() },
    { value: 'recent', label: m.sort_recent() },
  ]

  const finishOptions = useMemo(
    () => [
      { value: 'normal', label: formatCardFinish('normal') },
      { value: 'holo', label: formatCardFinish('holo') },
      { value: 'reverse_holo', label: formatCardFinish('reverse_holo') },
    ],
    [],
  )

  const formattedRarityOptions = useMemo(
    () =>
      rarityOptions.map((option) => ({
        ...option,
        label: formatRarity(option.label),
      })),
    [rarityOptions],
  )
  const formattedTypeOptions = useMemo(
    () =>
      typeOptions.map((option) => ({
        ...option,
        label: formatTradeType(option.label),
      })),
    [typeOptions],
  )

  const selectedSummaryLabel = useMemo(() => {
    if (!selectedCard) {
      return null
    }

    return `${selectedCard.name} · ${formatCardFinish(selectedCard.finish)}`
  }, [selectedCard])

  const handlePreferenceChange = (next: CollectionSort) => {
    setPage(1)
    setPreference(next)
  }

  const goPrevPage = () => {
    setPage(Math.max(page - 1, 1))
  }

  const goNextPage = () => {
    setPage(Math.min(page + 1, collectionPageCount))
  }

  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="text-sm font-black uppercase tracking-wide text-muted-foreground">
        {m.trade_create_auction()}
      </h2>

      {!auth.authenticated ? (
        <p className="mt-3 text-sm font-semibold text-muted-foreground">
          {m.trade_sign_in_to_publish()}
        </p>
      ) : null}

      {auth.authenticated ? (
        <form className="mt-3 space-y-4" onSubmit={handleSubmit}>
          <p className="text-xs text-muted-foreground">
            {m.trade_auction_creation_quota({
              used: activeAuctions,
              max: MAX_ACTIVE_AUCTIONS_PER_USER,
            })}
          </p>
          <TradeCreateAuctionCardSection
            preference={preference}
            searchQuery={searchQuery}
            onSearchChange={handleSearch}
            preferenceOptions={tradePreferenceOptions}
            onPreferenceChange={handlePreferenceChange}
            filteredCards={filteredCards}
            isLoading={collectionIsPending}
            collectionHasCards={availableCards.length > 0}
            collectionPage={collectionPage}
            collectionPageCount={collectionPageCount}
            onPrevPage={goPrevPage}
            onNextPage={goNextPage}
            selectedCard={selectedCard}
            selectedKey={selectedKey}
            selectedSummary={selectedSummaryLabel}
            onSelectCard={handleSelectCard}
          />

          <TradeCreateAuctionFiltersSection
            requirements={requirements}
            filters={filters}
            setIdOptions={setIdOptions}
            rarityOptions={formattedRarityOptions}
            typeOptions={formattedTypeOptions}
            finishOptions={finishOptions}
            onRequirementsChange={(next) => {
              setRequirements(next)
            }}
            onFiltersChange={(next) => {
              setFilters(next)
            }}
          />

          <button
            type="submit"
            className="cursor-pointer h-10 w-full rounded-lg bg-sidebar px-3 text-sm font-black text-sidebar-foreground disabled:cursor-not-allowed disabled:opacity-55"
            disabled={!canCreateAuction || isSubmitting}
          >
            {isSubmitting ? m.trade_publishing() : m.trade_publish()}
          </button>
        </form>
      ) : null}
    </section>
  )
}
