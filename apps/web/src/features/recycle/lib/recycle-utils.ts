import type { CardFinish, RecycleCardItem, UserCollectionCard } from '@tcg-collection/shared'
import { getRarityRank, RECYCLE_COST, UNKNOWN_RARITY_RANK } from '@tcg-collection/shared'

export const TCG_MAX_COPIES = 4

export type RecycleSelection = Record<string, number>

export interface RecycleRarityGroup {
  rarityRank: number
  rarity: string
  cards: UserCollectionCard[]
}

export const recycleKey = (card: { id: string; finish?: CardFinish }): string =>
  `${card.id}:${card.finish ?? 'normal'}`

const cardFinish = (card: UserCollectionCard): CardFinish => card.finish ?? 'normal'

export const recyclableQuantity = (card: UserCollectionCard): number =>
  Math.max(0, card.quantity - (card.reservedQuantity ?? 0))

export const groupCardsByRarity = (cards: UserCollectionCard[]): RecycleRarityGroup[] => {
  const groups = new Map<number, RecycleRarityGroup>()

  for (const card of cards) {
    const rarityRank = getRarityRank(card.rarity)

    if (rarityRank >= UNKNOWN_RARITY_RANK) {
      continue
    }

    const group = groups.get(rarityRank) ?? {
      rarityRank,
      rarity: card.rarity ?? '',
      cards: [],
    }
    group.cards.push(card)
    groups.set(rarityRank, group)
  }

  return [...groups.values()].sort((first, second) => first.rarityRank - second.rarityRank)
}

export const getSelectedQuantity = (
  selection: RecycleSelection,
  card: UserCollectionCard,
): number => selection[recycleKey(card)] ?? 0

export interface RecyclePageSegment {
  group: RecycleRarityGroup
  cards: UserCollectionCard[]
}

export const paginateRarityGroups = (
  groups: RecycleRarityGroup[],
  page: number,
  pageSize: number,
): { segments: RecyclePageSegment[]; pageCount: number; currentPage: number } => {
  const flat = groups.flatMap((group) => group.cards.map((card) => ({ card, group })))
  const pageCount = Math.max(1, Math.ceil(flat.length / pageSize))
  const currentPage = Math.min(Math.max(page, 1), pageCount)
  const pageItems = flat.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const segments: RecyclePageSegment[] = []

  for (const { card, group } of pageItems) {
    const last = segments[segments.length - 1]

    if (last && last.group.rarityRank === group.rarityRank) {
      last.cards.push(card)
    } else {
      segments.push({ group, cards: [card] })
    }
  }

  return { segments, pageCount, currentPage }
}

export const selectedInGroup = (selection: RecycleSelection, group: RecycleRarityGroup): number =>
  group.cards.reduce((total, card) => total + getSelectedQuantity(selection, card), 0)

export const groupRewardCount = (selection: RecycleSelection, group: RecycleRarityGroup): number =>
  Math.floor(selectedInGroup(selection, group) / RECYCLE_COST)

export const totalRewardCount = (
  selection: RecycleSelection,
  groups: RecycleRarityGroup[],
): number => groups.reduce((total, group) => total + groupRewardCount(selection, group), 0)

export const totalSelectedCount = (selection: RecycleSelection): number =>
  Object.values(selection).reduce((total, quantity) => total + quantity, 0)

export const buildAutoSelection = (cards: UserCollectionCard[]): RecycleSelection => {
  const selection: RecycleSelection = {}

  for (const card of cards) {
    if (getRarityRank(card.rarity) >= UNKNOWN_RARITY_RANK) {
      continue
    }

    const surplus = Math.min(card.quantity - TCG_MAX_COPIES, recyclableQuantity(card))

    if (surplus > 0) {
      selection[recycleKey(card)] = surplus
    }
  }

  return selection
}

export const recyclableSurplusCount = (cards: UserCollectionCard[]): number => {
  return totalSelectedCount(buildAutoSelection(cards))
}

export interface RecyclePreviewCard {
  id: string
  imageSmall?: string
  finish?: CardFinish
}

export const buildRecycleBatches = (
  selection: RecycleSelection,
  cards: UserCollectionCard[],
): RecyclePreviewCard[][] => {
  const byKey = new Map(cards.map((card) => [recycleKey(card), card]))
  const copiesByRarity = new Map<number, RecyclePreviewCard[]>()

  for (const [key, quantity] of Object.entries(selection)) {
    const card = byKey.get(key)

    if (!card || quantity <= 0) {
      continue
    }

    const rarityRank = getRarityRank(card.rarity)

    if (rarityRank >= UNKNOWN_RARITY_RANK) {
      continue
    }

    const copies = copiesByRarity.get(rarityRank) ?? []

    for (let copy = 0; copy < quantity; copy += 1) {
      copies.push({ id: card.id, imageSmall: card.imageSmall, finish: card.finish })
    }

    copiesByRarity.set(rarityRank, copies)
  }

  const batches: RecyclePreviewCard[][] = []
  const ascendingRanks = [...copiesByRarity.keys()].sort((first, second) => first - second)

  for (const rank of ascendingRanks) {
    const copies = copiesByRarity.get(rank) ?? []
    const fullBatches = Math.floor(copies.length / RECYCLE_COST)

    for (let batch = 0; batch < fullBatches; batch += 1) {
      batches.push(copies.slice(batch * RECYCLE_COST, batch * RECYCLE_COST + RECYCLE_COST))
    }
  }

  return batches
}

export const selectionToItems = (
  selection: RecycleSelection,
  cards: UserCollectionCard[],
): RecycleCardItem[] => {
  const byKey = new Map(cards.map((card) => [recycleKey(card), card]))

  return Object.entries(selection)
    .filter(([, quantity]) => quantity > 0)
    .flatMap(([key, quantity]) => {
      const card = byKey.get(key)

      if (!card) {
        return []
      }

      return [{ cardId: card.id, finish: cardFinish(card), quantity }]
    })
}
