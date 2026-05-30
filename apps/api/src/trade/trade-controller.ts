import { Elysia } from 'elysia'
import { createAuthRequiredPlugin } from '../auth/auth-required-plugin'
import type { TradeService } from './trade-service'
import { isTradeServiceError } from './trade-service-result'
import type { TradeControllerErrorCode, TradeControllerOptions } from './trade-types'
import { DEFAULT_LOCALE } from '@tcg-collection/shared'
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
    .get('/auctions', async ({ query }) => service.listAuctions(query.locale ?? DEFAULT_LOCALE), {
      query: tradeLocaleQuerySchema,
    })
    .get(
      '/auctions/:auctionId',
      async ({ params, query, status }) => {
        const result = await service.getAuction(params.auctionId, query.locale ?? DEFAULT_LOCALE)

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
    .use(
      createAuthRequiredPlugin({
        authService,
        unauthenticatedMessage: 'Sign in to use trade actions.',
      }),
    )
    .post(
      '/auctions',
      async ({ body, headers, query, status }) => {
        const result = await service.createAuction(headers.cookie, body, query.locale ?? DEFAULT_LOCALE)

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
      async ({ body, headers, params, query, status }) => {
        const result = await service.createOffer(
          headers.cookie,
          params.auctionId,
          body,
          query.locale ?? DEFAULT_LOCALE,
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
      async ({ headers, params, status }) => {
        const result = await service.cancelOffer(headers.cookie, params.offerId)

        if (isTradeServiceError(result)) {
          return status(toTradeErrorStatus(result.error), result)
        }

        return status(204)
      },
      { params: offerIdSchema },
    )
    .post(
      '/auctions/:auctionId/offer/:offerId/accept',
      async ({ headers, params, status }) => {
        const result = await service.acceptOffer(headers.cookie, params.auctionId, params.offerId)

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
      async ({ headers, params, status }) => {
        const result = await service.cancelAuction(headers.cookie, params.auctionId)

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
      async ({ headers, status }) => {
        const result = await service.listTradeNotifications(headers.cookie)

        if (isTradeServiceError(result)) {
          return status(toTradeErrorStatus(result.error), result)
        }

        return result
      },
    )
    .post(
      '/notifications/:notificationId/viewed',
      async ({ headers, params, status }) => {
        const result = await service.markTradeNotificationViewed(
          headers.cookie,
          params.notificationId,
        )

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
