import { describe, expect, test } from 'bun:test'
import { Elysia } from 'elysia'
import type { AuthService } from '../../src/auth/auth-service'
import type { ApiConfig } from '../../src/config'
import type { BoosterRotationService } from '../../src/pokemon/booster-rotation-service'
import { createPokemonController } from '../../src/pokemon/pokemon-controller'
import type { PokemonService } from '../../src/pokemon/pokemon-service'

const config: ApiConfig = {
  port: 3100,
  host: '127.0.0.1',
  webOrigin: 'http://127.0.0.1:5173',
  webAppUrl: 'http://127.0.0.1:5173',
  apiOrigin: 'http://127.0.0.1:3100',
  sessionCookieName: 'tcg_session',
  sessionCookieSameSite: 'Lax',
  secureCookies: false,
  slackRedirectUri: 'http://127.0.0.1:3100/auth/slack/callback',
  magicLinkTtlDays: 30,
  devAuthEnabled: false,
  boosterRotationAvailableCount: 3,
  boosterRotationProposalCount: 3,
  boosterRotationCadenceUnit: 'day',
  boosterRotationCadenceValue: 7,
  boosterRotationTimeZone: 'Europe/Paris',
  boosterRotationAnchorLocalDate: '2026-06-29',
}

describe('booster rotation routes', () => {
  test('returns the public pack rotation', async () => {
    const boosterRotationService = {
      getRotation: async () => rotationResponse,
    } as unknown as BoosterRotationService
    const app = makeApp({ boosterRotationService })

    const response = await app.handle(new Request('http://localhost/pokemon/packs/rotation'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual(rotationResponse)
  })

  test('rejects rotation votes without a session', async () => {
    const app = makeApp({
      authService: {
        getCurrentUser: async () => undefined,
      } as unknown as AuthService,
      boosterRotationService: {
        vote: async () => rotationResponse,
      } as unknown as BoosterRotationService,
    })

    const response = await app.handle(
      new Request('http://localhost/pokemon/packs/rotation/vote', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          proposalId: 'proposal-1',
        }),
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('unauthenticated')
  })

  test('returns 409 when voting has closed', async () => {
    const app = makeApp({
      authService: {
        getCurrentUser: async () => ({
          id: 'user-1',
          pseudo: 'user-1',
        }),
      } as unknown as AuthService,
      boosterRotationService: {
        vote: async () => ({
          error: 'pack_rotation_vote_closed',
          message: 'Voting for this booster rotation has closed.',
        }),
      } as unknown as BoosterRotationService,
    })

    const response = await app.handle(
      new Request('http://localhost/pokemon/packs/rotation/vote', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          proposalId: 'proposal-1',
        }),
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toBe('pack_rotation_vote_closed')
  })
})

const makeApp = (options: {
  authService?: AuthService
  boosterRotationService: BoosterRotationService
}) =>
  new Elysia().use(
    createPokemonController({
      authService: options.authService,
      boosterRotationService: options.boosterRotationService,
      config,
      localizedPokemonClients: {},
      pokemonClient: {},
      pokemonRepository: {},
      sealedClient: {},
      service: {} as PokemonService,
    } as Parameters<typeof createPokemonController>[0]),
  )

const rotationResponse = {
  active: {
    id: 'rotation-1',
    startsAt: '2026-06-28T22:00:00.000Z',
    endsAt: '2026-07-05T22:00:00.000Z',
    sets: [
      {
        id: 'set-1',
        name: 'Set 1',
        series: 'Series',
        total: 100,
        releaseDate: '2026-06-01',
        boosterImageUrl: 'https://example.com/set-1.png',
      },
    ],
  },
  poll: {
    id: 'poll-1',
    votingStartsAt: '2026-06-28T22:00:00.000Z',
    votingEndsAt: '2026-07-05T22:00:00.000Z',
    targetStartsAt: '2026-07-05T22:00:00.000Z',
    targetEndsAt: '2026-07-12T22:00:00.000Z',
    proposals: [
      {
        id: 'proposal-1',
        sets: [],
        voteCount: 0,
      },
    ],
  },
}
