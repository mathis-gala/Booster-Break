import { describe, expect, test } from 'bun:test'
import { ScrydexSealedClient } from '../../src/pokemon/scrydex-sealed-client'

describe('ScrydexSealedClient known booster images', () => {
  test('resolves the Crown Zenith pack instead of falling back to the set logo', async () => {
    const client = new ScrydexSealedClient()

    await expect(client.getBoosterImageUrl({ id: 'swsh12.5' })).resolves.toBe(
      'https://images.scrydex.com/pokemon/swsh12pt5-s1/large',
    )
  })
})
