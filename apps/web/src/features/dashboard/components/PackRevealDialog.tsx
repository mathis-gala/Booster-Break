import { ArrowLeftIcon, ArrowRightIcon, SparklesIcon, XIcon } from 'lucide-react'
import type { OpenPackResponse } from '@tcg-collection/shared'

import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'
import { FoilCardImage } from './FoilCardImage'

interface PackRevealDialogProps {
  openPackResult: OpenPackResponse
  revealedCardIndex: number
  maxRevealedCardIndex: number
  onClose: () => void
  onRevealCardIndexChange: (index: number) => void
  resultLabel?: string
}

export function PackRevealDialog({
  openPackResult,
  revealedCardIndex,
  maxRevealedCardIndex,
  onClose,
  onRevealCardIndexChange,
  resultLabel,
}: PackRevealDialogProps) {
  const currentRevealCard = openPackResult.cards[revealedCardIndex]
  const currentRevealImageUrl = currentRevealCard?.imageLarge ?? currentRevealCard?.imageSmall
  const revealedCards = openPackResult.cards.slice(0, maxRevealedCardIndex + 1)
  const isFirstRevealCard = revealedCardIndex === 0
  const isLastRevealCard = revealedCardIndex === openPackResult.cards.length - 1

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/72 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pack-reveal-title"
    >
      <div className="max-h-[min(96dvh,64rem)] w-[min(50rem,calc(100vw-1.5rem))] overflow-y-auto overflow-x-hidden rounded-lg border bg-background p-4 pb-6 text-foreground shadow-2xl sm:w-[min(50rem,calc(100vw-2rem))] md:p-6 md:pb-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 id="pack-reveal-title" className="text-lg font-black">
              {m.packs_pulls_title({ set: openPackResult.set.name })}
            </h3>
            <p className="text-sm font-semibold text-muted-foreground">
              {resultLabel ?? m.packs_added_to_collection()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SparklesIcon className="text-muted-foreground" aria-hidden="true" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onClose}
              aria-label={m.packs_close_reveal()}
            >
              <XIcon aria-hidden="true" />
            </Button>
          </div>
        </div>

        {currentRevealCard ? (
          <div className="grid justify-items-center gap-4">
            <div
              key={`${openPackResult.openingId}-${currentRevealCard.id}-${revealedCardIndex}`}
              className="relative flex aspect-[63/88] w-full max-w-[24rem] animate-[pack-card-reveal_720ms_cubic-bezier(0.22,1,0.36,1)_both] items-center justify-center justify-self-center will-change-transform"
            >
              {currentRevealImageUrl ? (
                <FoilCardImage
                  src={currentRevealImageUrl}
                  alt={currentRevealCard.name}
                  finish={currentRevealCard.finish}
                  className="size-full rounded-lg object-contain drop-shadow-2xl"
                />
              ) : (
                <div className="size-full rounded-lg bg-muted" aria-hidden="true" />
              )}
            </div>

            <RevealNavigation
              cardCount={openPackResult.cards.length}
              isFirst={isFirstRevealCard}
              isLast={isLastRevealCard}
              revealedCardIndex={revealedCardIndex}
              onClose={onClose}
              onRevealCardIndexChange={onRevealCardIndexChange}
            />

            <RevealThumbnails
              cards={revealedCards}
              openingId={openPackResult.openingId}
              revealedCardIndex={revealedCardIndex}
              onRevealCardIndexChange={onRevealCardIndexChange}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

interface RevealNavigationProps {
  cardCount: number
  isFirst: boolean
  isLast: boolean
  revealedCardIndex: number
  onClose: () => void
  onRevealCardIndexChange: (index: number) => void
}

function RevealNavigation({
  cardCount,
  isFirst,
  isLast,
  revealedCardIndex,
  onClose,
  onRevealCardIndexChange,
}: RevealNavigationProps) {
  return (
    <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-3">
      <Button
        type="button"
        variant="outline"
        className="h-11 justify-self-start"
        disabled={isFirst}
        onClick={() => onRevealCardIndexChange(Math.max(revealedCardIndex - 1, 0))}
      >
        <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
        {m.packs_previous()}
      </Button>
      <p className="text-sm font-black tabular-nums text-muted-foreground">
        {revealedCardIndex + 1} / {cardCount}
      </p>
      {isLast ? (
        <Button type="button" className="h-11 justify-self-end" onClick={onClose}>
          {m.packs_done()}
        </Button>
      ) : (
        <Button
          type="button"
          className="h-11 justify-self-end"
          onClick={() => onRevealCardIndexChange(Math.min(revealedCardIndex + 1, cardCount - 1))}
        >
          {m.packs_next()}
          <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
        </Button>
      )}
    </div>
  )
}

interface RevealThumbnailsProps {
  cards: OpenPackResponse['cards']
  openingId: string
  revealedCardIndex: number
  onRevealCardIndexChange: (index: number) => void
}

function RevealThumbnails({
  cards,
  openingId,
  revealedCardIndex,
  onRevealCardIndexChange,
}: RevealThumbnailsProps) {
  return (
    <div className="flex w-full flex-wrap justify-center gap-2">
      {cards.map((card, index) => (
        <button
          key={`${openingId}-${card.id}-${index}-thumb`}
          type="button"
          className="w-14 rounded-md border bg-card p-1 opacity-80 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:opacity-100 aria-pressed:ring-2 aria-pressed:ring-ring"
          aria-pressed={index === revealedCardIndex}
          onClick={() => onRevealCardIndexChange(index)}
          aria-label={m.packs_view_card_aria({ name: card.name })}
        >
          {card.imageSmall ? (
            <FoilCardImage
              src={card.imageSmall}
              alt=""
              finish={card.finish}
              className="aspect-[63/88] w-full rounded-sm object-cover"
            />
          ) : (
            <span className="block aspect-[63/88] rounded-sm bg-muted" aria-hidden="true" />
          )}
        </button>
      ))}
    </div>
  )
}
