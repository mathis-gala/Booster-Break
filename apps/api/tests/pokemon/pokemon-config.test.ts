import { describe, expect, test } from 'bun:test'
import { DISABLED_BOOSTER_SET_IDS, isBoosterOpeningEnabled } from '../../src/pokemon/pokemon-config'

describe('available booster configuration', () => {
  test('enables Pitch Black for opening', () => {
    expect(DISABLED_BOOSTER_SET_IDS).not.toContain('me05')
    expect(isBoosterOpeningEnabled('me05')).toBe(true)
    expect(isBoosterOpeningEnabled('me04')).toBe(true)
    expect(isBoosterOpeningEnabled('swsh12.5')).toBe(true)
  })
})
