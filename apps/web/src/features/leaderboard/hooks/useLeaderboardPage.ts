import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import { setStoredDashboardTab } from '@/features/dashboard/lib/dashboard-tab-storage'
import type { DashboardTab } from '@/features/dashboard/types'
import { useLocale } from '@/features/i18n/useLocale'
import { useLogoutMutationOption } from '@/lib/mutations/auth'
import { useCurrentUserQueryOption } from '@/lib/queries/auth'
import { usePokemonLeaderboardQueryOption } from '@/lib/queries/pokemon'
import { getLeaderboardConfig, type LeaderboardKind } from '../lib/leaderboard-config'

export const useLeaderboardPage = () => {
  const { locale } = useLocale()
  const navigate = useNavigate()
  const [activeLeaderboard, setActiveLeaderboard] = useState<LeaderboardKind>('mostUniqueCards')
  const queryClient = useQueryClient()
  const auth = useQuery(useCurrentUserQueryOption())
  const logoutMutation = useMutation(useLogoutMutationOption(queryClient))
  const leaderboard = useQuery(usePokemonLeaderboardQueryOption())
  const activeConfig = getLeaderboardConfig(activeLeaderboard)

  const selectTab = (tab: DashboardTab) => {
    if (tab === 'leaders') {
      return
    }

    setStoredDashboardTab(tab)
    void navigate({ to: '/' })
  }

  return {
    activeConfig,
    activeLeaderboard,
    auth,
    leaderboard,
    logoutMutation,
    numberFormatter: new Intl.NumberFormat(locale),
    players: leaderboard.data?.[activeLeaderboard] ?? [],
    selectTab,
    setActiveLeaderboard,
  }
}
