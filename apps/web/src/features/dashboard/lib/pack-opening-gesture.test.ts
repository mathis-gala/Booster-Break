import { describe, expect, it } from 'bun:test'

import { getCardDismissalTransition, getSwipeDismissDirection } from './pack-opening-gesture'

describe('getCardDismissalTransition', () => {
  it('ignores a stale dismissal after the next card is already active', () => {
    expect(getCardDismissalTransition(1, 0, 3)).toBeUndefined()
  })

  it('advances once and completes without moving beyond the final card', () => {
    expect(getCardDismissalTransition(0, 0, 2)).toEqual({ nextIndex: 1, isComplete: false })
    expect(getCardDismissalTransition(1, 1, 2)).toEqual({ nextIndex: 1, isComplete: true })
  })
})

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
