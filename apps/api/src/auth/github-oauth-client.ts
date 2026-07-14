import { z } from 'zod'

const githubTokenResponseSchema = z.object({
  access_token: z.string().optional(),
  token_type: z.string().optional(),
  scope: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
})

const githubUserSchema = z.object({
  id: z.number(),
  login: z.string(),
  name: z.string().nullable().optional(),
  avatar_url: z.string().optional(),
  email: z.string().nullable().optional(),
})

const githubEmailSchema = z.object({
  email: z.string(),
  verified: z.boolean(),
  primary: z.boolean(),
})

export interface GithubOAuthClientOptions {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export interface GithubProfile {
  githubUserId: string
  login: string
  name?: string
  avatarUrl?: string
  /** Verified primary email, when available. Missing when the account has no public verified email. */
  email?: string
}

export class GithubOAuthClient {
  constructor(private readonly options: GithubOAuthClientOptions) {}

  createAuthorizeUrl(state: string): string {
    const searchParams = new URLSearchParams({
      client_id: this.options.clientId,
      redirect_uri: this.options.redirectUri,
      scope: 'read:user user:email',
      state,
    })

    return `https://github.com/login/oauth/authorize?${searchParams.toString()}`
  }

  async getProfile(code: string): Promise<GithubProfile> {
    const accessToken = await this.exchangeCode(code)
    const profile = await this.fetchUser(accessToken)
    const email =
      profile.email && profile.email.length > 0
        ? profile.email
        : await this.fetchPrimaryVerifiedEmail(accessToken)

    return {
      githubUserId: String(profile.id),
      login: profile.login,
      name: profile.name ?? undefined,
      avatarUrl: profile.avatar_url,
      email,
    }
  }

  private async exchangeCode(code: string): Promise<string> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
        code,
        redirect_uri: this.options.redirectUri,
      }),
    })
    const payload = githubTokenResponseSchema.parse(await response.json())

    if (!payload.access_token) {
      throw new Error(payload.error_description ?? payload.error ?? 'github_token_exchange_failed')
    }

    return payload.access_token
  }

  private async fetchUser(accessToken: string): Promise<z.infer<typeof githubUserSchema>> {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    if (!response.ok) {
      throw new Error('github_user_failed')
    }

    return githubUserSchema.parse(await response.json())
  }

  private async fetchPrimaryVerifiedEmail(accessToken: string): Promise<string | undefined> {
    const response = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    if (!response.ok) {
      return undefined
    }

    const emails = z.array(githubEmailSchema).parse(await response.json())
    const primaryVerified = emails.find((entry) => entry.primary && entry.verified)

    return primaryVerified?.email
  }
}
