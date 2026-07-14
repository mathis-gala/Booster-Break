import { describe, expect, test } from 'bun:test'
import { getConfig } from '../src/config'

describe('getConfig', () => {
  test('rejects development authentication on public origins', () => {
    expect(() =>
      getConfig({
        API_ORIGIN: 'https://booster.example.com/api',
        WEB_ORIGIN: 'https://booster.example.com',
        DEV_AUTH_ENABLED: 'true',
      }),
    ).toThrow('DEV_AUTH_ENABLED can only be enabled for loopback origins')
  })

  test('enables development authentication automatically only on loopback origins', () => {
    const config = getConfig({
      API_ORIGIN: 'http://127.0.0.1:3100',
      WEB_ORIGIN: 'http://localhost:5173',
    })

    expect(config.devAuthEnabled).toBe(true)
  })

  test('rejects invalid server ports', () => {
    expect(() => getConfig({ PORT: 'not-a-port' })).toThrow(
      'PORT must be an integer between 1 and 65535',
    )
  })

  test('rejects non-HTTP public URLs used for redirects', () => {
    expect(() =>
      getConfig({
        API_ORIGIN: 'http://127.0.0.1:3100',
        WEB_APP_URL: 'javascript:alert(1)',
      }),
    ).toThrow('WEB_APP_URL must use http or https')
  })

  test('rejects partial OAuth credentials', () => {
    expect(() => getConfig({ GITHUB_CLIENT_ID: 'client-id' })).toThrow(
      'GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be configured together',
    )
  })

  test('rejects weak magic-link admin secrets', () => {
    expect(() => getConfig({ MAGIC_LINK_ADMIN_SECRET: 'too-short' })).toThrow(
      'MAGIC_LINK_ADMIN_SECRET must contain at least 32 characters',
    )
  })

  test('rejects unbounded magic-link policy lifetimes', () => {
    expect(() => getConfig({ MAGIC_LINK_TTL_DAYS: '365' })).toThrow(
      'MAGIC_LINK_TTL_DAYS must be an integer between 1 and 90',
    )
  })

  test('rejects invalid secure-cookie switches', () => {
    expect(() => getConfig({ SECURE_COOKIES: 'yes' })).toThrow(
      'SECURE_COOKIES must be either true or false',
    )
  })

  test('rejects cookie names containing header delimiters', () => {
    expect(() => getConfig({ SESSION_COOKIE_NAME: 'session; Secure' })).toThrow(
      'SESSION_COOKIE_NAME must be a valid cookie name',
    )
  })
})
