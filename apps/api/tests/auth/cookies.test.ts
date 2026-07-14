import { describe, expect, test } from 'bun:test'
import { parseCookies } from '../../src/auth/cookies'

describe('parseCookies', () => {
  test('ignores malformed percent-encoding without rejecting the request', () => {
    expect(parseCookies('broken=%E0%A4%A; valid=session-token')).toEqual(
      new Map([['valid', 'session-token']]),
    )
  })
})
