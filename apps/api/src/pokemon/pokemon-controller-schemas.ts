import { z } from 'zod'

export const localeSchema = z.enum(['fr', 'en'])

export const collectionSortSchema = z.enum(['recent', 'quantity', 'name', 'rarity'])

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
  locale: localeSchema.optional(),
})

export const openPackBodySchema = z.object({
  setId: z.string().optional(),
  locale: localeSchema.optional(),
})
