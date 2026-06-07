import type { SupportedLocale } from '@tcg-collection/shared'
import { Elysia } from 'elysia'
import { AuthService } from '../auth/auth-service'
import { createAuthRequiredPlugin } from '../auth/auth-required-plugin'
import type { AuthStore } from '../auth/session-store'
import type { AuthUser } from '../auth/types'
import type { ApiConfig } from '../config'
import { localePlugin, resolveLocaleOverride } from '../i18n/locale'
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
  recycleCardsBodySchema,
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
    .use(localePlugin)
    .get(
      '/sets',
      async ({ locale, query }) => ({
        sets: await pokemonService.listSets(resolveLocaleOverride(query.locale, locale)),
      }),
      {
        query: localeQuerySchema,
      },
    )
    .get(
      '/cards',
      async ({ locale, query }) => ({
        cards: await pokemonService.listCards(
          query.setId,
          resolveLocaleOverride(query.locale, locale),
        ),
      }),
      {
        query: cardsQuerySchema,
      },
    )
    .get(
      '/packs/sandbox/sets',
      async ({ locale, query }) => ({
        sets: await pokemonSandboxService.listSets(resolveLocaleOverride(query.locale, locale)),
      }),
      {
        query: localeQuerySchema,
      },
    )
    .get(
      '/packs/sandbox/cards',
      async ({ locale, query }) => ({
        cards: await pokemonSandboxService.listCards(
          query.setId,
          resolveLocaleOverride(query.locale, locale),
        ),
      }),
      {
        query: cardsQuerySchema,
      },
    )
    .get('/packs/status', async ({ headers }) => pokemonService.getPackOpenStatus(headers.cookie))
    .post(
      '/packs/sandbox/open',
      async ({ body, locale, status }) => {
        const result = await pokemonSandboxService.openPack({
          ...body,
          locale: resolveLocaleOverride(body.locale, locale),
        })

        if (!isPokemonServiceError(result)) {
          return result
        }

        return status(toPokemonErrorStatus(result.error), result)
      },
      {
        body: openPackBodySchema,
      },
    )

  const authenticatedRoutes = new Elysia().use(localePlugin)

  if (resolvedAuthService) {
    authenticatedRoutes.use(
      createAuthRequiredPlugin({
        authService: resolvedAuthService,
        unauthenticatedMessage: 'Sign in to access Pokémon collection features.',
      }),
    )
  }

  const authenticatedPokemonRoutes = authenticatedRoutes
    .get(
      '/collection',
      async (context) => {
        const { currentUser, query, status } = getAuthenticatedContext(context)
        const result = await pokemonService.listUserCollection(currentUser, {
          page: query.page ?? 1,
          pageSize: query.pageSize ?? 24,
          sort: query.sort ?? 'recent',
          source: query.source ?? 'all',
          setId: query.setId,
          locale: resolveLocaleOverride(query.locale, context.locale),
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
    .get('/collection/owned-ids', async (context) => {
      const { currentUser, status } = getAuthenticatedContext(context)
      const result = await pokemonService.listOwnedCardIds(currentUser)

      if (!isPokemonServiceError(result)) {
        return result
      }

      return status(toPokemonErrorStatus(result.error), result)
    })
    .post(
      '/packs/open',
      async (context) => {
        const { currentUser, body, locale, status } = getAuthenticatedContext(context)
        const result = await pokemonService.openPack(currentUser, {
          ...body,
          locale: resolveLocaleOverride(body.locale, locale),
        })

        if (!isPokemonServiceError(result)) {
          return result
        }

        return status(toPokemonErrorStatus(result.error), result)
      },
      {
        body: openPackBodySchema,
      },
    )
    .post(
      '/cards/recycle',
      async (context) => {
        const { currentUser, body, locale, status } = getAuthenticatedContext(context)
        const result = await pokemonService.recycleCards(currentUser, {
          ...body,
          locale: resolveLocaleOverride(body.locale, locale),
        })

        if (!isPokemonServiceError(result)) {
          return result
        }

        return status(toPokemonErrorStatus(result.error), result)
      },
      {
        body: recycleCardsBodySchema,
      },
    )

  return new Elysia({ prefix: '/pokemon' }).use(publicRoutes).use(authenticatedPokemonRoutes)
}

const toPokemonErrorStatus = (error: string): 400 | 401 | 404 | 409 => {
  switch (error) {
    case 'unauthenticated':
      return 401
    case 'recycle_invalid':
      return 400
    case 'pack_cooldown':
    case 'pokemon_sets_not_synced':
    case 'recycle_nothing':
    case 'recycle_conflict':
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

const getAuthenticatedContext = <TContext>(
  context: TContext,
): TContext & { currentUser: AuthUser; locale: SupportedLocale } =>
  context as TContext & { currentUser: AuthUser; locale: SupportedLocale }
