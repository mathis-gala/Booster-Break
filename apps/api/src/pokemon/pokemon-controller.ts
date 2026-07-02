import type { SupportedLocale } from '@tcg-collection/shared'
import { Elysia } from 'elysia'
import { AuthService } from '../auth/auth-service'
import { createAuthRequiredPlugin } from '../auth/auth-required-plugin'
import type { AuthStore } from '../auth/session-store'
import type { AuthUser } from '../auth/types'
import type { ApiConfig } from '../config'
import { localePlugin, resolveLocaleOverride } from '../i18n/locale'
import type { BoosterRotationService } from './booster-rotation-service'
import type { BoosterRotationServiceError } from './booster-rotation-types'
import { isBoosterRotationServiceError } from './booster-rotation-types'
import type { PokemonRepository } from './pokemon-repository'
import { PokemonSandboxService } from './pokemon-sandbox-service'
import { isPokemonServiceError, PokemonService } from './pokemon-service'
import type { ScrydexSealedClient } from './scrydex-sealed-client'
import type { TcgDexClient } from './tcgdex-client'
import {
  cardsQuerySchema,
  collectionQuerySchema,
  localeQuerySchema,
  openPackBodySchema,
  votePackRotationBodySchema,
} from './pokemon-controller-schemas'

interface PokemonControllerOptions {
  authService?: AuthService
  authStore?: AuthStore
  boosterRotationService: BoosterRotationService
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
  boosterRotationService,
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
      boosterRotationService,
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
    .get(
      '/packs/rotation',
      async ({ headers, locale, query, status }) => {
        const currentUser = await resolvedAuthService?.getCurrentUser(headers.cookie)
        const result = await boosterRotationService.getRotation({
          locale: resolveLocaleOverride(query.locale, locale),
          userId: currentUser?.id,
        })

        if (!isBoosterRotationServiceError(result)) {
          return result
        }

        return status(toBoosterRotationErrorStatus(result.error), result)
      },
      {
        query: localeQuerySchema,
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
      '/packs/rotation/vote',
      async (context) => {
        const { currentUser, body, locale, status } = getAuthenticatedContext(context)
        const result = await boosterRotationService.vote({
          locale,
          proposalId: body.proposalId,
          userId: currentUser.id,
        })

        if (!isBoosterRotationServiceError(result)) {
          return result
        }

        return status(toBoosterRotationErrorStatus(result.error), result)
      },
      {
        body: votePackRotationBodySchema,
      },
    )
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

  return new Elysia({ prefix: '/pokemon' }).use(publicRoutes).use(authenticatedPokemonRoutes)
}

const toPokemonErrorStatus = (error: string): 401 | 404 | 409 => {
  switch (error) {
    case 'unauthenticated':
      return 401
    case 'pack_cooldown':
    case 'pack_not_in_rotation':
    case 'pokemon_sets_not_synced':
      return 409
    default:
      return 404
  }
}

const toBoosterRotationErrorStatus = (error: BoosterRotationServiceError['error']): 404 | 409 => {
  switch (error) {
    case 'pokemon_sets_not_synced':
    case 'pack_rotation_vote_closed':
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
