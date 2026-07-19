import { Link, useLocation } from '@tanstack/react-router'
import { RefreshCwIcon, ServerOffIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { Button, buttonVariants } from '@/components/ui/button'
import { LanguageSelector } from '@/features/dashboard/components/LanguageSelector'
import { useLocale } from '@/features/i18n/useLocale'
import { useHealthQueryOption } from '@/lib/queries/health'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'

export function ServerStatusGate() {
  useLocale()
  const location = useLocation()
  const health = useQuery(useHealthQueryOption(location.pathname !== '/setup'))

  if (location.pathname === '/setup' || !health.isError) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-90 flex items-center justify-center bg-cyan-950/70 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="server-status-title"
      aria-describedby="server-status-description"
    >
      <div className="w-full max-w-md rounded-lg border bg-card p-5 text-card-foreground shadow-2xl">
        <div className="grid gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
              <ServerOffIcon className="size-5" aria-hidden="true" />
            </div>
            <LanguageSelector
              className="w-28 shrink-0"
              contentClassName="z-[120]"
              density="compact"
              positionerClassName="z-[120]"
              variant="surface"
            />
          </div>

          <div>
            <h1 id="server-status-title" className="text-lg font-black">
              {m.server_down_title()}
            </h1>
            <p
              id="server-status-description"
              className="mt-2 text-sm leading-6 text-muted-foreground"
            >
              {m.server_down_description()}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="h-11 flex-1"
            onClick={() => health.refetch()}
            disabled={health.isFetching}
          >
            <RefreshCwIcon data-icon="inline-start" aria-hidden="true" />
            {health.isFetching ? m.server_down_checking() : m.server_down_refresh()}
          </Button>
          <Link to="/setup" className={cn(buttonVariants({ variant: 'outline' }), 'h-11 flex-1')}>
            {m.server_down_setup_link()}
          </Link>
        </div>
      </div>
    </div>
  )
}
