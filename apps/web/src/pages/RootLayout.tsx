import { Outlet } from '@tanstack/react-router'

import { ServerStatusGate } from '@/features/server-status/ServerStatusGate'
import { Toaster } from '@/features/toast/Toaster'

export function RootLayout() {
  return (
    <>
      <Outlet />
      <ServerStatusGate />
      <Toaster />
    </>
  )
}
