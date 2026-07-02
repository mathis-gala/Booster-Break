import { describe, expect, test } from 'bun:test'
import { getBoosterRotationPeriod } from '../../src/pokemon/booster-rotation-calendar'
import type { BoosterRotationScheduleConfig } from '../../src/pokemon/booster-rotation-types'

const baseConfig: BoosterRotationScheduleConfig = {
  cadenceUnit: 'day',
  cadenceValue: 7,
  timeZone: 'Europe/Paris',
  anchorLocalDate: '2026-06-29',
}

describe('booster rotation calendar', () => {
  test('computes the weekly Paris period from a Monday anchor', () => {
    const period = getBoosterRotationPeriod(new Date('2026-07-02T12:00:00.000Z'), baseConfig)

    expect(period.startsAt.toISOString()).toBe('2026-06-28T22:00:00.000Z')
    expect(period.endsAt.toISOString()).toBe('2026-07-05T22:00:00.000Z')
  })

  test('supports a 14 day cadence', () => {
    const period = getBoosterRotationPeriod(new Date('2026-07-10T12:00:00.000Z'), {
      ...baseConfig,
      cadenceValue: 14,
    })

    expect(period.startsAt.toISOString()).toBe('2026-06-28T22:00:00.000Z')
    expect(period.endsAt.toISOString()).toBe('2026-07-12T22:00:00.000Z')
  })

  test('supports a monthly cadence', () => {
    const period = getBoosterRotationPeriod(new Date('2026-07-02T12:00:00.000Z'), {
      ...baseConfig,
      cadenceUnit: 'month',
      cadenceValue: 1,
    })

    expect(period.startsAt.toISOString()).toBe('2026-06-28T22:00:00.000Z')
    expect(period.endsAt.toISOString()).toBe('2026-07-28T22:00:00.000Z')
  })
})
