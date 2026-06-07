import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { GameNav } from '@/features/dashboard/components/GameNav'
import {
  getInitialDashboardTab,
  setStoredDashboardTab,
} from '@/features/dashboard/lib/dashboard-tab-storage'
import { useLocale } from '@/features/i18n/useLocale'
import type { DashboardTab } from '@/features/dashboard/types'
import { DashboardContent } from '@/features/dashboard/views/DashboardContent'
import { useLogoutMutationOption } from '@/lib/mutations/auth'
import { useCurrentUserQueryOption } from '@/lib/queries/auth'
import { m } from '@/paraglide/messages'

export function DashboardPage() {
  useLocale()
  const [activeTab, setActiveTab] = useState<DashboardTab>(getInitialDashboardTab)
  const queryClient = useQueryClient()
  const auth = useQuery(useCurrentUserQueryOption())
  const logoutMutation = useMutation(useLogoutMutationOption(queryClient))

  const selectTab = (tab: DashboardTab) => {
    setStoredDashboardTab(tab)
    setActiveTab(tab)
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-sidebar focus:px-4 focus:py-3 focus:text-sidebar-foreground"
      >
        {m.skip_to_main_content()}
      </a>

      <GameNav
        activeTab={activeTab}
        onTabChange={selectTab}
        auth={auth.data}
        authIsPending={auth.isPending}
        onLogout={() => logoutMutation.mutate()}
        isLoggingOut={logoutMutation.isPending}
      />

      <main id="main-content" className="min-h-dvh min-w-0 pt-16 md:pl-44 md:pt-0">
        <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-7xl items-center justify-center px-3 py-5 sm:px-6 md:min-h-dvh lg:px-8">
          <DashboardContent activeTab={activeTab} />
        </div>
      </main>
    </div>
  )
}
