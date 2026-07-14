export interface ApiConfig {
  port: number
  host: string
  webOrigin: string
  webAppUrl: string
  apiOrigin: string
  sessionCookieName: string
  sessionCookieSameSite: 'Lax' | 'None'
  secureCookies: boolean
  magicLinkAdminSecret?: string
  magicLinkTtlDays: number
  devAuthEnabled: boolean
  slackClientId?: string
  slackClientSecret?: string
  slackRedirectUri: string
  githubClientId?: string
  githubClientSecret?: string
  githubRedirectUri: string
  scrydexApiKey?: string
  scrydexTeamId?: string
}

type ApiEnvironment = Record<string, string | undefined>

export const getConfig = (env: ApiEnvironment = Bun.env): ApiConfig => {
  const port = Number(env.PORT ?? 3100)

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535')
  }

  const apiOrigin = env.API_ORIGIN ?? 'http://127.0.0.1:3100'
  const webAppUrl = env.WEB_APP_URL ?? env.WEB_ORIGIN ?? 'http://127.0.0.1:5173'
  assertHttpUrl('API_ORIGIN', apiOrigin)
  assertHttpUrl('WEB_APP_URL', webAppUrl)

  const configuredWebOrigin = env.WEB_ORIGIN ?? webAppUrl
  assertHttpUrl('WEB_ORIGIN', configuredWebOrigin)

  const webOrigin = toOrigin(configuredWebOrigin)
  assertBooleanSwitch('SECURE_COOKIES', env.SECURE_COOKIES)
  const secureCookies =
    env.SECURE_COOKIES === 'true' || new URL(apiOrigin).protocol.toLowerCase() === 'https:'
  const devAuthEnabled = resolveDevAuthEnabled(env.DEV_AUTH_ENABLED, apiOrigin, webOrigin)
  const magicLinkTtlDays = resolveMagicLinkTtlDays(env.MAGIC_LINK_TTL_DAYS)
  const sessionCookieName = env.SESSION_COOKIE_NAME ?? 'tcg_session'

  if (!/^[!#$%&'*+\-.^_`|~0-9A-Za-z]{1,128}$/.test(sessionCookieName)) {
    throw new Error('SESSION_COOKIE_NAME must be a valid cookie name')
  }
  const slackRedirectUri = env.SLACK_REDIRECT_URI ?? `${apiOrigin}/auth/slack/callback`
  const githubRedirectUri = env.GITHUB_REDIRECT_URI ?? `${apiOrigin}/auth/github/callback`
  assertHttpUrl('SLACK_REDIRECT_URI', slackRedirectUri)
  assertHttpUrl('GITHUB_REDIRECT_URI', githubRedirectUri)
  assertConfiguredTogether(
    'SLACK_CLIENT_ID',
    env.SLACK_CLIENT_ID,
    'SLACK_CLIENT_SECRET',
    env.SLACK_CLIENT_SECRET,
  )
  assertConfiguredTogether(
    'GITHUB_CLIENT_ID',
    env.GITHUB_CLIENT_ID,
    'GITHUB_CLIENT_SECRET',
    env.GITHUB_CLIENT_SECRET,
  )
  assertConfiguredTogether(
    'SCRYDEX_API_KEY',
    env.SCRYDEX_API_KEY,
    'SCRYDEX_TEAM_ID',
    env.SCRYDEX_TEAM_ID,
  )

  if (env.MAGIC_LINK_ADMIN_SECRET && env.MAGIC_LINK_ADMIN_SECRET.length < 32) {
    throw new Error('MAGIC_LINK_ADMIN_SECRET must contain at least 32 characters')
  }

  return {
    port,
    host: env.HOST ?? '127.0.0.1',
    webOrigin,
    webAppUrl,
    apiOrigin,
    sessionCookieName,
    sessionCookieSameSite: secureCookies && webOrigin !== toOrigin(apiOrigin) ? 'None' : 'Lax',
    secureCookies,
    magicLinkAdminSecret: env.MAGIC_LINK_ADMIN_SECRET,
    magicLinkTtlDays,
    devAuthEnabled,
    slackClientId: env.SLACK_CLIENT_ID,
    slackClientSecret: env.SLACK_CLIENT_SECRET,
    slackRedirectUri,
    githubClientId: env.GITHUB_CLIENT_ID,
    githubClientSecret: env.GITHUB_CLIENT_SECRET,
    githubRedirectUri,
    scrydexApiKey: env.SCRYDEX_API_KEY,
    scrydexTeamId: env.SCRYDEX_TEAM_ID,
  }
}

const toOrigin = (url: string): string => {
  return new URL(url).origin
}

const assertHttpUrl = (name: string, value: string): void => {
  const protocol = new URL(value).protocol

  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new Error(`${name} must use http or https`)
  }
}

const assertConfiguredTogether = (
  firstName: string,
  firstValue: string | undefined,
  secondName: string,
  secondValue: string | undefined,
): void => {
  if (Boolean(firstValue) !== Boolean(secondValue)) {
    throw new Error(`${firstName} and ${secondName} must be configured together`)
  }
}

const assertBooleanSwitch = (name: string, value: string | undefined): void => {
  if (value !== undefined && value !== 'true' && value !== 'false') {
    throw new Error(`${name} must be either true or false`)
  }
}

const resolveDevAuthEnabled = (
  configuredValue: string | undefined,
  apiOrigin: string,
  webOrigin: string,
): boolean => {
  assertBooleanSwitch('DEV_AUTH_ENABLED', configuredValue)

  const hasLoopbackOrigins = isLoopbackOrigin(apiOrigin) && isLoopbackOrigin(webOrigin)

  if (configuredValue === 'true' && !hasLoopbackOrigins) {
    throw new Error('DEV_AUTH_ENABLED can only be enabled for loopback origins')
  }

  return configuredValue === 'false' ? false : hasLoopbackOrigins
}

const resolveMagicLinkTtlDays = (configuredValue: string | undefined): number => {
  if (!configuredValue) {
    return 30
  }

  const value = Number(configuredValue)

  if (!Number.isInteger(value) || value < 1 || value > 90) {
    throw new Error('MAGIC_LINK_TTL_DAYS must be an integer between 1 and 90')
  }

  return value
}

const isLoopbackOrigin = (value: string): boolean => {
  const hostname = new URL(value).hostname

  return hostname === 'localhost' || hostname === '::1' || hostname.startsWith('127.')
}
