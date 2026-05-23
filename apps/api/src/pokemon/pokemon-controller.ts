import type { SupportedLocale } from '@tcg-collection/shared'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { AuthService } from '../auth/auth-service'
import type { AuthStore } from '../auth/session-store'
import type { ApiConfig } from '../config'
import { PokemonRepository } from './pokemon-repository'
import { isPokemonServiceError, PokemonService } from './pokemon-service'
import { ScrydexSealedClient } from './scrydex-sealed-client'
import { TcgDexClient } from './tcgdex-client'

interface PokemonControllerOptions {
  authService?: AuthService
  authStore?: AuthStore
  config: ApiConfig
  localizedPokemonClients: Record<SupportedLocale, TcgDexClient>
  pokemonClient: TcgDexClient
  pokemonRepository: PokemonRepository
  sealedClient: ScrydexSealedClient
  service?: PokemonService
}

export const createPokemonController = ({
  authService,
  authStore,
  config,
  localizedPokemonClients,
  pokemonClient,
  pokemonRepository,
  sealedClient,
  service,
}: PokemonControllerOptions) => {
  const pokemonService =
    service ??
    new PokemonService({
      authService:
        authService ??
        new AuthService({
          sessionCookieName: config.sessionCookieName,
          store: mustProvideAuthStore(authStore),
        }),
      localizedPokemonClients,
      pokemonClient,
      pokemonRepository,
      sealedClient,
    })

  return new Elysia({ prefix: '/pokemon' })
    .get(
      '/sets',
      async ({ query }) => ({
        sets: await pokemonService.listSets(query.locale ?? 'fr'),
      }),
      {
        query: localeQuerySchema,
      },
    )
    .get(
      '/cards',
      async ({ query }) => ({
        cards: await pokemonService.listCards(query.setId, query.locale ?? 'fr'),
      }),
      {
        query: cardsQuerySchema,
      },
    )
    .get(
      '/collection',
      async ({ headers, query, status }) => {
        const result = await pokemonService.listUserCollection(headers.cookie, {
          page: query.page ?? 1,
          pageSize: query.pageSize ?? 24,
          sort: query.sort ?? 'recent',
          locale: query.locale ?? 'fr',
        })

        if (!isPokemonServiceError(result)) {
          return result
        }

        return status(toPokemonErrorStatus(result.error), result)
      },
      {
        query: collectionQuerySchema,
      },
    )
    .get('/packs/status', async ({ headers }) => pokemonService.getPackOpenStatus(headers.cookie))
    .post(
      '/packs/open',
      async ({ headers, body, status }) => {
        const result = await pokemonService.openPack(headers.cookie, body)

        if (!isPokemonServiceError(result)) {
          return result
        }

        return status(toPokemonErrorStatus(result.error), result)
      },
      {
        body: openPackBodySchema,
      },
    )
}

const localeSchema = z.enum(['fr', 'en'])
const collectionSortSchema = z.enum(['recent', 'quantity', 'name', 'rarity'])

const localeQuerySchema = z.object({
  locale: localeSchema.optional(),
})

const cardsQuerySchema = z.object({
  setId: z.string().optional(),
  locale: localeSchema.optional(),
})

const collectionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(60).optional(),
  sort: collectionSortSchema.optional(),
  locale: localeSchema.optional(),
})

const openPackBodySchema = z.object({
  setId: z.string().optional(),
  locale: localeSchema.optional(),
})

const toPokemonErrorStatus = (error: string): 401 | 404 | 409 => {
  switch (error) {
    case 'unauthenticated':
      return 401
    case 'pack_cooldown':
    case 'pokemon_sets_not_synced':
      return 409
    default:
      return 404
  }
}

const mustProvideAuthStore = (store: AuthStore | undefined): AuthStore => {
  if (!store) {
    throw new Error('createPokemonController requires authService, service, or authStore')
  }

  return store
}
