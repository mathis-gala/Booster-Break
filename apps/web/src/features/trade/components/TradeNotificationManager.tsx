import { useQueryClient } from '@tanstack/react-query'
import { useCurrentUserQuery } from '@/features/dashboard/hooks/useAuthQueries'
import { toast } from '@/features/toast/toast-store'
import { m } from '@/paraglide/messages'
import { useLocale } from '@/features/i18n/useLocale'

import type {
  TradeNotificationListResponse,
  TradeNotificationResponse,
} from '@tcg-collection/shared'
import {
  useTradeNotificationViewedMutation,
  useTradeNotificationsQuery,
} from '../hooks/useTradeQueries'
import { tradeQueryKeys } from '../lib/query-keys'
import { TradeNotificationModal } from './TradeNotificationModal'

export function TradeNotificationManager() {
  const auth = useCurrentUserQuery()
  const { locale } = useLocale()
  const isAuthenticated = auth.data?.authenticated ?? false

  const queryClient = useQueryClient()
  const notificationsQuery = useTradeNotificationsQuery(locale, isAuthenticated)
  const markViewedMutation = useTradeNotificationViewedMutation()

  const notifications = isAuthenticated ? notificationsQuery.data?.notifications ?? [] : []
  const activeNotification = notifications[0]

  if (!activeNotification) {
    return null
  }

  const removeFromNotificationCache = (notificationId: string) => {
    queryClient.setQueryData<TradeNotificationListResponse>(
      tradeQueryKeys.notifications(locale),
      (previous) =>
        previous
          ? {
              notifications: previous.notifications.filter((entry) => entry.id !== notificationId),
            }
          : previous,
    )
  }

  const closeNotification = (notification: TradeNotificationResponse) => {
    markViewedMutation.mutate(notification.id, {
      onSuccess: () => {
        removeFromNotificationCache(notification.id)
      },
      onError: () => {
        toast.show(m.trade_notification_mark_error())
      },
    })
  }

  return (
    <TradeNotificationModal
      notification={activeNotification}
      onClose={() => closeNotification(activeNotification)}
    />
  )
}
