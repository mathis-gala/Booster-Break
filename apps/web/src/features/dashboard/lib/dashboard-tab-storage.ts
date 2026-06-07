import type { DashboardTab } from '../types'

const dashboardTabStorageKey = 'booster-break-dashboard-tab'

export const getInitialDashboardTab = (): DashboardTab => {
  if (typeof window === 'undefined') {
    return 'packs'
  }

  const storedTab = window.sessionStorage.getItem(dashboardTabStorageKey)

  return isDashboardContentTab(storedTab) ? storedTab : 'packs'
}

export const setStoredDashboardTab = (tab: DashboardTab) => {
  if (tab === 'leaders' || typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(dashboardTabStorageKey, tab)
}

const isDashboardContentTab = (tab: string | null): tab is DashboardTab => {
  return tab === 'packs' || tab === 'sandbox' || tab === 'collection' || tab === 'trade'
}
