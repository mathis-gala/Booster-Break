import { formatCardFinish } from '@/features/dashboard/lib/card-format'
import { m } from '@/paraglide/messages'

interface TradeOfferComposerPreviewSectionProps {
  selectedEntries: {
    cardId: string
    finish: string
    quantity: number
    available: number
    name: string
    imageSmall?: string
  }[]
}

export function TradeOfferComposerPreviewSection({
  selectedEntries,
}: TradeOfferComposerPreviewSectionProps) {
  return (
    <div className="mt-4 space-y-2">
      <p className="text-sm font-black">{m.trade_offer_preview_title()}</p>
      {selectedEntries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{m.trade_offer_no_selected()}</p>
      ) : (
        <div className="grid gap-2">
          {selectedEntries.map((card) => (
            <div
              key={`${card.cardId}-${card.finish}`}
              className="flex items-center gap-2 rounded-md bg-background p-2"
            >
              {card.imageSmall ? (
                <img
                  src={card.imageSmall}
                  alt={card.name}
                  className="size-8 rounded-sm object-cover"
                />
              ) : (
                <div className="size-8 rounded-sm bg-muted" aria-hidden="true" />
              )}
              <p className="min-w-0 text-sm font-semibold">
                <span className="truncate">{card.name}</span>
                <span className="ml-1 text-muted-foreground">{formatCardFinish(card.finish)}</span>
              </p>
              <p className="ml-auto text-sm font-black tabular-nums">
                x {card.quantity} / {card.available}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
