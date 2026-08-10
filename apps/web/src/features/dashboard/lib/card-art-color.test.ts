import { describe, expect, test } from 'bun:test'

import { extractDominantArtworkColors } from './card-art-color'

describe('artwork palette extraction', () => {
  test('returns five dominant and visually distinct colors', () => {
    const pixels = new Uint8ClampedArray([
      ...repeatPixel([220, 35, 45, 255], 12),
      ...repeatPixel([35, 190, 75, 255], 8),
      ...repeatPixel([40, 75, 220, 255], 5),
      ...repeatPixel([225, 185, 35, 255], 4),
      ...repeatPixel([210, 45, 190, 255], 3),
      ...repeatPixel([222, 38, 48, 255], 3),
    ])
    const palette = extractDominantArtworkColors(pixels).map(parseColor)

    expect(palette).toHaveLength(5)
    expect(palette[0][0]).toBeGreaterThan(palette[0][1])
    expect(palette.some((color) => color[1] > color[0] && color[1] > color[2])).toBeTrue()
    expect(palette.some((color) => color[2] > color[0] && color[2] > color[1])).toBeTrue()
    expect(palette.some((color) => color[0] > 150 && color[1] > 150 && color[2] < 120)).toBeTrue()
    expect(palette.some((color) => color[0] > 150 && color[2] > 150 && color[1] < 120)).toBeTrue()
  })

  test('supplies stable fallback colors when artwork has no visible pixels', () => {
    expect(extractDominantArtworkColors(new Uint8ClampedArray(16))).toEqual([
      '92 123 170',
      '139 105 196',
      '65 174 190',
      '211 92 162',
      '225 174 76',
    ])
  })
})

const repeatPixel = (pixel: readonly number[], count: number): number[] =>
  Array.from({ length: count }, () => pixel).flat()

const parseColor = (color: string): number[] => color.split(' ').map(Number)
