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
  scrydexApiKey?: string
  scrydexTeamId?: string
  boosterRotationAvailableCount: number
  boosterRotationProposalCount: number
  boosterRotationCadenceUnit: 'day' | 'month'
  boosterRotationCadenceValue: number
  boosterRotationTimeZone: string
  boosterRotationAnchorLocalDate: string
}

export const getConfig = (): ApiConfig => {
  const apiOrigin = Bun.env.API_ORIGIN ?? 'http://127.0.0.1:3100'
  const webAppUrl = Bun.env.WEB_APP_URL ?? Bun.env.WEB_ORIGIN ?? 'http://127.0.0.1:5173'
  const webOrigin = toOrigin(Bun.env.WEB_ORIGIN ?? webAppUrl)
  const secureCookies = Bun.env.SECURE_COOKIES === 'true' || apiOrigin.startsWith('https://')
  const devAuthEnabled = Bun.env.DEV_AUTH_ENABLED ? Bun.env.DEV_AUTH_ENABLED === 'true' : false

  return {
    port: Number(Bun.env.PORT ?? 3100),
    host: Bun.env.HOST ?? '127.0.0.1',
    webOrigin,
    webAppUrl,
    apiOrigin,
    sessionCookieName: Bun.env.SESSION_COOKIE_NAME ?? 'tcg_session',
    sessionCookieSameSite: secureCookies && webOrigin !== toOrigin(apiOrigin) ? 'None' : 'Lax',
    secureCookies,
    magicLinkAdminSecret: Bun.env.MAGIC_LINK_ADMIN_SECRET,
    magicLinkTtlDays: Number.isFinite(Number(Bun.env.MAGIC_LINK_TTL_DAYS))
      ? Math.max(1, Number(Bun.env.MAGIC_LINK_TTL_DAYS))
      : 30,
    devAuthEnabled,
    slackClientId: Bun.env.SLACK_CLIENT_ID,
    slackClientSecret: Bun.env.SLACK_CLIENT_SECRET,
    slackRedirectUri: Bun.env.SLACK_REDIRECT_URI ?? `${apiOrigin}/auth/slack/callback`,
    scrydexApiKey: Bun.env.SCRYDEX_API_KEY,
    scrydexTeamId: Bun.env.SCRYDEX_TEAM_ID,
    boosterRotationAvailableCount: readPositiveInteger(Bun.env.BOOSTER_ROTATION_AVAILABLE_COUNT, 3),
    boosterRotationProposalCount: readPositiveInteger(Bun.env.BOOSTER_ROTATION_PROPOSAL_COUNT, 3),
    boosterRotationCadenceUnit: Bun.env.BOOSTER_ROTATION_CADENCE_UNIT === 'month' ? 'month' : 'day',
    boosterRotationCadenceValue: readPositiveInteger(Bun.env.BOOSTER_ROTATION_CADENCE_VALUE, 7),
    boosterRotationTimeZone: Bun.env.BOOSTER_ROTATION_TIME_ZONE ?? 'Europe/Paris',
    boosterRotationAnchorLocalDate: Bun.env.BOOSTER_ROTATION_ANCHOR_LOCAL_DATE ?? '2026-06-29',
  }
}

const toOrigin = (url: string): string => {
  return new URL(url).origin
}

const readPositiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}
