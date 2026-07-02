import { cors } from '@elysiajs/cors'
import { Elysia } from 'elysia'
import type { HealthResponse } from '@tcg-collection/shared'
import { createAuthController } from './auth/auth-controller'
import { AuthService } from './auth/auth-service'
import { PrismaAuthStore } from './auth/prisma-auth-store'
import { SlackOAuthClient } from './auth/slack-oauth-client'
import { getConfig } from './config'
import { prisma } from './db/prisma'
import { createLeaderboardController } from './leaderboard/leaderboard-controller'
import { LeaderboardRepository } from './leaderboard/leaderboard-repository'
import { LeaderboardService } from './leaderboard/leaderboard-service'
import { BoosterRotationRepository } from './pokemon/booster-rotation-repository'
import { BoosterRotationService } from './pokemon/booster-rotation-service'
import { createPokemonController } from './pokemon/pokemon-controller'
import { PokemonRepository } from './pokemon/pokemon-repository'
import { PokemonService } from './pokemon/pokemon-service'
import { ScrydexSealedClient } from './pokemon/scrydex-sealed-client'
import { TcgDexClient } from './pokemon/tcgdex-client'
import { createTradeController } from './trade/trade-controller'
import { PrismaTradeRepository } from './trade/trade-repository'
import { TradeService } from './trade/trade-service'

const config = getConfig()
const authStore = new PrismaAuthStore(prisma)
const authService = new AuthService({
  sessionCookieName: config.sessionCookieName,
  magicLinkTtlDays: config.magicLinkTtlDays,
  slackClient:
    config.slackClientId && config.slackClientSecret
      ? new SlackOAuthClient({
          clientId: config.slackClientId,
          clientSecret: config.slackClientSecret,
          redirectUri: config.slackRedirectUri,
        })
      : undefined,
  store: authStore,
})
const pokemonRepository = new PokemonRepository(prisma)
const pokemonClient = new TcgDexClient('en')
const localizedPokemonClients = {
  en: pokemonClient,
  fr: new TcgDexClient('fr'),
}
const sealedClient = new ScrydexSealedClient({
  apiKey: config.scrydexApiKey,
  teamId: config.scrydexTeamId,
})
const boosterRotationRepository = new BoosterRotationRepository(prisma)
let pokemonService: PokemonService
const boosterRotationService = new BoosterRotationService({
  config: {
    availableCount: config.boosterRotationAvailableCount,
    proposalCount: config.boosterRotationProposalCount,
    cadenceUnit: config.boosterRotationCadenceUnit,
    cadenceValue: config.boosterRotationCadenceValue,
    timeZone: config.boosterRotationTimeZone,
    anchorLocalDate: config.boosterRotationAnchorLocalDate,
  },
  repository: boosterRotationRepository,
  ensurePokemonDataAvailable: (locale, minimumSetCount) =>
    pokemonService.ensurePokemonDataAvailable(locale, minimumSetCount),
})
pokemonService = new PokemonService({
  authService,
  boosterRotationService,
  localizedPokemonClients,
  pokemonClient,
  pokemonRepository,
  sealedClient,
})
const leaderboardRepository = new LeaderboardRepository(prisma)
const leaderboardService = new LeaderboardService({
  leaderboardRepository,
})

const tradeRepository = new PrismaTradeRepository(prisma)
const tradeService = new TradeService({
  tradeRepository,
})

export const app = new Elysia()
  .use(
    cors({
      origin: config.webOrigin,
      credentials: true,
    }),
  )
  .use(createAuthController({ config, service: authService }))
  .use(
    createPokemonController({
      authService,
      boosterRotationService,
      config,
      localizedPokemonClients,
      pokemonClient,
      pokemonRepository,
      sealedClient,
      service: pokemonService,
    }),
  )
  .use(
    createLeaderboardController({
      service: leaderboardService,
    }),
  )
  .use(
    createTradeController({
      service: tradeService,
      authService,
    }),
  )
  .get('/health', (): HealthResponse => {
    return {
      ok: true,
      service: 'tcg-collection-api',
      timestamp: new Date().toISOString(),
    }
  })

if (import.meta.main) {
  app.listen({
    hostname: config.host,
    port: config.port,
  })
  console.log(`API listening on ${config.apiOrigin}`)
  console.log(`Web origin ${config.webOrigin}`)
  console.log(`Web app URL ${config.webAppUrl}`)
  console.log(`Slack redirect ${config.slackRedirectUri}`)
  console.log(`Development auth ${config.devAuthEnabled ? 'enabled' : 'disabled'}`)
}

export type App = typeof app
