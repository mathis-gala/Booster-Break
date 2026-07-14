import type { CreateOfferRequest } from '@tcg-collection/shared'
import type { TradeOfferCardWrite } from './trade-types'

export const normalizeOfferCards = (cards: CreateOfferRequest['cards']): TradeOfferCardWrite[] => {
  const merged = new Map<string, TradeOfferCardWrite>()

  for (const card of cards) {
    const key = `${card.cardId}:${card.finish}`
    const existing = merged.get(key)

    if (existing) {
      existing.quantity += card.quantity
      continue
    }

    merged.set(key, {
      cardId: card.cardId,
      finish: card.finish,
      quantity: card.quantity,
    })
  }

  return Array.from(merged.values()).filter((card) => card.quantity > 0)
}

export const getOfferSignature = (
  cards: Array<{ cardId: string; finish: string; quantity: number }>,
): string =>
  cards
    .map((card) => `${card.cardId}:${card.finish}:${card.quantity}`)
    .sort((first, second) => first.localeCompare(second))
    .join('|')
