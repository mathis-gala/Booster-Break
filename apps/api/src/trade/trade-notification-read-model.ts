import type {
  SupportedLocale,
  TradeNotificationListResponse,
  TradeNotificationPayload,
} from '@tcg-collection/shared'
import { DEFAULT_LOCALE } from '@tcg-collection/shared'
import { toTradeNotificationResponse } from './trade-mappers'
import type { TradeRepository } from './trade-types'

const getNotificationCardIds = (payload: TradeNotificationPayload): string[] => {
  const offeredCardIds = [payload.offeredCard.cardId]
  const exchangedCardIds =
    'exchangedCards' in payload
      ? payload.exchangedCards.map((card) => card.cardId)
      : payload.offeredCards.map((card) => card.cardId)

  return [...offeredCardIds, ...exchangedCardIds]
}

export class TradeNotificationReadModel {
  constructor(private readonly tradeRepository: TradeRepository) {}

  async listForUser(
    userId: string,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<TradeNotificationListResponse> {
    const notifications = await this.tradeRepository.listTradeNotifications(userId)
    const notificationCardIds = [
      ...new Set(
        notifications.flatMap((notification) => getNotificationCardIds(notification.payload)),
      ),
    ]
    const notificationCards = await this.tradeRepository.findCards(notificationCardIds)
    const notificationCardById = new Map(notificationCards.map((card) => [card.id, card]))

    return {
      notifications: notifications.map((notification) =>
        toTradeNotificationResponse(notification, notificationCardById, locale),
      ),
    }
  }
}
