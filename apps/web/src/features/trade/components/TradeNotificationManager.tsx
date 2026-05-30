import { useCurrentUserQuery } from '@/features/dashboard/hooks/useAuthQueries'
import { toast } from '@/features/toast/toast-store'
import { m } from '@/paraglide/messages'

import type { TradeNotificationResponse } from '@tcg-collection/shared'
import {
  useTradeNotificationViewedMutation,
  useTradeNotificationsQuery,
} from '../hooks/useTradeQueries'
import { TradeNotificationModal } from './TradeNotificationModal'

export function TradeNotificationManager() {
  const auth = useCurrentUserQuery()
  const isAuthenticated = auth.data?.authenticated ?? false

  const notificationsQuery = useTradeNotificationsQuery(isAuthenticated)
  const markViewedMutation = useTradeNotificationViewedMutation()

  const notifications = isAuthenticated ? notificationsQuery.data?.notifications ?? [] : []
  const activeNotification = notifications[0]

  if (!activeNotification) {
    return null
  }

  const removeFromNotificationCache = (notificationId: string) => {
    notificationsQuery.setQueryData((previous) => {
      if (!previous) {
        return previous
      }

      return {
        notifications: previous.notifications.filter((entry) => entry.id !== notificationId),
      }
    })
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
