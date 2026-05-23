import { useState, type MouseEvent } from 'react'
import { LogOutIcon, UserIcon } from 'lucide-react'
import type { AuthMeResponse } from '@tcg-collection/shared'

import { toast } from '@/features/toast/toast-store'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { fetchHealth, getApiUrl } from '../lib/api'
import { SlackIcon } from './SlackIcon'

interface AuthNavCardProps {
  auth?: AuthMeResponse
  isPending: boolean
  onLogout: () => void
  isLoggingOut: boolean
  className?: string
}

export function AuthNavCard({
  auth,
  isPending,
  onLogout,
  isLoggingOut,
  className,
}: AuthNavCardProps) {
  const [isStartingSignIn, setIsStartingSignIn] = useState(false)

  const handleSlackSignInClick = async (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()

    if (isStartingSignIn) {
      return
    }

    setIsStartingSignIn(true)

    try {
      await fetchHealth()
      window.location.assign(getApiUrl('/auth/slack/start'))
    } catch {
      toast.show(m.api_unable_reach())
      setIsStartingSignIn(false)
    }
  }

  if (isPending) {
    return (
      <div
        className={cn(
          'rounded-lg border border-sidebar-accent/24 bg-sidebar-accent/10 p-2.5',
          className,
        )}
      >
        <div className="h-3 w-20 rounded-full bg-sidebar-foreground/18" />
        <div className="mt-2 h-8 rounded-lg bg-sidebar-foreground/12" />
      </div>
    )
  }

  if (!auth?.authenticated) {
    return (
      <a
        href={getApiUrl('/auth/slack/start')}
        onClick={handleSlackSignInClick}
        aria-disabled={isStartingSignIn}
        className={cn(
          'flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-sidebar-accent px-3 text-sm font-black text-sidebar-accent-foreground transition-colors hover:bg-sidebar-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring aria-disabled:pointer-events-none aria-disabled:opacity-70',
          className,
        )}
      >
        <SlackIcon className="size-4" />
        {isStartingSignIn ? m.auth_signing_in() : m.auth_sign_in_slack()}
      </a>
    )
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-sidebar-accent/24 bg-sidebar-accent/10 p-2.5',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {auth.user.avatarUrl ? (
          <img
            src={auth.user.avatarUrl}
            alt=""
            className="size-9 shrink-0 rounded-lg object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
            <UserIcon className="size-4" aria-hidden="true" />
          </div>
        )}

        <div className="min-w-0">
          <p className="truncate text-sm font-black">{auth.user.displayName ?? auth.user.pseudo}</p>
          <p className="truncate text-xs font-medium text-sidebar-foreground/70">
            {m.auth_slack_player()}
          </p>
        </div>
      </div>

      <button
        type="button"
        className="mt-2 flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg text-xs font-bold text-sidebar-foreground/82 transition-colors hover:bg-sidebar-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring disabled:cursor-not-allowed disabled:opacity-60"
        onClick={onLogout}
        disabled={isLoggingOut}
      >
        <LogOutIcon className="size-3.5" aria-hidden="true" />
        {isLoggingOut ? m.auth_signing_out() : m.auth_sign_out()}
      </button>
    </div>
  )
}
