import type { CollectionSort, SupportedLocale } from '@tcg-collection/shared'

interface CollectionPageKeyParams {
  page: number
  pageSize: number
  sort: CollectionSort
  locale: SupportedLocale
}

export const authQueryKeys = {
  all: ['auth'] as const,
  me: () => ['auth', 'me'] as const,
}

export const pokemonQueryKeys = {
  all: ['pokemon'] as const,
  sets: (locale: SupportedLocale) => ['pokemon', 'sets', locale] as const,
  sandboxSets: (locale: SupportedLocale) => ['pokemon', 'sandbox', 'sets', locale] as const,
  sandboxCards: (setId: string | undefined, locale: SupportedLocale) =>
    ['pokemon', 'sandbox', 'cards', setId, locale] as const,
  cards: (setId: string | undefined, locale: SupportedLocale) =>
    ['pokemon', 'cards', setId, locale] as const,
  packStatus: () => ['pokemon', 'packs', 'status'] as const,
  collection: {
    all: ['pokemon', 'collection'] as const,
    page: (params: CollectionPageKeyParams) => ['pokemon', 'collection', params] as const,
    allCards: (locale: SupportedLocale, sort: CollectionSort) =>
      ['pokemon', 'collection', 'all', locale, sort] as const,
    packCount: (locale: SupportedLocale) =>
      ['pokemon', 'collection', 'pack-count', locale] as const,
  },
}
