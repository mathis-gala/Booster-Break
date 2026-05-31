import type { CollectionSort, CollectionSource, SupportedLocale } from '@tcg-collection/shared'

interface CollectionPageKeyParams {
  page: number
  pageSize: number
  sort: CollectionSort
  source?: CollectionSource
  locale: SupportedLocale
}

export const authQueryKeys = {
  all: ['auth'] as const,
  me: () => ['auth', 'me'] as const,
}

export const pokemonQueryKeys = {
  all: ['pokemon'] as const,
  sets: (locale: SupportedLocale) => ['pokemon', 'sets', locale] as const,
  cards: (setId: string | undefined, locale: SupportedLocale) =>
    ['pokemon', 'cards', setId, locale] as const,
  packStatus: () => ['pokemon', 'packs', 'status'] as const,
  collection: {
    all: ['pokemon', 'collection'] as const,
    page: (params: CollectionPageKeyParams) => ['pokemon', 'collection', params] as const,
    allCards: (locale: SupportedLocale, sort: CollectionSort, source?: CollectionSource) =>
      ['pokemon', 'collection', 'all', locale, sort, source ?? 'all'] as const,
    packCount: (locale: SupportedLocale) =>
      ['pokemon', 'collection', 'pack-count', locale] as const,
  },
}
