export interface ApiConfig {
  port: number
  host: string
  webOrigin: string
  apiOrigin: string
  sessionCookieName: string
  secureCookies: boolean
  slackClientId?: string
  slackClientSecret?: string
  slackRedirectUri: string
  scrydexApiKey?: string
  scrydexTeamId?: string
}

export const getConfig = (): ApiConfig => {
  const apiOrigin = Bun.env.API_ORIGIN ?? 'http://127.0.0.1:3100'

  return {
    port: Number(Bun.env.PORT ?? 3100),
    host: Bun.env.HOST ?? '127.0.0.1',
    webOrigin: Bun.env.WEB_ORIGIN ?? 'http://127.0.0.1:5173',
    apiOrigin,
    sessionCookieName: Bun.env.SESSION_COOKIE_NAME ?? 'tcg_session',
    secureCookies: Bun.env.SECURE_COOKIES === 'true' || apiOrigin.startsWith('https://'),
    slackClientId: Bun.env.SLACK_CLIENT_ID,
    slackClientSecret: Bun.env.SLACK_CLIENT_SECRET,
    slackRedirectUri: Bun.env.SLACK_REDIRECT_URI ?? `${apiOrigin}/auth/slack/callback`,
    scrydexApiKey: Bun.env.SCRYDEX_API_KEY,
    scrydexTeamId: Bun.env.SCRYDEX_TEAM_ID,
  }
}
