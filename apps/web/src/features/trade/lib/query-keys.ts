import type { SupportedLocale } from '@tcg-collection/shared'

export const tradeQueryKeys = {
  all: ['trade'] as const,
  auctions: (locale: SupportedLocale) => ['trade', 'auctions', locale] as const,
  auction: (auctionId: string, locale: SupportedLocale) => ['trade', 'auction', locale, auctionId] as const,
  notifications: ['trade', 'notifications'] as const,
  notification: (notificationId: string) => ['trade', 'notification', notificationId] as const,
}
