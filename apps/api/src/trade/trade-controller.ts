import { Elysia } from 'elysia'
import { createAuthRequiredPlugin } from '../auth/auth-required-plugin'
import type { AuthUser } from '../auth/types'
import { localePlugin, resolveLocaleOverride } from '../i18n/locale'
import type { SupportedLocale } from '@tcg-collection/shared'
import type { TradeService } from './trade-service'
import { isTradeServiceError } from './trade-service-result'
import type { TradeControllerErrorCode, TradeControllerOptions } from './trade-types'
import {
  createAuctionSchema,
  createOfferSchema,
  offerIdSchema,
  offerPathSchema,
  notificationIdSchema,
  tradeIdSchema,
  tradeLocaleQuerySchema,
} from './trade-controller-schemas'

export const createTradeController = ({
  service,
  authService,
}: TradeControllerOptions<TradeService>) => {
  const authenticatedRoutes = createAuthenticatedTradeRoutes(service, authService)

  return new Elysia({ prefix: '/trade' })
    .use(localePlugin)
    .get(
      '/auctions',
      async ({ locale, query }) =>
        service.listAuctions(resolveLocaleOverride(query.locale, locale)),
      {
        query: tradeLocaleQuerySchema,
      },
    )
    .get(
      '/auctions/:auctionId',
      async ({ headers, locale, params, query, status }) => {
        const currentUser = await authService.getCurrentUser(headers.cookie)
        const result = await service.getAuction(
          params.auctionId,
          resolveLocaleOverride(query.locale, locale),
          currentUser,
        )

        if (isTradeServiceError(result)) {
          return status(toTradeErrorStatus(result.error), result)
        }

        return result
      },
      {
        params: tradeIdSchema,
        query: tradeLocaleQuerySchema,
      },
    )
    .use(authenticatedRoutes)
}

const createAuthenticatedTradeRoutes = (
  service: TradeControllerOptions<TradeService>['service'],
  authService: TradeControllerOptions<TradeService>['authService'],
) => {
  return new Elysia()
    .use(localePlugin)
    .use(
      createAuthRequiredPlugin({
        authService,
        unauthenticatedMessage: 'Sign in to use trade actions.',
      }),
    )
    .post(
      '/auctions',
      async (context) => {
        const { body, currentUser, query, status } = getAuthenticatedContext(context)
        const result = await service.createAuction(
          currentUser,
          body,
          resolveLocaleOverride(query.locale, context.locale),
        )

        if (isTradeServiceError(result)) {
          return status(toTradeErrorStatus(result.error), result)
        }

        return status(201, result)
      },
      {
        body: createAuctionSchema,
        query: tradeLocaleQuerySchema,
      },
    )
    .post(
      '/auctions/:auctionId/offers',
      async (context) => {
        const { body, currentUser, params, query, status } = getAuthenticatedContext(context)
        const result = await service.createOffer(
          currentUser,
          params.auctionId,
          body,
          resolveLocaleOverride(query.locale, context.locale),
        )

        if (isTradeServiceError(result)) {
          return status(toTradeErrorStatus(result.error), result)
        }

        return status(201, result)
      },
      {
        params: tradeIdSchema,
        body: createOfferSchema,
        query: tradeLocaleQuerySchema,
      },
    )
    .delete(
      '/offers/:offerId',
      async (context) => {
        const { currentUser, params, status } = getAuthenticatedContext(context)
        const result = await service.cancelOffer(currentUser, params.offerId)

        if (isTradeServiceError(result)) {
          return status(toTradeErrorStatus(result.error), result)
        }

        return status(204)
      },
      { params: offerIdSchema },
    )
    .post(
      '/auctions/:auctionId/offer/:offerId/accept',
      async (context) => {
        const { currentUser, params, status } = getAuthenticatedContext(context)
        const result = await service.acceptOffer(currentUser, params.auctionId, params.offerId)

        if (isTradeServiceError(result)) {
          return status(toTradeErrorStatus(result.error), result)
        }

        return status(204)
      },
      {
        params: offerPathSchema,
      },
    )
    .delete(
      '/auctions/:auctionId',
      async (context) => {
        const { currentUser, params, status } = getAuthenticatedContext(context)
        const result = await service.cancelAuction(currentUser, params.auctionId)

        if (isTradeServiceError(result)) {
          return status(toTradeErrorStatus(result.error), result)
        }

        return status(204)
      },
      {
        params: tradeIdSchema,
      },
    )
    .get(
      '/notifications',
      async (context) => {
        const { currentUser, query, status } = getAuthenticatedContext(context)
        const result = await service.listTradeNotifications(
          currentUser,
          resolveLocaleOverride(query.locale, context.locale),
        )

        if (isTradeServiceError(result)) {
          return status(toTradeErrorStatus(result.error), result)
        }

        return result
      },
      {
        query: tradeLocaleQuerySchema,
      },
    )
    .post(
      '/notifications/:notificationId/viewed',
      async (context) => {
        const { currentUser, params, status } = getAuthenticatedContext(context)
        const result = await service.markTradeNotificationViewed(currentUser, params.notificationId)

        if (isTradeServiceError(result)) {
          return status(toTradeErrorStatus(result.error), result)
        }

        return status(204)
      },
      {
        params: notificationIdSchema,
      },
    )
}

const toTradeErrorStatus = (error: TradeControllerErrorCode): 401 | 403 | 404 | 409 => {
  switch (error) {
    case 'unauthenticated':
      return 401
    case 'auction_not_owned':
    case 'cannot_trade_self':
    case 'offer_not_owned':
      return 403
    case 'auction_not_found':
    case 'offer_not_found':
      return 404
    case 'notification_not_found':
      return 404
    case 'notification_not_owned':
      return 403
    default:
      return 409
  }
}

const getAuthenticatedContext = <TContext>(
  context: TContext,
): TContext & { currentUser: AuthUser; locale: SupportedLocale } =>
  context as TContext & { currentUser: AuthUser; locale: SupportedLocale }
