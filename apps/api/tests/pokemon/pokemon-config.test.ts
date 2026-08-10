import { describe, expect, test } from 'bun:test'
import { DISABLED_BOOSTER_SET_IDS, isBoosterOpeningEnabled } from '../../src/pokemon/pokemon-config'

describe('available booster configuration', () => {
  test('keeps Pitch Black implemented but disabled for opening', () => {
    expect(DISABLED_BOOSTER_SET_IDS).toContain('me05')
    expect(isBoosterOpeningEnabled('me05')).toBe(false)
    expect(isBoosterOpeningEnabled('me04')).toBe(true)
    expect(isBoosterOpeningEnabled('swsh12.5')).toBe(true)
  })
})
