import { z } from 'zod'
import { supportedLocaleValues } from '@tcg-collection/shared'

export const localeSchema = z.enum(supportedLocaleValues)

export const collectionSortSchema = z.enum(['recent', 'quantity', 'name', 'rarity'])
export const collectionSourceSchema = z.enum(['all', 'owned'])

export const localeQuerySchema = z.object({
  locale: localeSchema.optional(),
})

export const cardsQuerySchema = z.object({
  setId: z.string().optional(),
  locale: localeSchema.optional(),
})

export const collectionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(60).optional(),
  sort: collectionSortSchema.optional(),
  source: collectionSourceSchema.optional(),
  setId: z.string().optional(),
  locale: localeSchema.optional(),
})

export const openPackBodySchema = z.object({
  setId: z.string().optional(),
  locale: localeSchema.optional(),
})

export const cardFinishSchema = z.enum(['normal', 'holo', 'reverse_holo'])

export const recycleCardsBodySchema = z.object({
  items: z
    .array(
      z.object({
        cardId: z.string().min(1),
        finish: cardFinishSchema,
        quantity: z.coerce.number().int().positive(),
      }),
    )
    .min(1),
  locale: localeSchema.optional(),
})
