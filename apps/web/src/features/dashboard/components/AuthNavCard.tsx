import { useId, useState, type FormEvent, type MouseEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDownIcon, LogInIcon, LogOutIcon, UserIcon } from 'lucide-react'
import type { AuthMeResponse } from '@tcg-collection/shared'

import { toast } from '@/features/toast/toast-store'
import { useDevLoginMutationOption } from '@/lib/mutations/auth'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { fetchHealth, getApiUrl } from '../lib/api'
import { GithubIcon } from './GithubIcon'
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

  const handleOAuthSignInClick = async (
    event: MouseEvent<HTMLAnchorElement>,
    provider: 'slack' | 'github',
  ) => {
    event.preventDefault()

    if (isStartingSignIn) {
      return
    }

    setIsStartingSignIn(true)

    try {
      await fetchHealth()
      window.location.assign(getApiUrl(`/auth/${provider}/start`))
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
    if (isDevelopmentAuthVisible) {
      return <DevelopmentAuthForm className={className} />
    }

    return (
      <SignInProviderSelect
        className={className}
        onSignIn={handleOAuthSignInClick}
        isStartingSignIn={isStartingSignIn}
      />
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
            {m.auth_player()}
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

function DevelopmentAuthForm({ className }: { className?: string }) {
  const [devPseudo, setDevPseudo] = useState('')
  const devPseudoInputId = useId()
  const queryClient = useQueryClient()
  const devLoginMutation = useMutation(useDevLoginMutationOption(queryClient))

  const handleDevLoginSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const pseudo = devPseudo.trim()

    if (!pseudo || devLoginMutation.isPending) {
      return
    }

    devLoginMutation.mutate(pseudo, {
      onError: () => {
        toast.show(m.auth_dev_login_failed())
      },
      onSuccess: () => {
        setDevPseudo('')
      },
    })
  }

  return (
    <form
      className={cn(
        'grid gap-2 rounded-lg border border-sidebar-accent/24 bg-sidebar-accent/10 p-2.5',
        className,
      )}
      onSubmit={handleDevLoginSubmit}
    >
      <label htmlFor={devPseudoInputId} className="text-xs font-black text-sidebar-foreground">
        {m.auth_dev_pseudo_label()}
      </label>
      <input
        id={devPseudoInputId}
        type="text"
        value={devPseudo}
        placeholder={m.auth_dev_pseudo_placeholder()}
        autoComplete="nickname"
        autoCapitalize="none"
        className="h-9 min-w-0 rounded-lg border border-sidebar-accent/24 bg-sidebar px-2.5 text-sm font-semibold text-sidebar-foreground outline-none placeholder:text-sidebar-foreground/45 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        disabled={devLoginMutation.isPending}
        onChange={(event) => setDevPseudo(event.target.value)}
      />
      <button
        type="submit"
        className="flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-sidebar-accent px-3 text-sm font-black text-sidebar-accent-foreground transition-colors hover:bg-sidebar-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!devPseudo.trim() || devLoginMutation.isPending}
      >
        <LogInIcon className="size-4" aria-hidden="true" />
        {devLoginMutation.isPending ? m.auth_dev_logging_in() : m.auth_dev_login()}
      </button>
    </form>
  )
}

interface SignInProviderSelectProps {
  className?: string
  isStartingSignIn: boolean
  onSignIn: (
    event: MouseEvent<HTMLAnchorElement>,
    provider: 'slack' | 'github',
  ) => void | Promise<void>
}

function SignInProviderSelect({
  className,
  isStartingSignIn,
  onSignIn,
}: SignInProviderSelectProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <a
        href={getApiUrl('/auth/slack/start')}
        onClick={(event) => onSignIn(event, 'slack')}
        aria-disabled={isStartingSignIn}
        className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-sidebar-accent px-3 text-sm font-black text-sidebar-accent-foreground transition-colors hover:bg-sidebar-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring aria-disabled:pointer-events-none aria-disabled:opacity-70"
      >
        <SlackIcon className="size-4" />
        {isStartingSignIn ? m.auth_signing_in() : m.auth_sign_in_slack()}
      </a>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        disabled={isStartingSignIn}
        className="flex h-8 w-full cursor-pointer items-center justify-center gap-1 text-xs font-bold text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring disabled:cursor-not-allowed disabled:opacity-60"
      >
        {m.auth_sign_in_other()}
        <ChevronDownIcon
          className={cn('size-3.5 transition-transform', isOpen && 'rotate-180')}
          aria-hidden="true"
        />
      </button>
      {isOpen ? (
        <a
          href={getApiUrl('/auth/github/start')}
          onClick={(event) => onSignIn(event, 'github')}
          aria-disabled={isStartingSignIn}
          className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-sidebar-accent/24 bg-sidebar-accent/10 px-3 text-sm font-black text-sidebar-foreground transition-colors hover:bg-sidebar-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring aria-disabled:pointer-events-none aria-disabled:opacity-70"
        >
          <GithubIcon className="size-4" />
          {m.auth_sign_in_github()}
        </a>
      ) : null}
    </div>
  )
}

const isDevelopmentAuthVisible = import.meta.env.DEV
