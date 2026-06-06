import { type FormEvent } from 'react'
import type { CollectionSort, TradeAuctionResponse } from '@tcg-collection/shared'
import { m } from '@/paraglide/messages'
import { toast } from '@/features/toast/toast-store'
import { useTradeOfferComposer } from '../hooks/useTradeOfferComposer'
import { TradeOfferComposerCardsSection } from './TradeOfferComposerCardsSection'
import { TradeOfferComposerPreviewSection } from './TradeOfferComposerPreviewSection'

interface TradeOfferComposerProps {
  auction: TradeAuctionResponse
  userId?: string
  onOfferCreated: () => void
}

export function TradeOfferComposer({
  auction,
  userId,
  onOfferCreated,
}: TradeOfferComposerProps) {
  const {
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
    collectionPage,
    collectionPageCount,
    isCollectionPending,
    filteredCards,
    selectedEntries,
    selectedCardsCount,
    selectedCardsTotal,
    selectedCardQuantity,
    handleSubmit,
    clearSelection,
    updateSelection,
    isSubmitting,
  } = useTradeOfferComposer({
    auction,
    userId,
    onOfferCreated,
  })

  const tradePreferenceOptions: readonly { value: CollectionSort; label: string }[] = [
    { value: 'quantity', label: m.sort_quantity() },
    { value: 'rarity', label: m.sort_rarity() },
    { value: 'name', label: m.sort_name() },
    { value: 'recent', label: m.sort_recent() },
  ]

  const handlePreferenceChange = (next: CollectionSort) => {
    setPage(1)
    setPreference(next)
  }

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    setPage(1)
  }

  if (!userId) {
    return (
      <p className="text-sm font-semibold text-muted-foreground">
        {m.trade_connect_to_send_offers()}
      </p>
    )
  }

  if (!canOffer) {
    if (offerLimitReached || canOfferReason === 'offer_limit_reached') {
      return (
        <p className="text-sm font-semibold text-muted-foreground">
          {m.trade_offer_limit_reached()}
        </p>
      )
    }

    return (
      <p className="text-sm font-semibold text-muted-foreground">{m.trade_cannot_make_offer()}</p>
    )
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (selectedCardsCount === 0) {
      toast.show(m.trade_add_card_before_send_offer())
      return
    }

    handleSubmit(event)
  }

  return (
    <section className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-black uppercase tracking-wide text-muted-foreground">
        {m.trade_offer_cards_title()}
      </h3>

      <form className="mt-3 space-y-4" onSubmit={onSubmit}>
        <TradeOfferComposerCardsSection
          collectionPage={collectionPage}
          collectionPageCount={collectionPageCount}
          isLoading={isCollectionPending}
          preference={preference}
          onPreferenceChange={handlePreferenceChange}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          tradePreferenceOptions={tradePreferenceOptions}
          filteredCards={filteredCards}
          selectedCardsCount={selectedCardsCount}
          selectedCardsTotal={selectedCardsTotal}
          activeOfferCount={activeOfferCount}
          remainingOffers={remainingOffers}
          onPrevPage={() => setPage(Math.max(page - 1, 1))}
          onNextPage={() => setPage(Math.min(page + 1, collectionPageCount))}
          getCardQuantity={selectedCardQuantity}
          updateSelection={updateSelection}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="h-10 cursor-pointer rounded-lg bg-sidebar px-3 text-sm font-black text-sidebar-foreground disabled:cursor-not-allowed disabled:opacity-55"
            disabled={selectedCardsCount === 0 || isSubmitting}
          >
            {isSubmitting ? m.trade_offer_sending() : m.trade_submit_offer()}
          </button>
          <button
            type="button"
            className="h-10 cursor-pointer rounded-lg border px-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-55"
            onClick={clearSelection}
          >
            {m.trade_offer_clear()}
          </button>
        </div>

        {isCollectionPending ? (
          <p className="text-sm font-semibold text-muted-foreground">
            {m.trade_loading_cards_for_offer()}
          </p>
        ) : null}
      </form>

      <TradeOfferComposerPreviewSection selectedEntries={selectedEntries} />
    </section>
  )
}
