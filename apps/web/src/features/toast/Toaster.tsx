import { XIcon } from 'lucide-react'
import { useLocation } from '@tanstack/react-router'
import { useSyncExternalStore } from 'react'

import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { toast, type ToastMessage } from './toast-store'

export function Toaster() {
  const location = useLocation()
  const toasts = useSyncExternalStore(toast.subscribe, toast.getSnapshot, toast.getSnapshot)

  if (location.pathname === '/setup' || toasts.length === 0) {
    return null
  }

  return (
    <div
      className="fixed right-3 top-3 z-80 grid w-[min(24rem,calc(100vw-1.5rem))] gap-2 sm:right-5 sm:top-5"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((toastMessage) => (
        <ToastItem key={toastMessage.id} toastMessage={toastMessage} />
      ))}
    </div>
  )
}

function ToastItem({ toastMessage }: { toastMessage: ToastMessage }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-card p-3 text-card-foreground shadow-xl shadow-foreground/10',
        toastMessage.tone === 'error' &&
          'border-destructive/35 bg-[oklch(0.985_0.012_27)] text-foreground',
        toastMessage.tone === 'success' &&
          'border-[oklch(0.58_0.13_145/35%)] bg-[oklch(0.985_0.016_145)] text-foreground',
      )}
    >
      <div
        className={cn(
          'size-2 shrink-0 rounded-full',
          toastMessage.tone === 'success' ? 'bg-[oklch(0.58_0.13_145)]' : 'bg-destructive',
        )}
        aria-hidden="true"
      />
      <p className="min-w-0 flex-1 text-sm font-semibold leading-5">{toastMessage.message}</p>
      <button
        type="button"
        className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => toast.dismiss(toastMessage.id)}
        aria-label={m.toast_dismiss()}
      >
        <XIcon className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
