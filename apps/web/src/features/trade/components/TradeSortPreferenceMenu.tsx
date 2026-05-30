import { CheckIcon, ChevronDownIcon } from 'lucide-react'
import type { CollectionSort } from '@tcg-collection/shared'
import { m } from '@/paraglide/messages'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface TradeSortPreferenceOption {
  value: CollectionSort
  label: string
}

interface TradeSortPreferenceMenuProps {
  value: CollectionSort
  options: readonly TradeSortPreferenceOption[]
  onValueChange: (value: CollectionSort) => void
  className?: string
}

export function TradeSortPreferenceMenu({
  value,
  options,
  onValueChange,
  className,
}: TradeSortPreferenceMenuProps) {
  const selectedLabel = options.find((option) => option.value === value)?.label

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={m.trade_card_preference_label()}
        className={cn(
          'flex cursor-pointer items-center justify-between gap-2 rounded-md border px-2 py-1 text-left text-xs',
          'bg-background text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
      >
        <span>{selectedLabel ?? value}</span>
        <ChevronDownIcon aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onValueChange(option.value)}
            className="h-9 cursor-pointer px-2.5"
          >
            <span className="mr-auto">{option.label}</span>
            {option.value === value ? <CheckIcon aria-hidden="true" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
