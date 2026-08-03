import { describe, expect, test } from 'bun:test'
import type { OpenPackResponse } from '@tcg-collection/shared'

import { preloadPackImages } from './preload-pack-images'

describe('preloadPackImages', () => {
  test('waits for every unique booster and proxied card image', async () => {
    const requestedUrls: string[] = []
    const completedUrls: string[] = []
    const pack = {
      set: {
        boosterImageUrl: 'https://images.scrydex.com/pokemon/sv8-s1/large',
      },
      cards: [
        {
          imageLarge: 'https://assets.tcgdex.net/fr/sv/sv08.5/001/high.png',
        },
        {
          imageLarge: 'https://assets.tcgdex.net/fr/sv/sv08.5/001/high.png',
        },
        {
          imageSmall: 'https://assets.tcgdex.net/fr/sv/sv08.5/002/low.png',
        },
      ],
    } as OpenPackResponse

    await preloadPackImages(pack, async (url) => {
      requestedUrls.push(url)
      await Promise.resolve()
      completedUrls.push(url)
    })

    expect(requestedUrls).toEqual([
      'https://images.scrydex.com/pokemon/sv8-s1/large',
      '/api/pokemon/assets/fr/sv/sv08.5/001/high.png',
      '/api/pokemon/assets/fr/sv/sv08.5/002/low.png',
    ])
    expect(completedUrls).toEqual(requestedUrls)
  })
})
