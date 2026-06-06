import type { SupportedLocale } from '@tcg-collection/shared'
import { DEFAULT_LOCALE } from '@tcg-collection/shared'
import { Elysia } from 'elysia'
import { AuthService } from '../auth/auth-service'
import { createAuthRequiredPlugin } from '../auth/auth-required-plugin'
import type { AuthStore } from '../auth/session-store'
import type { ApiConfig } from '../config'
import { PokemonRepository } from './pokemon-repository'
import { PokemonSandboxService } from './pokemon-sandbox-service'
import { isPokemonServiceError, PokemonService } from './pokemon-service'
import { ScrydexSealedClient } from './scrydex-sealed-client'
import { TcgDexClient } from './tcgdex-client'
import {
  cardsQuerySchema,
  collectionQuerySchema,
  localeQuerySchema,
  openPackBodySchema,
} from './pokemon-controller-schemas'

interface PokemonControllerOptions {
  authService?: AuthService
  authStore?: AuthStore
  config: ApiConfig
  localizedPokemonClients: Record<SupportedLocale, TcgDexClient>
  pokemonClient: TcgDexClient
  pokemonRepository: PokemonRepository
  sealedClient: ScrydexSealedClient
  sandboxService?: PokemonSandboxService
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
  sandboxService,
  service,
}: PokemonControllerOptions) => {
  const resolvedAuthService =
    authService ??
    (service
      ? undefined
      : new AuthService({
          sessionCookieName: config.sessionCookieName,
          store: mustProvideAuthStore(authStore),
        }))

  const pokemonService =
    service ??
    new PokemonService({
      authService: resolvedAuthService!,
      localizedPokemonClients,
      pokemonClient,
      pokemonRepository,
      sealedClient,
    })
  const pokemonSandboxService =
    sandboxService ??
    new PokemonSandboxService({
      localizedPokemonClients,
      pokemonClient,
      sealedClient,
    })

  const publicRoutes = new Elysia()
    .get(
      '/sets',
      async ({ query }) => ({
        sets: await pokemonService.listSets(query.locale ?? DEFAULT_LOCALE),
      }),
      {
        query: localeQuerySchema,
      },
    )
    .get(
      '/cards',
      async ({ query }) => ({
        cards: await pokemonService.listCards(query.setId, query.locale ?? DEFAULT_LOCALE),
      }),
      {
        query: cardsQuerySchema,
      },
    )
    .get(
      '/packs/sandbox/sets',
      async ({ query }) => ({
        sets: await pokemonSandboxService.listSets(query.locale ?? DEFAULT_LOCALE),
      }),
      {
        query: localeQuerySchema,
      },
    )
    .get(
      '/packs/sandbox/cards',
      async ({ query }) => ({
        cards: await pokemonSandboxService.listCards(query.setId, query.locale ?? DEFAULT_LOCALE),
      }),
      {
        query: cardsQuerySchema,
      },
    )
    .get('/packs/status', async ({ headers }) => pokemonService.getPackOpenStatus(headers.cookie))
    .post(
      '/packs/sandbox/open',
      async ({ body, status }) => {
        const result = await pokemonSandboxService.openPack(body)

        if (!isPokemonServiceError(result)) {
          return result
        }

        return status(toPokemonErrorStatus(result.error), result)
      },
      {
        body: openPackBodySchema,
      },
    )

  const authenticatedRoutes = new Elysia()

  if (resolvedAuthService) {
    authenticatedRoutes.use(
      createAuthRequiredPlugin({
        authService: resolvedAuthService,
        unauthenticatedMessage: 'Sign in to access Pokémon collection features.',
      }),
    )
  }

  authenticatedRoutes
    .get(
      '/collection',
      async ({ headers, query, status }) => {
        const result = await pokemonService.listUserCollection(headers.cookie, {
          page: query.page ?? 1,
          pageSize: query.pageSize ?? 24,
          sort: query.sort ?? 'recent',
          source: query.source ?? 'all',
          locale: query.locale ?? DEFAULT_LOCALE,
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
    .get('/collection/owned-ids', async ({ headers, status }) => {
      const result = await pokemonService.listOwnedCardIds(headers.cookie)

      if (!isPokemonServiceError(result)) {
        return result
      }

      return status(toPokemonErrorStatus(result.error), result)
    })
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

  return new Elysia({ prefix: '/pokemon' }).use(publicRoutes).use(authenticatedRoutes)
}

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
