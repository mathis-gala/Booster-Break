import { afterEach, describe, expect, setSystemTime, test } from 'bun:test'
import type { SupportedLocale } from '@tcg-collection/shared'
import type { AuthService } from '../../src/auth/auth-service'
import { SCHEDULED_BOOSTER_RELEASES } from '../../src/pokemon/pokemon-config'
import type { PokemonRepository } from '../../src/pokemon/pokemon-repository'
import { PokemonService } from '../../src/pokemon/pokemon-service'
import type { ScrydexSealedClient } from '../../src/pokemon/scrydex-sealed-client'
import type { TcgDexClient } from '../../src/pokemon/tcgdex-client'

const releaseAt = Date.parse(SCHEDULED_BOOSTER_RELEASES.me05)

const openPitchBlackAt = async (now: number) => {
  setSystemTime(new Date(now))
  let getSetCalled = false
  const pokemonRepository = {
    getSet: async () => {
      getSetCalled = true
      return undefined
    },
  } as unknown as PokemonRepository
  const pokemonClient = {} as TcgDexClient
  const service = new PokemonService({
    authService: {} as AuthService,
    localizedPokemonClients: {
      en: pokemonClient,
      fr: pokemonClient,
    } satisfies Record<SupportedLocale, TcgDexClient>,
    pokemonClient,
    pokemonRepository,
    sealedClient: {} as ScrydexSealedClient,
  })

  const result = await service.openPack(
    { id: 'user-1', pseudo: 'Player' },
    { setId: 'me05', locale: 'en' },
  )

  return { result, getSetCalled }
}

describe('PokemonService booster availability', () => {
  afterEach(() => {
    setSystemTime()
  })

  test('rejects a direct opening of an unreleased booster before loading the set or cooldown', async () => {
    const { result, getSetCalled } = await openPitchBlackAt(releaseAt - 1)

    expect(result).toEqual({
      error: 'pack_unavailable',
      message: 'This booster set is not available for opening yet.',
    })
    expect(getSetCalled).toBe(false)
  })

  test('lets the opening through to the set lookup once the booster has released', async () => {
    const { getSetCalled } = await openPitchBlackAt(releaseAt)

    expect(getSetCalled).toBe(true)
  })
})
