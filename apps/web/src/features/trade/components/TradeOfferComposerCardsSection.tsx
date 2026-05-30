import { m } from '@/paraglide/messages'
import type { CollectionSort, UserCollectionCard } from '@tcg-collection/shared'
import { TradeCollectionCardItem } from './TradeCollectionCardItem'
import { TradeSortPreferenceMenu } from './TradeSortPreferenceMenu'
import {
  MAX_PENDING_OFFERS_PER_AUCTION_BY_USER,
  offerCardKey,
} from '../lib/trade-utils'

interface TradeOfferComposerCardsSectionProps {
  collectionPage: number
  collectionPageCount: number
  isLoading: boolean
  preference: CollectionSort
  onPreferenceChange: (preference: CollectionSort) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  tradePreferenceOptions: readonly { value: CollectionSort; label: string }[]
  filteredCards: UserCollectionCard[]
  selectedCardsCount: number
  selectedCardsTotal: number
  activeOfferCount: number
  remainingOffers: number
  onPrevPage: () => void
  onNextPage: () => void
  getCardQuantity: (card: UserCollectionCard) => number
  updateSelection: (card: UserCollectionCard, rawValue: string) => void
}

export function TradeOfferComposerCardsSection({
  collectionPage,
  collectionPageCount,
  isLoading,
  preference,
  onPreferenceChange,
  searchQuery,
  onSearchChange,
  tradePreferenceOptions,
  filteredCards,
  selectedCardsCount,
  selectedCardsTotal,
  activeOfferCount,
  remainingOffers,
  onPrevPage,
  onNextPage,
  getCardQuantity,
  updateSelection,
}: TradeOfferComposerCardsSectionProps) {
  return (
    <>
      <label className="flex items-center justify-between gap-2 rounded-md bg-background px-3 py-2 text-xs text-muted-foreground">
        {m.trade_card_preference_label()}
        <TradeSortPreferenceMenu
          value={preference}
          options={tradePreferenceOptions}
          onValueChange={onPreferenceChange}
        />
      </label>

      <div className="rounded-md bg-background px-3 py-2 text-xs text-muted-foreground">
        <p>
          {selectedCardsCount === 1
            ? m.trade_offer_selected_one({ count: selectedCardsCount })
            : m.trade_offer_selected_many({ count: selectedCardsCount })}
          {' · '}
          {m.trade_offer_total({ count: selectedCardsTotal })}
          {' · '}
          {m.trade_offer_quota({
            used: activeOfferCount,
            max: MAX_PENDING_OFFERS_PER_AUCTION_BY_USER,
            remaining: remainingOffers,
          })}
        </p>
      </div>

      <label className="mt-2 flex w-full items-center gap-2">
        <span className="shrink-0 text-xs font-black uppercase tracking-wide text-muted-foreground">
          {m.trade_search_by_pokemon_label()}
        </span>
        <input
          value={searchQuery}
          onChange={(event) => {
            onSearchChange(event.target.value)
          }}
          className="h-9 flex-1 min-w-0 rounded-md border bg-background px-2 text-sm placeholder:text-xs"
          placeholder={m.trade_search_by_pokemon_placeholder()}
          aria-label={m.trade_search_by_pokemon_aria()}
        />
      </label>

      <div className="flex min-h-[14rem] min-w-0 flex-wrap content-start justify-center gap-3">
        {filteredCards.length === 0 ? (
          <p className="rounded-md bg-background p-3 text-sm text-muted-foreground">
            {searchQuery.length > 0 ? m.trade_search_no_match() : m.trade_loading_cards_for_offer()}
          </p>
        ) : (
          filteredCards.map((card) => {
            const selectedQuantity = getCardQuantity(card)
            const key = offerCardKey(card.id, card.finish)

            return (
              <TradeCollectionCardItem key={key} card={card}>
                <label
                  className="mt-2 block text-xs text-muted-foreground"
                  htmlFor={`trade-offer-${key}`}
                >
                  {m.trade_offer_quantity()}
                </label>
                <input
                  id={`trade-offer-${key}`}
                  type="number"
                  min="0"
                  max={card.quantity}
                  inputMode="numeric"
                  className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm tabular-nums"
                  value={selectedQuantity}
                  onChange={(event) => updateSelection(card, event.target.value)}
                />
              </TradeCollectionCardItem>
            )
          })
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <button
          type="button"
          className="cursor-pointer rounded-md border px-3 py-2"
          disabled={collectionPage <= 1 || isLoading}
          onClick={onPrevPage}
        >
          {m.packs_previous()}
        </button>
        <span>
          {collectionPage} / {collectionPageCount}
        </span>
        <button
          type="button"
          className="cursor-pointer rounded-md border px-3 py-2"
          disabled={collectionPage >= collectionPageCount || isLoading}
          onClick={onNextPage}
        >
          {m.packs_next()}
        </button>
      </div>
    </>
  )
}
