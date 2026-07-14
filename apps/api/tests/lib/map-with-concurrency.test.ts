import { describe, expect, test } from 'bun:test'
import { mapWithConcurrency } from '../../src/lib/map-with-concurrency'

describe('mapWithConcurrency', () => {
  test('never runs more work than the configured concurrency', async () => {
    let active = 0
    let maximumActive = 0

    const results = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
      active += 1
      maximumActive = Math.max(maximumActive, active)
      await new Promise((resolve) => setTimeout(resolve, 1))
      active -= 1
      return value * 2
    })

    expect(maximumActive).toBe(2)
    expect(results).toEqual([2, 4, 6, 8, 10])
  })
})
