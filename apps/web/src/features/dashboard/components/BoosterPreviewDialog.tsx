import { useMemo, useState } from 'react'
import { SparklesIcon, XIcon } from 'lucide-react'
import type { PokemonCardSummary, PokemonSetSummary } from '@tcg-collection/shared'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
  ownedCardIds?: ReadonlySet<string>
}

export function BoosterPreviewDialog({
  cards,
  isPending,
  onClose,
  set,
  showRarityChanceLabels = true,
  ownedCardIds,
}: BoosterPreviewDialogProps) {
  const [selectedPreviewCard, setSelectedPreviewCard] = useState<PokemonCardSummary>()
  const [highlightOwned, setHighlightOwned] = useState(false)
  const previewCardsByRarity = useMemo(() => groupCardsByRarity(cards), [cards])
  const canHighlightOwned = Boolean(ownedCardIds) && cards.length > 0
  const ownedCount = useMemo(
    () => (ownedCardIds ? cards.filter((card) => ownedCardIds.has(card.id)).length : 0),
    [cards, ownedCardIds],
  )

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
                {highlightOwned && canHighlightOwned
                  ? m.packs_owned_summary({ owned: ownedCount, total: cards.length })
                  : m.packs_sorted_by_rarity()}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {canHighlightOwned ? (
                <Button
                  type="button"
                  variant={highlightOwned ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setHighlightOwned((value) => !value)}
                  aria-pressed={highlightOwned}
                >
                  <SparklesIcon className="size-4" aria-hidden="true" />
                  {highlightOwned ? m.packs_owned_highlight_on() : m.packs_owned_highlight_off()}
                </Button>
              ) : null}
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
                    {rarityCards.map((card) => {
                      const isOwned = ownedCardIds?.has(card.id) ?? false
                      const isDimmed = highlightOwned && canHighlightOwned && !isOwned

                      return (
                        <button
                          key={card.id}
                          type="button"
                          className="group relative w-20 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => setSelectedPreviewCard(card)}
                          aria-label={m.packs_view_card_aria({ name: card.name })}
                        >
                          {card.imageSmall ? (
                            <img
                              src={card.imageSmall}
                              alt={card.name}
                              className={cn(
                                'aspect-[63/88] w-full rounded-md object-cover shadow-sm transition-all group-hover:-translate-y-0.5',
                                isDimmed && 'opacity-35 grayscale',
                              )}
                            />
                          ) : (
                            <div
                              className={cn(
                                'aspect-[63/88] rounded-md bg-muted',
                                isDimmed && 'opacity-35',
                              )}
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      )
                    })}
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
