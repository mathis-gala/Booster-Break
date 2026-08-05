import { describe, expect, test } from 'bun:test'
import { getSandboxSetDateRange, isSandboxBoosterSet } from '../../src/pokemon/pokemon-sandbox-sets'

describe('sandbox set eligibility', () => {
  test('includes the 2023 sandbox range and Crown Zenith specifically', () => {
    expect(getSandboxSetDateRange()).toEqual({
      fromDate: '2003-01-01',
      toDate: '2023-12-31',
    })
    expect(
      isSandboxBoosterSet({
        id: 'swsh12.5',
        name: 'Crown Zenith',
        releaseDate: '2023-01-20',
      }),
    ).toBe(true)
  })

  test('does not expose gallery children or arbitrary supplemental sets', () => {
    for (const id of ['swsh9.5tg', 'swsh10.5tg', 'swsh12.5tg', 'swsh12.5gg', 'swsh10.5']) {
      expect(
        isSandboxBoosterSet({
          id,
          name: 'Supplemental cards',
          releaseDate: '2023-01-20',
        }),
      ).toBe(false)
    }
  })
})
