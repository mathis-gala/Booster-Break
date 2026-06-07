import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'

import { DashboardPage } from '@/pages/DashboardPage'
import { LeaderboardPage } from '@/pages/LeaderboardPage'
import { RootLayout } from '@/pages/RootLayout'
import { SetupPage } from '@/pages/SetupPage'

const rootRoute = createRootRoute({
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
})

const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/setup',
  component: SetupPage,
})

const leaderboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/leaderboard',
  component: LeaderboardPage,
})

const routeTree = rootRoute.addChildren([indexRoute, setupRoute, leaderboardRoute])

const basepath =
  import.meta.env.BASE_URL === '/' ? '/' : import.meta.env.BASE_URL.replace(/\/$/, '')

export const router = createRouter({ routeTree, basepath })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
