import { z } from 'zod'

const slackTokenResponseSchema = z.object({
  ok: z.boolean(),
  access_token: z.string().optional(),
  error: z.string().optional(),
})

const slackUserInfoSchema = z.object({
  ok: z.boolean(),
  sub: z.string().optional(),
  name: z.string().optional(),
  picture: z.string().optional(),
  error: z.string().optional(),
  'https://slack.com/user_id': z.string().optional(),
  'https://slack.com/team_id': z.string().optional(),
})

export interface SlackOAuthClientOptions {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export interface SlackProfile {
  slackSubject: string
  slackUserId: string
  slackTeamId?: string
  name: string
  picture?: string
}

export class SlackOAuthClient {
  constructor(private readonly options: SlackOAuthClientOptions) {}

  createAuthorizeUrl(state: string): string {
    const searchParams = new URLSearchParams({
      client_id: this.options.clientId,
      redirect_uri: this.options.redirectUri,
      response_type: 'code',
      scope: 'openid profile',
      state,
    })

    return `https://slack.com/openid/connect/authorize?${searchParams.toString()}`
  }

  async getProfile(code: string): Promise<SlackProfile> {
    const accessToken = await this.exchangeCode(code)
    const response = await fetch('https://slack.com/api/openid.connect.userInfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    const payload = slackUserInfoSchema.parse(await response.json())

    if (!payload.ok || !payload.sub) {
      throw new Error(payload.error ?? 'slack_userinfo_failed')
    }

    return {
      slackSubject: payload.sub,
      slackUserId: payload['https://slack.com/user_id'] ?? payload.sub,
      slackTeamId: payload['https://slack.com/team_id'],
      name: payload.name ?? 'Slack player',
      picture: payload.picture,
    }
  }

  private async exchangeCode(code: string): Promise<string> {
    const response = await fetch('https://slack.com/api/openid.connect.token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.options.redirectUri,
      }),
    })
    const payload = slackTokenResponseSchema.parse(await response.json())

    if (!payload.ok || !payload.access_token) {
      throw new Error(payload.error ?? 'slack_token_exchange_failed')
    }

    return payload.access_token
  }
}
