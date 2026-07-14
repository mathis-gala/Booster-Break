import { z } from 'zod'
import { supportedLocaleValues } from '@tcg-collection/shared'
import {
  MAX_FILTER_LIST_LENGTH,
  MAX_OFFER_CARD_QUANTITY,
  MAX_OFFER_CARDS_PER_REQUEST,
  MAX_REQUIREMENT_LIST_LENGTH,
} from './trade-config'

export const cardFinishSchema = z.enum(['normal', 'holo', 'reverse_holo'])
const tradeIdentifierSchema = z.string().trim().min(1).max(128)
const tradeTextValueSchema = z.string().trim().min(1).max(128)

export const tradeLocaleQuerySchema = z.object({
  locale: z.enum(supportedLocaleValues).optional(),
})

export const auctionRequirementsSchema = z.object({
  cardIds: z.array(tradeIdentifierSchema).max(MAX_REQUIREMENT_LIST_LENGTH).optional(),
  setIds: z.array(tradeIdentifierSchema).max(MAX_REQUIREMENT_LIST_LENGTH).optional(),
  rarities: z.array(tradeTextValueSchema).max(MAX_REQUIREMENT_LIST_LENGTH).optional(),
  types: z.array(tradeTextValueSchema).max(MAX_REQUIREMENT_LIST_LENGTH).optional(),
  finishes: z.array(cardFinishSchema).max(MAX_REQUIREMENT_LIST_LENGTH).optional(),
})

export const auctionFiltersSchema = z.object({
  excludedCardIds: z.array(tradeIdentifierSchema).max(MAX_FILTER_LIST_LENGTH).optional(),
  excludedSetIds: z.array(tradeIdentifierSchema).max(MAX_FILTER_LIST_LENGTH).optional(),
  excludedRarities: z.array(tradeTextValueSchema).max(MAX_FILTER_LIST_LENGTH).optional(),
  excludedTypes: z.array(tradeTextValueSchema).max(MAX_FILTER_LIST_LENGTH).optional(),
  excludedFinishes: z.array(cardFinishSchema).max(MAX_FILTER_LIST_LENGTH).optional(),
})

export const createAuctionSchema = z.object({
  offeredCardId: tradeIdentifierSchema,
  offeredCardFinish: cardFinishSchema,
  requirements: auctionRequirementsSchema.optional(),
  filters: auctionFiltersSchema.optional(),
})

export const createOfferCardSchema = z.object({
  cardId: tradeIdentifierSchema,
  finish: cardFinishSchema,
  quantity: z.coerce.number().int().min(1).max(MAX_OFFER_CARD_QUANTITY),
})

export const createOfferSchema = z.object({
  cards: z.array(createOfferCardSchema).min(1).max(MAX_OFFER_CARDS_PER_REQUEST),
})

export const tradeIdSchema = z.object({
  auctionId: tradeIdentifierSchema,
})

export const offerIdSchema = z.object({
  offerId: tradeIdentifierSchema,
})

export const offerPathSchema = z.object({
  auctionId: tradeIdentifierSchema,
  offerId: tradeIdentifierSchema,
})

export const notificationIdSchema = z.object({
  notificationId: tradeIdentifierSchema,
})
