import type { PokemonCardSummary } from '@tcg-collection/shared'

const normalizeSearchText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

export const matchesCardNameSearch = (card: PokemonCardSummary, query: string): boolean => {
  const normalizedQuery = normalizeSearchText(query)

  if (normalizedQuery.length === 0) {
    return true
  }

  return normalizeSearchText(card.name).includes(normalizedQuery)
}
