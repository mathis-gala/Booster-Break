import { type CollectionSort, type UserCollectionCard } from '@tcg-collection/shared'
import { m } from '@/paraglide/messages'
import { FoilCardImage } from '@/features/dashboard/components/FoilCardImage'
import { TradeCollectionCardItem } from './TradeCollectionCardItem'
import { TradeSortPreferenceMenu } from './TradeSortPreferenceMenu'
import { offerCardKey } from '../lib/trade-utils'

interface TradeCreateAuctionCardSectionProps {
  preference: CollectionSort
  searchQuery: string
  onSearchChange: (query: string) => void
  preferenceOptions: readonly { value: CollectionSort; label: string }[]
  onPreferenceChange: (preference: CollectionSort) => void
  filteredCards: UserCollectionCard[]
  isLoading: boolean
  collectionHasCards: boolean
  collectionPage: number
  collectionPageCount: number
  onPrevPage: () => void
  onNextPage: () => void
  selectedCard?: UserCollectionCard
  selectedKey: string
  selectedSummary: string | null
  onSelectCard: (card: UserCollectionCard) => void
}

export function TradeCreateAuctionCardSection({
  preference,
  searchQuery,
  onSearchChange,
  preferenceOptions,
  onPreferenceChange,
  filteredCards,
  isLoading,
  collectionHasCards,
  collectionPage,
  collectionPageCount,
  onPrevPage,
  onNextPage,
  selectedCard,
  selectedKey,
  selectedSummary,
  onSelectCard,
}: TradeCreateAuctionCardSectionProps) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
          {m.trade_card_selection_step()}
        </p>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          {m.trade_card_preference_label()}
          <TradeSortPreferenceMenu
            value={preference}
            options={preferenceOptions}
            onValueChange={onPreferenceChange}
            className="min-w-32"
          />
        </label>
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

      <div className="mt-2 flex min-h-[14rem] min-w-0 flex-wrap content-start justify-center gap-3">
        {filteredCards.length === 0 ? (
          isLoading ? (
            <p className="rounded-md bg-background p-3 text-sm text-muted-foreground">
              {m.trade_loading_cards()}
            </p>
          ) : (
            <p className="rounded-md bg-background p-3 text-sm text-muted-foreground">
              {searchQuery.length > 0
                ? m.trade_search_no_match()
                : m.trade_no_cards_in_collection()}
            </p>
          )
        ) : (
          filteredCards.map((card) => {
            const key = offerCardKey(card.id, card.finish)
            const isSelected = selectedKey === key

            return (
              <TradeCollectionCardItem
                key={key}
                card={card}
                onSelect={() => onSelectCard(card)}
                selected={isSelected}
                className="transition enabled:hover:border-sidebar enabled:hover:bg-sidebar/5"
                badge={isSelected ? m.trade_used() : null}
              />
            )
          })
        )}
      </div>

      {collectionHasCards ? (
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <button
            type="button"
            className="cursor-pointer rounded-md border px-2 py-1"
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
            className="cursor-pointer rounded-md border px-2 py-1"
            disabled={collectionPage >= collectionPageCount || isLoading}
            onClick={onNextPage}
          >
            {m.packs_next()}
          </button>
        </div>
      ) : null}

      <p className="mt-2 text-sm font-semibold text-muted-foreground">
        {selectedSummary
          ? `${m.trade_selected_card_label()}: ${selectedSummary}`
          : m.trade_pick_one_card()}
      </p>

      {selectedCard ? (
        <div className="mt-2 flex justify-center">
          <div className="w-full max-w-md">
            <div className="rounded-lg border bg-background p-2">
              <FoilCardImage
                src={selectedCard.imageLarge ?? selectedCard.imageSmall ?? ''}
                alt={selectedCard.name}
                finish={selectedCard.finish}
                className="w-full rounded-md"
              />
              <p className="mt-1 text-center text-sm font-black">{selectedSummary ?? selectedCard.name}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
