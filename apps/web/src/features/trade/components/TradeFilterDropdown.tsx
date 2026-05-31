import { ChevronDownIcon } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface TradeFilterOption {
  value: string
  label: string
}

interface TradeFilterDropdownProps {
  id: string
  label: string
  selected: string[]
  options: TradeFilterOption[]
  emptyLabel: string
  onChange: (next: string[]) => void
  className?: string
}

export function TradeFilterDropdown({
  id,
  label,
  selected,
  options,
  emptyLabel,
  onChange,
  className,
}: TradeFilterDropdownProps) {
  const optionLookup = new Map<string, string>(
    options.map((option) => [option.value, option.label]),
  )
  const selectedLabels = selected.map((value) => optionLookup.get(value) ?? value).filter(Boolean)

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((entry) => entry !== value))

      return
    }

    onChange([...selected, value])
  }

  const renderedSummary =
    selected.length === 0
      ? emptyLabel
      : selectedLabels.length <= 2
        ? selectedLabels.join(', ')
        : `${selectedLabels.slice(0, 2).join(', ')} +${selectedLabels.length - 2}`

  return (
    <label className={cn('flex flex-col gap-1', className)}>
      <span className="text-xs font-black uppercase text-muted-foreground">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger
          id={id}
          className="flex h-9 cursor-pointer items-center justify-between rounded-md border bg-background px-2 py-1.5 text-left text-xs"
        >
          <span className="truncate">{renderedSummary}</span>
          <ChevronDownIcon aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-72 w-56 overflow-y-auto" align="start">
          {options.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">{emptyLabel}</p>
          ) : (
            options.map((option) => (
              <DropdownMenuCheckboxItem
                key={`${id}-${option.value}`}
                checked={selected.includes(option.value)}
                className="cursor-pointer"
                onCheckedChange={() => {
                  toggle(option.value)
                }}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </label>
  )
}
