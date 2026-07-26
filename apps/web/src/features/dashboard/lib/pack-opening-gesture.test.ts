import { describe, expect, it } from 'bun:test'

import { getSwipeDismissDirection } from './pack-opening-gesture'

describe('getSwipeDismissDirection', () => {
  it('dismisses in either direction past the distance threshold', () => {
    expect(getSwipeDismissDirection(82, 0)).toBe(1)
    expect(getSwipeDismissDirection(-82, 0)).toBe(-1)
  })

  it('uses swipe velocity for a short, decisive flick', () => {
    expect(getSwipeDismissDirection(20, 900)).toBe(1)
    expect(getSwipeDismissDirection(-20, -900)).toBe(-1)
  })

  it('keeps the dragged direction once distance crosses the threshold', () => {
    expect(getSwipeDismissDirection(82, -600)).toBe(1)
    expect(getSwipeDismissDirection(-82, 600)).toBe(-1)
  })

  it('springs back when neither distance nor velocity shows intent', () => {
    expect(getSwipeDismissDirection(45, 120)).toBeUndefined()
    expect(getSwipeDismissDirection(-45, -120)).toBeUndefined()
  })
})
