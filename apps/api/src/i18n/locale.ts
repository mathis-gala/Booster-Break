import { DEFAULT_LOCALE, supportedLocales, type SupportedLocale } from '@tcg-collection/shared'
import { Elysia } from 'elysia'

export const localePlugin = new Elysia({ name: 'locale' })
  .resolve(({ headers }) => ({
    locale: isSupportedLocale(headers['x-locale']) ? headers['x-locale'] : DEFAULT_LOCALE,
  }))
  .as('global')

export const resolveLocaleOverride = (
  preferredLocale: SupportedLocale | undefined,
  locale: SupportedLocale,
): SupportedLocale => preferredLocale ?? locale

const isSupportedLocale = (locale: string | undefined): locale is SupportedLocale => {
  return supportedLocales.includes(locale as SupportedLocale)
}
