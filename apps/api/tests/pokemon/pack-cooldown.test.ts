import { describe, expect, test } from 'bun:test'

import { consumeBoosterCharge, getBoosterChargeStatus } from '../../src/pokemon/pack-cooldown'

const HOUR = 60 * 60
const BASE = 2 * HOUR

const at = (hours: number) => new Date(Date.UTC(2026, 0, 1, hours))

describe('getBoosterChargeStatus', () => {
  test('a user who never opened can open immediately', () => {
    const status = getBoosterChargeStatus(null, at(0), BASE, 3)

    expect(status.canOpen).toBe(true)
    expect(status.availableBoosters).toBe(1)
    expect(status.cooldownSeconds).toBe(0)
  })

  test('counts up one charge per base cooldown, capped at maxOverload + 1', () => {
    const anchor = at(0)

    expect(getBoosterChargeStatus(anchor, at(1), BASE, 3).availableBoosters).toBe(0)
    expect(getBoosterChargeStatus(anchor, at(2), BASE, 3).availableBoosters).toBe(1)
    expect(getBoosterChargeStatus(anchor, at(6), BASE, 3).availableBoosters).toBe(3)
    expect(getBoosterChargeStatus(anchor, at(10), BASE, 3).availableBoosters).toBe(4)
    expect(getBoosterChargeStatus(anchor, at(20), BASE, 3).availableBoosters).toBe(4)
  })

  test('reports the wait until the next charge while on cooldown', () => {
    const status = getBoosterChargeStatus(at(0), at(1), BASE, 3)

    expect(status.canOpen).toBe(false)
    expect(status.cooldownSeconds).toBe(HOUR)
    expect(status.nextOpenAt?.toISOString()).toBe(at(2).toISOString())
  })

  test('reports the next banked charge while one is already available', () => {
    const anchor = at(0)
    const status = getBoosterChargeStatus(anchor, at(3), BASE, 3)

    expect(status.canOpen).toBe(true)
    expect(status.availableBoosters).toBe(1)
    expect(status.nextOpenAt?.toISOString()).toBe(at(4).toISOString())
  })

  test('stops reporting a next charge once the cap is reached', () => {
    const anchor = at(0)
    const status = getBoosterChargeStatus(anchor, at(20), BASE, 3)

    expect(status.canOpen).toBe(true)
    expect(status.availableBoosters).toBe(4)
    expect(status.nextOpenAt).toBeNull()
  })

  test('a zero base cooldown disables the cooldown entirely', () => {
    const status = getBoosterChargeStatus(at(0), at(0), 0, 3)

    expect(status.canOpen).toBe(true)
    expect(status.cooldownSeconds).toBe(0)
    expect(status.nextOpenAt).toBeNull()
  })

  test('treats the exact cooldown boundary as one full charge', () => {
    const anchor = at(0)
    const justBefore = new Date(at(2).getTime() - 1)
    const exactly = at(2)

    expect(getBoosterChargeStatus(anchor, justBefore, BASE, 3).availableBoosters).toBe(0)
    expect(getBoosterChargeStatus(anchor, exactly, BASE, 3).availableBoosters).toBe(1)
  })

  test('ignores a future anchor from clock skew instead of granting charges', () => {
    const now = at(1)
    const futureAnchor = new Date(now.getTime() + BASE * 1000)
    const status = getBoosterChargeStatus(futureAnchor, now, BASE, 3)

    expect(status.canOpen).toBe(false)
    expect(status.availableBoosters).toBe(0)
    expect(status.cooldownSeconds).toBeGreaterThanOrEqual(0)
  })
})

describe('consumeBoosterCharge', () => {
  test('first open anchors at the open time', () => {
    expect(consumeBoosterCharge(null, at(5), BASE, 3).toISOString()).toBe(at(5).toISOString())
  })

  test('opening after a long wait leaves the banked extras available', () => {
    let anchor = at(0)
    const now = at(8)

    expect(getBoosterChargeStatus(anchor, now, BASE, 3).availableBoosters).toBe(4)

    anchor = consumeBoosterCharge(anchor, now, BASE, 3)
    expect(getBoosterChargeStatus(anchor, now, BASE, 3).availableBoosters).toBe(3)

    anchor = consumeBoosterCharge(anchor, now, BASE, 3)
    anchor = consumeBoosterCharge(anchor, now, BASE, 3)
    anchor = consumeBoosterCharge(anchor, now, BASE, 3)
    const status = getBoosterChargeStatus(anchor, now, BASE, 3)

    expect(status.availableBoosters).toBe(0)
    expect(status.cooldownSeconds).toBe(BASE)
  })

  test('surplus beyond the cap is discarded, not banked', () => {
    let anchor = at(0)
    const now = at(100)

    for (let i = 0; i < 4; i += 1) {
      expect(getBoosterChargeStatus(anchor, now, BASE, 3).canOpen).toBe(true)
      anchor = consumeBoosterCharge(anchor, now, BASE, 3)
    }

    const status = getBoosterChargeStatus(anchor, now, BASE, 3)
    expect(status.canOpen).toBe(false)
    expect(status.cooldownSeconds).toBe(BASE)
  })

  test('maxOverload of 1 reproduces the original "one extra booster" behaviour', () => {
    let anchor = at(0)
    const now = at(6)

    expect(getBoosterChargeStatus(anchor, now, BASE, 1).availableBoosters).toBe(2)
    anchor = consumeBoosterCharge(anchor, now, BASE, 1)
    expect(getBoosterChargeStatus(anchor, now, BASE, 1).canOpen).toBe(true)
    anchor = consumeBoosterCharge(anchor, now, BASE, 1)

    const status = getBoosterChargeStatus(anchor, now, BASE, 1)
    expect(status.canOpen).toBe(false)
    expect(status.cooldownSeconds).toBe(BASE)
  })
})
