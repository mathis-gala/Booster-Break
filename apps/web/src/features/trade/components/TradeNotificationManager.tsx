import { useMemo, useSyncExternalStore } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/features/toast/toast-store'
import { m } from '@/paraglide/messages'
import { useLocale } from '@/features/i18n/useLocale'

import type {
  SupportedLocale,
  TradeNotificationListResponse,
  TradeNotificationResponse,
} from '@tcg-collection/shared'
import { refreshTradeMarketQueries } from '../hooks/useTradeQueries'
import { useTradeNotificationViewedMutationOption } from '@/lib/mutations/trade'
import { useCurrentUserQueryOption } from '@/lib/queries/auth'
import { useOwnedCardIdsQueryOption } from '@/lib/queries/pokemon'
import { useTradeNotificationsQueryOption } from '@/lib/queries/trade'
import { tradeQueryKeys } from '../lib/query-keys'
import { TradeNotificationModal } from './TradeNotificationModal'

const invalidatedNotificationSignatures = new Map<string, string>()

const getStableSnapshot = () => 0

const useTradeNotificationMarketInvalidation = (
  queryClient: ReturnType<typeof useQueryClient>,
  locale: SupportedLocale,
  enabled: boolean,
) => {
  useSyncExternalStore(
    (notify) => {
      if (!enabled) {
        return () => undefined
      }

      return queryClient.getQueryCache().subscribe((event) => {
        const [domain, resource, notificationLocale] = event.query.queryKey

        if (domain !== 'trade' || resource !== 'notifications' || notificationLocale !== locale) {
          notify()
          return
        }

        const data = queryClient.getQueryData<TradeNotificationListResponse>(
          tradeQueryKeys.notifications(locale),
        )
        const signature = data?.notifications.map((notification) => notification.id).join('|') ?? ''

        if (signature && invalidatedNotificationSignatures.get(locale) !== signature) {
          invalidatedNotificationSignatures.set(locale, signature)
          void refreshTradeMarketQueries(queryClient)
        }

        notify()
      })
    },
    getStableSnapshot,
    getStableSnapshot,
  )
}

export function TradeNotificationManager() {
  const auth = useQuery(useCurrentUserQueryOption())
  const { locale } = useLocale()
  const isAuthenticated = auth.data?.authenticated ?? false

  const queryClient = useQueryClient()
  const notificationsQuery = useQuery(useTradeNotificationsQueryOption(isAuthenticated))
  const markViewedMutation = useMutation(useTradeNotificationViewedMutationOption(queryClient))
  useTradeNotificationMarketInvalidation(queryClient, locale, isAuthenticated)

  const notifications = isAuthenticated ? (notificationsQuery.data?.notifications ?? []) : []
  const activeNotification = notifications[0]
  const ownedCardIdsQuery = useQuery(useOwnedCardIdsQueryOption(Boolean(activeNotification)))
  const ownedCardIds = useMemo(
    () => (ownedCardIdsQuery.data ? new Set(ownedCardIdsQuery.data) : undefined),
    [ownedCardIdsQuery.data],
  )

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
      ownedCardIds={ownedCardIds}
      onClose={() => closeNotification(activeNotification)}
    />
  )
}
