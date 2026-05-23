import { describe, expect, test } from 'bun:test'
import { MemoryAuthStore } from '../../src/auth/session-store'

describe('MemoryAuthStore', () => {
  test('upserts users and indexes them by Slack id', () => {
    const store = new MemoryAuthStore()
    const user = store.upsertSlackUser({
      slackUserId: 'U123',
      pseudo: 'Player_01',
      displayName: 'Player 01',
      avatarUrl: 'https://example.com/avatar.png',
    })
    const updatedUser = store.upsertSlackUser({
      slackUserId: 'U123',
      pseudo: 'Player_01_New',
      displayName: 'Player 01 New',
    })

    expect(user.id).toBe(updatedUser.id)
    expect(updatedUser.pseudo).toBe('player_01_new')
    expect(updatedUser.displayName).toBe('Player 01 New')
  })

  test('creates readable sessions', () => {
    const store = new MemoryAuthStore()
    const user = store.upsertSlackUser({
      slackUserId: 'U123',
      pseudo: 'player_01',
    })
    const session = store.createSession(user.id)

    expect(store.getSession(session.id)?.userId).toBe(user.id)
    expect(store.getUser(user.id)).toEqual(user)
  })

  test('deletes sessions', () => {
    const store = new MemoryAuthStore()
    const user = store.upsertSlackUser({
      slackUserId: 'U123',
      pseudo: 'player_01',
    })
    const session = store.createSession(user.id)

    store.deleteSession(session.id)

    expect(store.getSession(session.id)).toBeUndefined()
  })
})
