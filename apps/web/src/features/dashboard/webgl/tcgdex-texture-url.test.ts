import { describe, expect, test } from 'bun:test'

import { getTcgDexTextureProxyPath } from './tcgdex-texture-url'

describe('getTcgDexTextureProxyPath', () => {
  test('maps TCGdex card images to the same-origin API proxy', () => {
    expect(getTcgDexTextureProxyPath('https://assets.tcgdex.net/fr/swsh/swsh3/136/high.png')).toBe(
      '/pokemon/assets/fr/swsh/swsh3/136/high.png',
    )
    expect(getTcgDexTextureProxyPath('https://assets.tcgdex.net/fr/sv/sv08.5/001/high.png')).toBe(
      '/pokemon/assets/fr/sv/sv08.5/001/high.png',
    )
  })

  test('does not proxy unrelated images', () => {
    expect(getTcgDexTextureProxyPath('https://example.com/card/high.png')).toBeUndefined()
    expect(
      getTcgDexTextureProxyPath('https://assets.tcgdex.net/fr/swsh/swsh3/logo.png'),
    ).toBeUndefined()
  })
})
