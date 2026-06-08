import type {
  CardFinish,
  PackChanceRule,
  PackSlot,
  PokemonCardSummary,
} from '@tcg-collection/shared'
import { PACK_CARD_COUNT, PACK_SLOTS, REVERSE_FOIL_RARITIES } from '@tcg-collection/shared'

export const drawPokemonPackCards = (allCards: PokemonCardSummary[]): PokemonCardSummary[] => {
  const selectedCards = new Set<string>()

  const cards = PACK_SLOTS.flatMap((slot) => drawSlot(allCards, slot, selectedCards))

  if (cards.length < PACK_CARD_COUNT) {
    cards.push(...drawManyUnique(allCards, PACK_CARD_COUNT - cards.length, selectedCards))
  }

  return cards
}

const drawSlot = (
  allCards: PokemonCardSummary[],
  slot: PackSlot,
  selectedCards: Set<string>,
): PokemonCardSummary[] => {
  const ruleHit = drawChanceRule(allCards, slot.rules, selectedCards)

  if (ruleHit) {
    return [ruleHit]
  }

  const fallbackPool =
    slot.fallback.kind === 'reverse-foil'
      ? getReverseFoilCandidates(allCards)
      : getCardsByRarity(allCards, slot.fallback.rarities)

  return drawManyUnique(fallbackPool, slot.count, selectedCards, slot.fallback.finish)
}

const drawChanceRule = (
  allCards: PokemonCardSummary[],
  rules: PackChanceRule[],
  selectedCards: Set<string>,
): PokemonCardSummary | undefined => {
  const roll = Math.random() * 100
  let chanceCursor = 0

  for (const rule of rules) {
    chanceCursor += rule.chance

    if (roll > chanceCursor) {
      continue
    }

    const card = drawUniqueCard(getCardsByRarity(allCards, rule.rarities), selectedCards)

    if (card) {
      return withFinish(card, rule.finish)
    }
  }

  return undefined
}

const getReverseFoilCandidates = (cards: PokemonCardSummary[]): PokemonCardSummary[] => {
  const reverseCandidates = getCardsByRarity(cards, REVERSE_FOIL_RARITIES).filter((card) =>
    card.finishes?.includes('reverse_holo'),
  )

  return reverseCandidates.length > 0
    ? reverseCandidates
    : getCardsByRarity(cards, REVERSE_FOIL_RARITIES)
}

const getCardsByRarity = (
  cards: PokemonCardSummary[],
  rarities: string[],
): PokemonCardSummary[] => {
  return cards.filter((card) => rarities.includes(card.rarity ?? ''))
}

const drawManyUnique = (
  items: PokemonCardSummary[],
  count: number,
  selectedCards: Set<string>,
  finish?: CardFinish,
): PokemonCardSummary[] => {
  const results: PokemonCardSummary[] = []

  for (let index = 0; index < count; index += 1) {
    const card = drawUniqueCard(items, selectedCards)

    if (!card) {
      break
    }

    results.push(withFinish(card, finish ?? getDefaultFinish(card)))
  }

  return results
}

const drawUniqueCard = (
  items: PokemonCardSummary[],
  selectedCards: Set<string>,
): PokemonCardSummary | undefined => {
  const remainingItems = items.filter((item) => !selectedCards.has(item.id))

  if (remainingItems.length === 0) {
    return undefined
  }

  const item = remainingItems[Math.floor(Math.random() * remainingItems.length)]
  selectedCards.add(item.id)

  return item
}

const withFinish = (card: PokemonCardSummary, finish: CardFinish): PokemonCardSummary => ({
  ...card,
  finish,
})

const getDefaultFinish = (card: PokemonCardSummary): CardFinish => {
  const finishes = card.finishes ?? ['normal']

  if (finishes.includes('normal')) {
    return 'normal'
  }

  return finishes[0] ?? 'normal'
}
