import { useState } from 'react'
import { CardImageDialog } from '@/features/dashboard/components/CardImageDialog'
import { FoilCardImage } from '@/features/dashboard/components/FoilCardImage'
import type { UserCollectionCard } from '@tcg-collection/shared'
import { m } from '@/paraglide/messages'

interface TradeOfferComposerPreviewSectionProps {
  selectedEntries: {
    card: UserCollectionCard
    quantity: number
  }[]
}

export function TradeOfferComposerPreviewSection({
  selectedEntries,
}: TradeOfferComposerPreviewSectionProps) {
  const [selectedPreviewCard, setSelectedPreviewCard] = useState<UserCollectionCard | null>(null)

  return (
    <div className="mt-4 space-y-2">
      <p className="text-sm font-black">{m.trade_offer_preview_title()}</p>
      {selectedEntries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{m.trade_offer_no_selected()}</p>
      ) : (
        <div className="inline-flex flex-wrap items-center justify-center gap-3 text-center">
          {selectedEntries.map((card) => (
            <button
              key={`${card.card.id}-${card.card.finish}`}
              type="button"
              className="inline-flex w-48 shrink-0 cursor-pointer flex-col items-center gap-1 rounded-lg bg-card px-3 py-3 text-center"
              onClick={() => {
                setSelectedPreviewCard(card.card)
              }}
            >
              {card.card.imageSmall ? (
                <FoilCardImage
                  src={card.card.imageSmall}
                  alt={card.card.name}
                  finish={card.card.finish}
                  className="aspect-[63/88] w-32 rounded-md"
                />
              ) : (
                <div className="aspect-[63/88] w-32 rounded-md bg-muted" aria-hidden="true" />
              )}
              <p className="mt-1 max-w-full truncate text-sm font-black">{card.card.name}</p>
              <p className="text-sm font-black text-muted-foreground">x {card.quantity}</p>
              <p className="text-sm text-muted-foreground">
                {card.card.supertype ?? m.trade_other_type()}
              </p>
            </button>
          ))}
        </div>
      )}

      {selectedPreviewCard ? (
        <CardImageDialog
          card={selectedPreviewCard}
          onClose={() => {
            setSelectedPreviewCard(null)
          }}
        />
      ) : null}
    </div>
  )
}
