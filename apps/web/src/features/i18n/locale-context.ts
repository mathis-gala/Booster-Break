import { createContext } from 'react'
import type { SupportedLocale } from '@tcg-collection/shared'

export interface LocaleContextValue {
  locale: SupportedLocale
  setLocale: (locale: SupportedLocale) => void
}

export const LocaleContext = createContext<LocaleContextValue | undefined>(undefined)
