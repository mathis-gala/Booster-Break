import { useId, useState, type FormEvent, type MouseEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LogInIcon, LogOutIcon, UserIcon } from 'lucide-react'
import type { AuthMeResponse } from '@tcg-collection/shared'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from '@/features/toast/toast-store'
import { useDevLoginMutationOption } from '@/lib/mutations/auth'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { fetchAuthProviders, fetchHealth, getApiUrl } from '../lib/api'
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
  const authProviders = useQuery({
    queryKey: ['auth', 'providers'],
    queryFn: fetchAuthProviders,
    enabled: !auth?.authenticated,
    retry: false,
    staleTime: Infinity,
  })

  const handleOAuthSignIn = async (provider: 'slack' | 'github') => {
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
    if (authProviders.data?.developmentAuthEnabled) {
      return <DevelopmentAuthForm className={className} />
    }

    return (
      <SignInDialog
        className={className}
        onSignIn={handleOAuthSignIn}
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

interface SignInDialogProps {
  className?: string
  isStartingSignIn: boolean
  onSignIn: (provider: 'slack' | 'github') => void | Promise<void>
}

function SignInDialog({ className, isStartingSignIn, onSignIn }: SignInDialogProps) {
  const handleSlackSignInClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    void onSignIn('slack')
  }

  const handleGithubSignInClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    void onSignIn('github')
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            size="lg"
            className={cn(
              'h-11 w-full bg-sidebar-accent text-sm font-black text-sidebar-accent-foreground hover:bg-sidebar-accent/90',
              className,
            )}
          />
        }
      >
        {m.auth_open_sign_in()}
      </DialogTrigger>
      <DialogContent closeLabel={m.auth_close_sign_in()} className="gap-5 p-5 sm:max-w-xl sm:p-6">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-xl font-black">{m.auth_sign_in()}</DialogTitle>
          <DialogDescription>{m.auth_choose_provider()}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href={getApiUrl('/auth/slack/start')}
            onClick={handleSlackSignInClick}
            aria-disabled={isStartingSignIn}
            className="group flex min-h-44 cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-5 text-center text-card-foreground shadow-sm transition-[transform,box-shadow,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:border-foreground/25 hover:bg-muted/45 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-0 aria-disabled:pointer-events-none aria-disabled:opacity-60 motion-reduce:transform-none motion-reduce:transition-none"
          >
            <span className="flex size-20 items-center justify-center rounded-xl bg-background ring-1 ring-border transition-transform duration-200 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none">
              <SlackIcon className="size-14" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-base font-black">Slack</span>
              <span className="text-xs font-semibold text-muted-foreground">
                {isStartingSignIn ? m.auth_signing_in() : m.auth_sign_in_slack()}
              </span>
            </span>
          </a>
          <a
            href={getApiUrl('/auth/github/start')}
            onClick={handleGithubSignInClick}
            aria-disabled={isStartingSignIn}
            className="group flex min-h-44 cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-5 text-center text-card-foreground shadow-sm transition-[transform,box-shadow,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:border-foreground/25 hover:bg-muted/45 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-0 aria-disabled:pointer-events-none aria-disabled:opacity-60 motion-reduce:transform-none motion-reduce:transition-none"
          >
            <span className="flex size-20 items-center justify-center rounded-xl bg-background ring-1 ring-border transition-transform duration-200 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none">
              <GithubIcon className="size-14" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-base font-black">GitHub</span>
              <span className="text-xs font-semibold text-muted-foreground">
                {isStartingSignIn ? m.auth_signing_in() : m.auth_sign_in_github()}
              </span>
            </span>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  )
}
