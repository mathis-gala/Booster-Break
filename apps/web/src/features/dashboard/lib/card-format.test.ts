import { describe, expect, test } from 'bun:test'

import { resolveCardPreviewFinish } from './card-format'

describe('resolveCardPreviewFinish', () => {
  test('preserves the finish selected by a collection card', () => {
    expect(
      resolveCardPreviewFinish({
        finish: 'reverse_holo',
        finishes: ['normal', 'holo', 'reverse_holo'],
      }),
    ).toBe('reverse_holo')
  })

  test('uses the natural set-card finish when no finish is selected', () => {
    expect(resolveCardPreviewFinish({ finishes: ['normal', 'reverse_holo'] })).toBe('normal')
    expect(resolveCardPreviewFinish({ finishes: ['holo', 'reverse_holo'] })).toBe('holo')
    expect(resolveCardPreviewFinish({ finishes: ['holo'] })).toBe('holo')
    expect(resolveCardPreviewFinish({ finishes: ['reverse_holo'] })).toBe('reverse_holo')
  })

  test('previews a plain Rare in its Holo variant when one is available', () => {
    for (const cardId of ['PFL 053', 'PFL 068']) {
      expect(
        resolveCardPreviewFinish({
          rarity: 'Rare',
          finishes: ['normal', 'holo', 'reverse_holo'],
        }),
        cardId,
      ).toBe('holo')
    }
  })

  test('does not make lower rarities holo just because a holo variant exists', () => {
    expect(
      resolveCardPreviewFinish({
        rarity: 'Uncommon',
        finishes: ['normal', 'holo', 'reverse_holo'],
      }),
    ).toBe('normal')
  })

  test('leaves cards without finish metadata unfoiled', () => {
    expect(resolveCardPreviewFinish({})).toBeUndefined()
  })
})
