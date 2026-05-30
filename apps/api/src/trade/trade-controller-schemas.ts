import { z } from 'zod'
import {
  MAX_FILTER_LIST_LENGTH,
  MAX_OFFER_CARDS_PER_REQUEST,
  MAX_REQUIREMENT_LIST_LENGTH,
} from './trade-config'

export const cardFinishSchema = z.enum(['normal', 'holo', 'reverse_holo'])

export const auctionRequirementsSchema = z.object({
  cardIds: z.array(z.string().trim().min(1)).max(MAX_REQUIREMENT_LIST_LENGTH).optional(),
  setIds: z.array(z.string().trim().min(1)).max(MAX_REQUIREMENT_LIST_LENGTH).optional(),
  rarities: z.array(z.string().trim().min(1)).max(MAX_REQUIREMENT_LIST_LENGTH).optional(),
  types: z.array(z.string().trim().min(1)).max(MAX_REQUIREMENT_LIST_LENGTH).optional(),
  finishes: z.array(cardFinishSchema).max(MAX_REQUIREMENT_LIST_LENGTH).optional(),
})

export const auctionFiltersSchema = z.object({
  excludedCardIds: z.array(z.string().trim().min(1)).max(MAX_FILTER_LIST_LENGTH).optional(),
  excludedSetIds: z.array(z.string().trim().min(1)).max(MAX_FILTER_LIST_LENGTH).optional(),
  excludedRarities: z.array(z.string().trim().min(1)).max(MAX_FILTER_LIST_LENGTH).optional(),
  excludedTypes: z.array(z.string().trim().min(1)).max(MAX_FILTER_LIST_LENGTH).optional(),
  excludedFinishes: z.array(cardFinishSchema).max(MAX_FILTER_LIST_LENGTH).optional(),
})

export const createAuctionSchema = z.object({
  offeredCardId: z.string().trim().min(1),
  offeredCardFinish: cardFinishSchema,
  requirements: auctionRequirementsSchema.optional(),
  filters: auctionFiltersSchema.optional(),
})

export const createOfferCardSchema = z.object({
  cardId: z.string().trim().min(1),
  finish: cardFinishSchema,
  quantity: z.coerce.number().int().min(1),
})

export const createOfferSchema = z.object({
  cards: z.array(createOfferCardSchema).min(1).max(MAX_OFFER_CARDS_PER_REQUEST),
})

export const tradeIdSchema = z.object({
  auctionId: z.string().trim().min(1),
})

export const offerIdSchema = z.object({
  offerId: z.string().trim().min(1),
})

export const offerPathSchema = z.object({
  auctionId: z.string().trim().min(1),
  offerId: z.string().trim().min(1),
})
