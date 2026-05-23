import type { ComponentType, SVGProps } from 'react'

import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'

interface NavButtonProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  isActive: boolean
  isDisabled?: boolean
  label: string
  size: 'mobile' | 'desktop'
  onSelect: () => void
}

export function NavButton({
  icon: Icon,
  isActive,
  isDisabled,
  label,
  size,
  onSelect,
}: NavButtonProps) {
  if (isDisabled) {
    return (
      <div
        className="group relative"
        tabIndex={0}
        aria-label={`${label}: ${m.nav_not_implemented()}`}
      >
        <button
          type="button"
          aria-disabled="true"
          tabIndex={-1}
          className={cn(
            'flex w-full cursor-not-allowed items-center rounded-lg text-sm font-semibold text-sidebar-foreground/88 opacity-45 transition-colors focus-visible:outline-none',
            size === 'mobile' ? 'h-11 gap-3 px-3' : 'h-10 shrink-0 gap-2 px-3',
          )}
          onClick={(event) => event.preventDefault()}
        >
          <Icon aria-hidden="true" />
          {label}
        </button>
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-40 w-max max-w-44 rounded-md bg-slate-950 px-2 py-1 text-[0.68rem] font-black text-slate-50 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus:opacity-100',
            size === 'mobile' ? 'left-3 top-full mt-1' : 'left-full top-1/2 ml-2 -translate-y-1/2',
          )}
        >
          {m.nav_not_implemented()}
        </span>
      </div>
    )
  }

  const button = (
    <button
      type="button"
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex w-full cursor-pointer items-center rounded-lg text-sm font-semibold transition-colors hover:bg-sidebar-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        size === 'mobile' ? 'h-11 gap-3 px-3' : 'h-10 shrink-0 gap-2 px-3',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent'
          : 'text-sidebar-foreground/88',
      )}
      title={isDisabled ? undefined : label}
      onClick={onSelect}
    >
      <Icon aria-hidden="true" />
      {label}
    </button>
  )

  return button
}
