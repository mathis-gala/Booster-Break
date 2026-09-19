import { describe, expect, test } from 'bun:test'

import { formatCountdown } from './time'

const SECOND = 1_000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

describe('formatCountdown', () => {
  test('pads every unit and localizes the day unit', () => {
    const remaining = 6 * DAY + 3 * HOUR + 5 * MINUTE + 9 * SECOND

    expect(formatCountdown(remaining, 'fr')).toBe('6j 03h 05m 09s')
    expect(formatCountdown(remaining, 'en')).toBe('6d 03h 05m 09s')
  })

  test('drops the day unit under a day and clamps at zero', () => {
    expect(formatCountdown(DAY - 1, 'fr')).toBe('23h 59m 59s')
    expect(formatCountdown(-5 * SECOND, 'fr')).toBe('00h 00m 00s')
  })
})
