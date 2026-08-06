import { describe, expect, test } from 'bun:test'

import { getSwshGalleryParentSetId, getSwshGallerySetId } from '../src/pokemon-swsh-gallery'

describe('shared Sword and Shield gallery mapping', () => {
  test('maps parent and supplemental set IDs in both directions', () => {
    expect(getSwshGallerySetId('swsh12.5')).toBe('swsh12.5gg')
    expect(getSwshGalleryParentSetId('swsh12.5gg')).toBe('swsh12.5')
    expect(getSwshGallerySetId('sv10')).toBeUndefined()
  })
})
