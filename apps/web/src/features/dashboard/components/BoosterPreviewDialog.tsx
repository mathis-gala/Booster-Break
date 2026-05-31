import { useMemo, useState } from 'react'
import { XIcon } from 'lucide-react'
import type { PokemonCardSummary, PokemonSetSummary } from '@tcg-collection/shared'

import { Button } from '@/components/ui/button'
import { formatRarity } from '@/features/i18n/rarity-labels'
import { groupCardsByRarity, getRarityChanceLabel } from '../lib/pack-rarity'
import { m } from '@/paraglide/messages'
import { CardImageDialog } from './CardImageDialog'

interface BoosterPreviewDialogProps {
  cards: PokemonCardSummary[]
  isPending: boolean
  onClose: () => void
  set: PokemonSetSummary
  showRarityChanceLabels?: boolean
}

export function BoosterPreviewDialog({
  cards,
  isPending,
  onClose,
  set,
  showRarityChanceLabels = true,
}: BoosterPreviewDialogProps) {
  const [selectedPreviewCard, setSelectedPreviewCard] = useState<PokemonCardSummary>()
  const previewCardsByRarity = useMemo(() => groupCardsByRarity(cards), [cards])

  function closePreview() {
    setSelectedPreviewCard(undefined)
    onClose()
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/72 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booster-preview-title"
        onClick={closePreview}
      >
        <div
          className="max-h-[min(92vh,54rem)] w-[min(58rem,100%)] overflow-y-auto rounded-lg border bg-background p-4 text-foreground shadow-2xl md:p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 id="booster-preview-title" className="text-lg font-black">
                {m.packs_preview_title({ set: set.name })}
              </h3>
              <p className="text-sm font-semibold text-muted-foreground">
                {m.packs_sorted_by_rarity()}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={closePreview}
              aria-label={m.packs_close_preview()}
            >
              <XIcon aria-hidden="true" />
            </Button>
          </div>

          {isPending ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-44 rounded-lg bg-muted" />
              ))}
            </div>
          ) : (
            <div className="grid gap-5">
              {previewCardsByRarity.map(([rarity, rarityCards]) => (
                <section key={rarity} className="grid gap-2">
                  <h4 className="text-sm font-black">
                    {formatRarity(rarity)}
                    {showRarityChanceLabels ? (
                      <span className="ml-2 text-xs font-black text-muted-foreground">
                        {getRarityChanceLabel(rarity, cards)}
                      </span>
                    ) : null}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {rarityCards.map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        className="w-20 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => setSelectedPreviewCard(card)}
                        aria-label={m.packs_view_card_aria({ name: card.name })}
                      >
                        {card.imageSmall ? (
                          <img
                            src={card.imageSmall}
                            alt={card.name}
                            className="aspect-[63/88] w-full rounded-md object-cover shadow-sm transition-transform hover:-translate-y-0.5"
                          />
                        ) : (
                          <div className="aspect-[63/88] rounded-md bg-muted" aria-hidden="true" />
                        )}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedPreviewCard ? (
        <CardImageDialog
          card={selectedPreviewCard}
          onClose={() => setSelectedPreviewCard(undefined)}
        />
      ) : null}
    </>
  )
}
