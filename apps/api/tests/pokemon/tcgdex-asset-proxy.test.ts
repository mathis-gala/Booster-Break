import { describe, expect, test } from 'bun:test'

import { proxyTcgDexCardAsset } from '../../src/pokemon/tcgdex-asset-proxy'

describe('proxyTcgDexCardAsset', () => {
  test('proxies a card PNG from the fixed TCGdex origin', async () => {
    let requestedUrl: string | undefined
    const response = await proxyTcgDexCardAsset('fr/swsh/swsh3/136/high.png', async (input) => {
      requestedUrl = String(input)
      return new Response('png', {
        headers: {
          'cache-control': 'max-age=60',
          'content-type': 'image/png',
        },
      })
    })

    expect(requestedUrl).toBe('https://assets.tcgdex.net/fr/swsh/swsh3/136/high.png')
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('max-age=60')
    expect(await response.text()).toBe('png')
  })

  test('rejects paths outside card image variants without fetching', async () => {
    let didFetch = false
    const response = await proxyTcgDexCardAsset('../api/private', async () => {
      didFetch = true
      return new Response()
    })

    expect(response.status).toBe(400)
    expect(didFetch).toBe(false)
  })

  test('accepts special set identifiers containing a dot', async () => {
    let requestedUrl: string | undefined
    const response = await proxyTcgDexCardAsset('fr/sv/sv08.5/001/high.png', async (input) => {
      requestedUrl = input
      return new Response('png', { headers: { 'content-type': 'image/png' } })
    })

    expect(response.status).toBe(200)
    expect(requestedUrl).toBe('https://assets.tcgdex.net/fr/sv/sv08.5/001/high.png')
  })
})
