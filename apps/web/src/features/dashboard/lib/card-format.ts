import type { CardFinish, PokemonCardSummary } from '@tcg-collection/shared'

export const formatCardFinish = (value: string | null | undefined): string => {
  switch (value) {
    case 'normal':
      return 'Normal'
    case 'holo':
      return 'Holo'
    case 'reverse_holo':
      return 'Reverse Holo'
    default:
      return value
        ? value
            .split('_')
            .map((part) => part[0]?.toUpperCase() + part.slice(1))
            .join(' ')
        : ''
  }
}

export const resolveCardPreviewFinish = (
  card: Pick<PokemonCardSummary, 'finish' | 'finishes' | 'rarity'>,
): CardFinish | undefined => {
  if (card.finish) {
    return card.finish
  }

  if (card.rarity?.trim().toLowerCase() === 'rare' && card.finishes?.includes('holo')) {
    return 'holo'
  }

  for (const finish of ['normal', 'holo', 'reverse_holo'] as const) {
    if (card.finishes?.includes(finish)) {
      return finish
    }
  }

  return undefined
}
