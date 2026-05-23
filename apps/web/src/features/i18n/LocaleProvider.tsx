import { useMemo, useState, type ReactNode } from 'react'
import type { SupportedLocale } from '@tcg-collection/shared'

import { getLocale, setLocale as setParaglideLocale } from '@/paraglide/runtime'

import { LocaleContext, type LocaleContextValue } from './locale-context'

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => {
    const initialLocale = getLocale() as SupportedLocale
    updateDocumentLanguage(initialLocale)

    return initialLocale
  })

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale: (nextLocale) => {
        setParaglideLocale(nextLocale, { reload: false })
        updateDocumentLanguage(nextLocale)
        setLocaleState(nextLocale)
      },
    }),
    [locale],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

const updateDocumentLanguage = (locale: SupportedLocale) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
  }
}
