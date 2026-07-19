import { CheckCircle2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'

interface TradeOfferSuccessDialogProps {
  open: boolean
  onClose: () => void
}

export function TradeOfferSuccessDialog({ open, onClose }: TradeOfferSuccessDialogProps) {
  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-cyan-950/78 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={m.trade_offer_success_title()}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border bg-background p-4 shadow-2xl"
        onClick={(event) => {
          event.stopPropagation()
        }}
      >
        <div className="flex items-start gap-3">
          <CheckCircle2Icon className="mt-0.5 size-6 shrink-0 text-green-600" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-black">{m.trade_offer_success_title()}</p>
            <p className="mt-1 text-sm text-muted-foreground">{m.trade_offer_success_message()}</p>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="button" onClick={onClose}>
            {m.trade_offer_success_ok()}
          </Button>
        </div>
      </div>
    </div>
  )
}
