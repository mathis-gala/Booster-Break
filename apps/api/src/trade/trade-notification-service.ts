import type { SupportedLocale, TradeNotificationListResponse } from '@tcg-collection/shared'
import { DEFAULT_LOCALE } from '@tcg-collection/shared'
import { resolveAuthenticatedTradeUser } from './trade-auth'
import { TradeNotificationReadModel } from './trade-notification-read-model'
import type { TradeServiceOptions, TradeServiceResult } from './trade-types'

export class TradeNotificationService {
  private readonly readModel: TradeNotificationReadModel

  constructor(private readonly options: TradeServiceOptions) {
    this.readModel = new TradeNotificationReadModel(options.tradeRepository)
  }

  async listTradeNotifications(
    cookieHeader: string | undefined,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<TradeServiceResult<TradeNotificationListResponse>> {
    const userOrError = await resolveAuthenticatedTradeUser(
      this.options.authService,
      cookieHeader,
      'Sign in to load your notifications.',
    )

    if ('error' in userOrError) {
      return userOrError
    }

    return this.readModel.listForUser(userOrError.id, locale)
  }

  async markTradeNotificationViewed(
    cookieHeader: string | undefined,
    notificationId: string,
  ): Promise<TradeServiceResult<void>> {
    const userOrError = await resolveAuthenticatedTradeUser(
      this.options.authService,
      cookieHeader,
      'Sign in to update notifications.',
    )

    if ('error' in userOrError) {
      return userOrError
    }

    const updated = await this.options.tradeRepository.markTradeNotificationViewed(
      notificationId,
      userOrError.id,
    )

    if (!updated) {
      return {
        error: 'notification_not_found',
        message: 'This notification does not exist.',
      }
    }
  }
}
