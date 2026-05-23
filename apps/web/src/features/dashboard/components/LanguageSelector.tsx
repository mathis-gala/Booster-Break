import { useQueryClient } from '@tanstack/react-query'
import type { SupportedLocale } from '@tcg-collection/shared'
import { ChevronDownIcon } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLocale } from '@/features/i18n/useLocale'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { pokemonQueryKeys } from '../lib/query-keys'

const languages: Array<{ locale: SupportedLocale; flag: string; shortLabel: string }> = [
  { locale: 'fr', flag: '🇫🇷', shortLabel: 'FR' },
  { locale: 'en', flag: '🇬🇧', shortLabel: 'EN' },
]

export function LanguageSelector({
  className,
  contentClassName,
  positionerClassName,
  variant = 'sidebar',
  density = 'normal',
}: {
  className?: string
  contentClassName?: string
  positionerClassName?: string
  density?: 'normal' | 'compact'
  variant?: 'sidebar' | 'surface'
}) {
  const queryClient = useQueryClient()
  const { locale, setLocale } = useLocale()
  const activeLanguage = languages.find((language) => language.locale === locale) ?? languages[0]
  const isSurface = variant === 'surface'
  const isCompact = density === 'compact'

  function updateLocale(nextLocale: SupportedLocale) {
    if (nextLocale === locale) {
      return
    }

    setLocale(nextLocale)
    queryClient.invalidateQueries({ queryKey: pokemonQueryKeys.all })
  }

  return (
    <div
      className={cn(
        'rounded-lg border p-2',
        isCompact && 'p-1.5',
        isSurface ? 'border-border bg-background' : 'border-sidebar-accent/24 bg-sidebar-accent/10',
        className,
      )}
    >
      <p
        className={cn(
          'mb-2 text-[0.68rem] font-black uppercase tracking-normal',
          isCompact && 'sr-only',
          isSurface ? 'text-muted-foreground' : 'text-sidebar-foreground/60',
        )}
      >
        {m.language_label()}
      </p>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          aria-label={m.language_label()}
          className={cn(
            'flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-md border px-3 text-sm font-black transition-colors focus-visible:outline-none focus-visible:ring-2',
            isCompact && 'h-9 px-2.5',
            isSurface
              ? 'border-border bg-card text-card-foreground hover:bg-muted focus-visible:ring-ring'
              : 'border-sidebar-accent/28 bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90 focus-visible:ring-sidebar-ring',
          )}
        >
          <span className="flex items-center gap-2">
            <span aria-hidden="true">{activeLanguage.flag}</span>
            <span>{activeLanguage.shortLabel}</span>
          </span>
          <ChevronDownIcon aria-hidden="true" />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className={cn('w-32', contentClassName)}
          positionerClassName={positionerClassName}
        >
          <DropdownMenuRadioGroup
            value={locale}
            onValueChange={(nextLocale) => updateLocale(nextLocale as SupportedLocale)}
          >
            {languages.map((language) => {
              const label = language.locale === 'fr' ? m.language_fr() : m.language_en()

              return (
                <DropdownMenuRadioItem
                  key={language.locale}
                  value={language.locale}
                  closeOnClick
                  label={label}
                  className="h-10 cursor-pointer px-2.5 font-bold"
                >
                  <span aria-hidden="true">{language.flag}</span>
                  <span>{language.shortLabel}</span>
                </DropdownMenuRadioItem>
              )
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
