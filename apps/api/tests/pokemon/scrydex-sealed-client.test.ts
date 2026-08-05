import { describe, expect, test } from 'bun:test'
import { ScrydexSealedClient } from '../../src/pokemon/scrydex-sealed-client'

describe('ScrydexSealedClient known booster images', () => {
  test('resolves the Crown Zenith pack instead of falling back to the set logo', async () => {
    const client = new ScrydexSealedClient()

    await expect(client.getBoosterImageUrl({ id: 'swsh12.5' })).resolves.toBe(
      'https://images.scrydex.com/pokemon/swsh12pt5-s1/large',
    )
  })

  test('resolves Chaos Rising and Pitch Black booster artwork without credentials', async () => {
    const client = new ScrydexSealedClient()

    await expect(client.getBoosterImageUrl({ id: 'me04' })).resolves.toBe(
      'https://images.scrydex.com/pokemon/me4-s1/large',
    )
    await expect(client.getBoosterImageUrl({ id: 'me05' })).resolves.toBe(
      'https://images.scrydex.com/pokemon/me5-s1/large',
    )
  })
})
