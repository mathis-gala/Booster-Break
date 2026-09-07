import { FilterIcon } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatRarity } from '@/features/i18n/rarity-labels'
import { m } from '@/paraglide/messages'
interface CardListFiltersMenuProps {
  minimumQuantity: number
  minimumRarity?: string
  rarityOptions: readonly string[]
  onMinimumQuantityChange: (quantity: number) => void
  onMinimumRarityChange: (rarity: string | undefined) => void
}

export function CardListFiltersMenu({
  minimumQuantity,
  minimumRarity,
  rarityOptions,
  onMinimumQuantityChange,
  onMinimumRarityChange,
}: CardListFiltersMenuProps) {
  const activeFilterCount = Number(minimumQuantity > 1) + Number(Boolean(minimumRarity))
  const hasActiveFilters = minimumQuantity > 1 || Boolean(minimumRarity)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={m.card_filters_label()}
        className="flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15"
      >
        <FilterIcon aria-hidden="true" className="size-4" />
        {m.card_filters_label()}
        {activeFilterCount > 0 ? (
          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-black leading-none text-primary-foreground">
            {activeFilterCount}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{m.card_filters_minimum_quantity()}</DropdownMenuLabel>
          <div
            className="flex items-center gap-2 px-1.5 pb-1.5"
            onClick={(event) => event.stopPropagation()}
          >
            <input
              type="number"
              min={1}
              max={999}
              step={1}
              value={minimumQuantity}
              aria-label={m.card_filters_minimum_quantity()}
              className="h-8 w-16 rounded-md border bg-background px-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
              onChange={(event) => {
                const quantity = Number(event.target.value)

                if (Number.isInteger(quantity) && quantity >= 1 && quantity <= 999) {
                  onMinimumQuantityChange(quantity)
                }
              }}
            />
            <span className="text-xs text-muted-foreground">
              {m.card_filters_minimum_quantity_suffix()}
            </span>
          </div>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>{m.card_filters_minimum_rarity()}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={minimumRarity ?? ''}
            onValueChange={(value) => onMinimumRarityChange(value || undefined)}
          >
            <DropdownMenuRadioItem value="" className="cursor-pointer">
              {m.card_filters_any_rarity()}
            </DropdownMenuRadioItem>
            {rarityOptions.map((rarity) => (
              <DropdownMenuRadioItem key={rarity} value={rarity} className="cursor-pointer">
                {formatRarity(rarity)}+
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        {hasActiveFilters ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-muted-foreground"
              onClick={() => {
                onMinimumQuantityChange(1)
                onMinimumRarityChange(undefined)
              }}
            >
              {m.card_filters_reset()}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
