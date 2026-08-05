import { describe, expect, test } from 'bun:test'
import type { SupportedLocale } from '@tcg-collection/shared'
import type { AuthService } from '../../src/auth/auth-service'
import type { PokemonRepository } from '../../src/pokemon/pokemon-repository'
import { PokemonService } from '../../src/pokemon/pokemon-service'
import type { ScrydexSealedClient } from '../../src/pokemon/scrydex-sealed-client'
import type { TcgDexClient } from '../../src/pokemon/tcgdex-client'

describe('PokemonService booster availability', () => {
  test('rejects a direct Pitch Black opening before loading the set or cooldown', async () => {
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

    expect(result).toEqual({
      error: 'pack_unavailable',
      message: 'This booster set is not available for opening yet.',
    })
    expect(getSetCalled).toBe(false)
  })
})
