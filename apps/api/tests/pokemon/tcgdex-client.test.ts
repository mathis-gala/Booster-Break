import { describe, expect, test } from 'bun:test'
import { getSwshGalleryParentSetId, getSwshGallerySetId } from '../../src/pokemon/swsh-gallery'
import { getCardImageUrl } from '../../src/pokemon/tcgdex-client'

describe('SWSH gallery assets', () => {
  test('maps each parent expansion to its gallery child and back', () => {
    const mappings = [
      ['swsh9', 'swsh9.5tg'],
      ['swsh10', 'swsh10.5tg'],
      ['swsh11', 'swsh11.5tg'],
      ['swsh12', 'swsh12.5tg'],
      ['swsh12.5', 'swsh12.5gg'],
    ] as const

    for (const [parentSetId, gallerySetId] of mappings) {
      expect(getSwshGallerySetId(parentSetId)).toBe(gallerySetId)
      expect(getSwshGalleryParentSetId(gallerySetId)).toBe(parentSetId)
    }

    expect(getSwshGallerySetId('swsh8')).toBeUndefined()
    expect(getSwshGalleryParentSetId('swsh12.5')).toBeUndefined()
  })

  test('synthesizes gallery image paths under the parent expansion', () => {
    const imageCases = [
      ['swsh9.5tg', 'TG01', 'swsh9'],
      ['swsh10.5tg', 'TG13', 'swsh10'],
      ['swsh11.5tg', 'TG29', 'swsh11'],
      ['swsh12.5tg', 'TG30', 'swsh12'],
      ['swsh12.5gg', 'GG70', 'swsh12.5'],
    ] as const

    for (const [gallerySetId, localId, parentSetId] of imageCases) {
      expect(
        getCardImageUrl({ image: undefined, localId, set: { id: gallerySetId } }, 'high'),
      ).toBe(`https://assets.tcgdex.net/en/swsh/${parentSetId}/${localId}/high.png`)
    }
  })

  test('keeps upstream images and leaves unknown missing images unresolved', () => {
    expect(
      getCardImageUrl(
        {
          image: 'https://example.com/card',
          localId: 'TG01',
          set: { id: 'swsh9.5tg' },
        },
        'low',
      ),
    ).toBe('https://example.com/card/low.png')
    expect(
      getCardImageUrl({ image: undefined, localId: '001', set: { id: 'swsh9' } }, 'low'),
    ).toBeUndefined()
  })
})
