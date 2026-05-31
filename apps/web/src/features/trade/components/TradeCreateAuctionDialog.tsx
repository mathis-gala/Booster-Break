import type { AuthMeResponse, SupportedLocale } from '@tcg-collection/shared'
import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'
import { TradeCreateAuctionPanel } from './TradeCreateAuctionPanel'

interface TradeCreateAuctionDialogProps {
  open: boolean
  locale: SupportedLocale
  auth: AuthMeResponse
  activeAuctions: number
  onClose: () => void
  onAuctionCreated: () => void
}

export function TradeCreateAuctionDialog({
  open,
  locale,
  auth,
  activeAuctions,
  onClose,
  onAuctionCreated,
}: TradeCreateAuctionDialogProps) {
  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/78 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={m.trade_create_auction()}
      onClick={onClose}
    >
      <div
        className="max-h-[92dvh] w-[min(56rem,calc(100vw-1.5rem))] overflow-y-auto overflow-x-hidden rounded-lg border bg-background p-4 text-foreground shadow-2xl sm:p-6"
        onClick={(event) => {
          event.stopPropagation()
        }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-black uppercase tracking-wide text-muted-foreground">
            {m.trade_create_auction()}
          </h2>
          <Button type="button" variant="outline" size="icon" onClick={onClose} aria-label={m.trade_cancel()}>
            <XIcon aria-hidden="true" />
          </Button>
        </div>
        <TradeCreateAuctionPanel
          key={`trade-create-${locale}`}
          locale={locale}
          auth={auth}
          activeAuctions={activeAuctions}
          onAuctionCreated={onAuctionCreated}
        />
      </div>
    </div>
  )
}
