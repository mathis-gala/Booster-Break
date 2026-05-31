import { m } from '@/paraglide/messages'
import type { TradeFilterOption } from './TradeFilterDropdown'
import type { TradeTextListFields } from '../lib/trade-utils'
import { TradeFilterDropdown } from './TradeFilterDropdown'

interface TradeCreateAuctionFiltersSectionProps {
  requirements: TradeTextListFields
  filters: TradeTextListFields
  setIdOptions: TradeFilterOption[]
  rarityOptions: TradeFilterOption[]
  typeOptions: TradeFilterOption[]
  finishOptions: TradeFilterOption[]
  onRequirementsChange: (next: TradeTextListFields) => void
  onFiltersChange: (next: TradeTextListFields) => void
}

export function TradeCreateAuctionFiltersSection({
  requirements,
  filters,
  setIdOptions,
  rarityOptions,
  typeOptions,
  finishOptions,
  onRequirementsChange,
  onFiltersChange,
}: TradeCreateAuctionFiltersSectionProps) {
  return (
    <>
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
          {m.trade_offer_preferences_title()}
        </p>
        <p className="text-xs text-muted-foreground">{m.trade_offer_preferences_hint()}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <TradeFilterDropdown
          id="auction-requirements-set-ids"
          label={m.trade_required_set_ids()}
          selected={requirements.setIds}
          options={setIdOptions}
          emptyLabel={m.trade_any_card()}
          onChange={(next) => onRequirementsChange({ ...requirements, setIds: next })}
        />
        <TradeFilterDropdown
          id="auction-requirements-rarities"
          label={m.trade_required_rarities()}
          selected={requirements.rarities}
          options={rarityOptions}
          emptyLabel={m.trade_any_card()}
          onChange={(next) => onRequirementsChange({ ...requirements, rarities: next })}
        />
        <TradeFilterDropdown
          id="auction-requirements-types"
          label={m.trade_required_types()}
          selected={requirements.types}
          options={typeOptions}
          emptyLabel={m.trade_any_card()}
          onChange={(next) => onRequirementsChange({ ...requirements, types: next })}
        />
        <TradeFilterDropdown
          id="auction-requirements-finishes"
          label={m.trade_required_finishes()}
          selected={requirements.finishes}
          options={finishOptions}
          emptyLabel={m.trade_any_card()}
          onChange={(next) => onRequirementsChange({ ...requirements, finishes: next })}
        />
      </div>

      <div>
        <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
          {m.trade_offer_exclusions_title()}
        </p>
        <p className="text-xs text-muted-foreground">{m.trade_filters_hint()}</p>

        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <TradeFilterDropdown
            id="auction-filters-set-ids"
            label={m.trade_excluded_set_ids()}
            selected={filters.setIds}
            options={setIdOptions}
            emptyLabel={m.trade_no_restriction()}
            onChange={(next) => onFiltersChange({ ...filters, setIds: next })}
          />
          <TradeFilterDropdown
            id="auction-filters-rarities"
            label={m.trade_excluded_rarities()}
            selected={filters.rarities}
            options={rarityOptions}
            emptyLabel={m.trade_no_restriction()}
            onChange={(next) => onFiltersChange({ ...filters, rarities: next })}
          />
          <TradeFilterDropdown
            id="auction-filters-types"
            label={m.trade_excluded_types()}
            selected={filters.types}
            options={typeOptions}
            emptyLabel={m.trade_no_restriction()}
            onChange={(next) => onFiltersChange({ ...filters, types: next })}
          />
          <TradeFilterDropdown
            id="auction-filters-finishes"
            label={m.trade_excluded_finishes()}
            selected={filters.finishes}
            options={finishOptions}
            emptyLabel={m.trade_no_restriction()}
            onChange={(next) => onFiltersChange({ ...filters, finishes: next })}
          />
        </div>
      </div>
    </>
  )
}
