import type { PokemonCardSummary } from '@tcg-collection/shared'
import { getSetPackRarityChance, pokemonRarityOrder } from '@tcg-collection/shared'
import { m } from '@/paraglide/messages'

const rarityOrder: readonly string[] = pokemonRarityOrder

export const groupCardsByRarity = (
  cards: PokemonCardSummary[],
  setId?: string,
): Array<[string, PokemonCardSummary[]]> => {
  const groups = new Map<string, PokemonCardSummary[]>()

  for (const card of cards) {
    const rarity = getNormalizedPreviewRarity(card, setId)
    groups.set(rarity, [...(groups.get(rarity) ?? []), card])
  }

  return Array.from(groups.entries())
    .sort(([firstRarity], [secondRarity]) => {
      const firstIndex = rarityOrder.indexOf(firstRarity)
      const secondIndex = rarityOrder.indexOf(secondRarity)

      if (firstIndex === -1 && secondIndex === -1) {
        return firstRarity.localeCompare(secondRarity)
      }

      if (firstIndex === -1) {
        return 1
      }

      if (secondIndex === -1) {
        return -1
      }

      return firstIndex - secondIndex
    })
    .map(([rarity, rarityCards]): [string, PokemonCardSummary[]] => [
      rarity,
      rarityCards.sort(compareCardsByNumber),
    ])
}

const getNormalizedPreviewRarity = (card: PokemonCardSummary, setId?: string): string => {
  if (setId === 'swsh12.5' && /^GG\d+$/i.test(card.number)) {
    const galleryNumber = Number(card.number.slice(2))

    if (galleryNumber <= 34) {
      return 'Galarian Gallery'
    }

    if (galleryNumber <= 66) {
      return 'Galarian Gallery Ultra Rare'
    }

    return 'Galarian Gallery Secret Rare'
  }

  switch (card.rarity) {
    case 'Common':
    case 'Commune':
      return 'Common'
    case 'Uncommon':
    case 'Peu Commune':
      return 'Uncommon'
    case 'Double rare':
      return 'Double Rare'
    case 'Illustration rare':
      return 'Illustration Rare'
    case 'Special illustration rare':
      return 'Special Illustration Rare'
    case 'Hyper rare':
      return 'Hyper Rare'
    case 'Radieux Rare':
      return 'Radiant Rare'
    case 'Dresseur Full Art':
      return setId === 'swsh12.5' ? 'Ultra Rare' : 'Full Art Trainer'
    case 'Full Art Trainer':
      return setId === 'swsh12.5' ? 'Ultra Rare' : card.rarity
    case 'Magnifique rare':
      return 'Secret Rare'
    case 'None':
    case undefined:
      return 'Other'
    default:
      return card.rarity
  }
}

export const getRarityChanceLabel = (
  rarity: string,
  cards: PokemonCardSummary[],
  setId?: string,
): string => {
  if (rarity === 'Common') {
    return m.packs_slots_per_pack({ count: setId?.startsWith('swsh') ? 5 : 4 })
  }

  if (rarity === 'Uncommon') {
    return m.packs_slots_per_pack({ count: 3 })
  }

  const packChance = getSetPackRarityChance(setId, rarity, cards)

  return m.packs_rate_per_pack({ rate: `${formatChance(packChance)}%` })
}

const formatChance = (chance: number): string => {
  if (chance === 0) {
    return '0'
  }

  if (chance < 0.01) {
    return '<0.01'
  }

  return chance.toFixed(2).replace(/\.?0+$/, '')
}

const compareCardsByNumber = (first: PokemonCardSummary, second: PokemonCardSummary): number => {
  const firstNumber = Number(first.number.replace(/^\D+/, ''))
  const secondNumber = Number(second.number.replace(/^\D+/, ''))

  if (Number.isFinite(firstNumber) && Number.isFinite(secondNumber)) {
    return firstNumber - secondNumber
  }

  return first.number.localeCompare(second.number)
}
