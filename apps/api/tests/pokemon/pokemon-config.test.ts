import { describe, expect, test } from 'bun:test'
import {
  BOOSTER_TEASE_MS,
  SCHEDULED_BOOSTER_RELEASES,
  getTeasedBoosterSetIds,
  getUnreleasedBoosterSetIds,
  isBoosterOpeningEnabled,
} from '../../src/pokemon/pokemon-config'

const releaseAt = Date.parse(SCHEDULED_BOOSTER_RELEASES.me05)

describe('scheduled booster releases', () => {
  test('only schedules valid instants with an explicit UTC offset', () => {
    for (const releasesAt of Object.values(SCHEDULED_BOOSTER_RELEASES)) {
      expect(releasesAt).toMatch(/(Z|[+-]\d{2}:\d{2})$/)
      expect(Date.parse(releasesAt)).not.toBeNaN()
    }
  })

  test('keeps a booster locked and silent before its tease window', () => {
    const now = releaseAt - BOOSTER_TEASE_MS - 1

    expect(isBoosterOpeningEnabled('me05', now)).toBe(false)
    expect(getUnreleasedBoosterSetIds(now)).toContain('me05')
    expect(getTeasedBoosterSetIds(now)).not.toContain('me05')
  })

  test('teases a booster for the week before release while keeping it locked', () => {
    for (const now of [releaseAt - BOOSTER_TEASE_MS, releaseAt - 1]) {
      expect(isBoosterOpeningEnabled('me05', now)).toBe(false)
      expect(getTeasedBoosterSetIds(now)).toContain('me05')
    }
  })

  test('releases a booster on its own at the release instant', () => {
    expect(isBoosterOpeningEnabled('me05', releaseAt)).toBe(true)
    expect(getUnreleasedBoosterSetIds(releaseAt)).not.toContain('me05')
    expect(getTeasedBoosterSetIds(releaseAt)).not.toContain('me05')
  })

  test('never locks unscheduled boosters', () => {
    expect(isBoosterOpeningEnabled('me04', 0)).toBe(true)
    expect(isBoosterOpeningEnabled('swsh12.5', 0)).toBe(true)
  })

  test('keeps a booster locked and silent when its instant cannot be parsed', () => {
    const releases = SCHEDULED_BOOSTER_RELEASES as Record<string, string>
    releases.broken = 'not a date'

    try {
      expect(isBoosterOpeningEnabled('broken', Number.MAX_SAFE_INTEGER)).toBe(false)
      expect(getTeasedBoosterSetIds(Number.MAX_SAFE_INTEGER)).not.toContain('broken')
    } finally {
      delete releases.broken
    }
  })
})
