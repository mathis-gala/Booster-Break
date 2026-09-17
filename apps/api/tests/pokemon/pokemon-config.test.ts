import { describe, expect, test } from 'bun:test'
import {
  BOOSTER_TEASE_MS,
  SCHEDULED_BOOSTER_RELEASES,
  getTeasedBoosterReleases,
  getUnreleasedBoosterSetIds,
  isBoosterOpeningEnabled,
} from '../../src/pokemon/pokemon-config'

const releaseAt = Date.parse(SCHEDULED_BOOSTER_RELEASES.me05)
const teasedSetIds = (now: number) => getTeasedBoosterReleases(now).map(({ setId }) => setId)

describe('scheduled booster releases', () => {
  test('keeps a booster locked and silent before its tease window', () => {
    const now = releaseAt - BOOSTER_TEASE_MS - 1

    expect(isBoosterOpeningEnabled('me05', now)).toBe(false)
    expect(getUnreleasedBoosterSetIds(now)).toContain('me05')
    expect(teasedSetIds(now)).not.toContain('me05')
  })

  test('teases a booster for the week before release while keeping it locked', () => {
    for (const now of [releaseAt - BOOSTER_TEASE_MS, releaseAt - 1]) {
      expect(isBoosterOpeningEnabled('me05', now)).toBe(false)
      expect(teasedSetIds(now)).toContain('me05')
    }
  })

  test('releases a booster on its own at the release instant', () => {
    expect(isBoosterOpeningEnabled('me05', releaseAt)).toBe(true)
    expect(getUnreleasedBoosterSetIds(releaseAt)).not.toContain('me05')
    expect(teasedSetIds(releaseAt)).not.toContain('me05')
  })

  test('never locks unscheduled boosters', () => {
    expect(isBoosterOpeningEnabled('me04', 0)).toBe(true)
    expect(isBoosterOpeningEnabled('swsh12.5', 0)).toBe(true)
  })
})
