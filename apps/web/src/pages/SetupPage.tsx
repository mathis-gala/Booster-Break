import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon, CheckCircle2Icon, CopyIcon, ServerIcon } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { LanguageSelector } from '@/features/dashboard/components/LanguageSelector'
import { useLocale } from '@/features/i18n/useLocale'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'

const commands = [
  'cp apps/api/.env.example apps/api/.env.local',
  'docker compose up -d postgres api',
  'bun run dev:web',
]

export function SetupPage() {
  useLocale()

  return (
    <main className="min-h-dvh bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto grid w-full max-w-4xl gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className={cn(buttonVariants({ variant: 'outline' }), 'w-fit')}>
            <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
            {m.setup_back()}
          </Link>
          <LanguageSelector className="w-full sm:w-44" variant="surface" />
        </div>

        <section className="rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">
              <ServerIcon className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-black">{m.setup_title()}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {m.setup_description()}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 rounded-lg border bg-card p-5 text-card-foreground">
          <h2 className="text-base font-black">{m.setup_local_title()}</h2>
          <p className="text-sm leading-6 text-muted-foreground">{m.setup_local_description()}</p>
          <div className="grid gap-2">
            {commands.map((command) => (
              <code
                key={command}
                className="flex items-center gap-2 overflow-x-auto rounded-md border bg-background px-3 py-2 text-sm font-bold"
              >
                <CopyIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {command}
              </code>
            ))}
          </div>
        </section>

        <section className="grid gap-3 rounded-lg border bg-card p-5 text-card-foreground">
          <h2 className="text-base font-black">{m.setup_credentials_title()}</h2>
          <SetupPoint text={m.setup_credentials_env()} />
          <SetupPoint text={m.setup_credentials_docker()} />
          <SetupPoint text={m.setup_credentials_production()} />
        </section>
      </div>
    </main>
  )
}

function SetupPoint({ text }: { text: string }) {
  return (
    <div className="flex gap-2 text-sm leading-6 text-muted-foreground">
      <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden="true" />
      <p>{text}</p>
    </div>
  )
}
