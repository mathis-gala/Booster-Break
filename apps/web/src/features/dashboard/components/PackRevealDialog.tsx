import { useState } from 'react'
import { ArrowLeftIcon, ArrowRightIcon, SparklesIcon, XIcon } from 'lucide-react'
import type { OpenPackResponse } from '@tcg-collection/shared'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { CardImageDialog } from './CardImageDialog'
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
  const [selectedPreviewCard, setSelectedPreviewCard] =
    useState<OpenPackResponse['cards'][number]>()
  const currentRevealCard = openPackResult.cards[revealedCardIndex]
  const currentRevealImageUrl = currentRevealCard?.imageLarge ?? currentRevealCard?.imageSmall
  const revealedCards = openPackResult.cards.slice(0, maxRevealedCardIndex + 1)
  const isFirstRevealCard = revealedCardIndex === 0
  const isLastRevealCard = revealedCardIndex === openPackResult.cards.length - 1
  const newCardCount = revealedCards.filter((card) => card.isNew).length
  const isGodPack = openPackResult.isGodPack
  const subtitle =
    resultLabel ??
    (isGodPack
      ? m.packs_god_pack_subtitle()
      : newCardCount > 0
        ? m.packs_new_cards_count({ count: newCardCount })
        : m.packs_added_to_collection())

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-cyan-950/72 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pack-reveal-title"
    >
      <div
        className={cn(
          'max-h-[min(96dvh,64rem)] w-[min(50rem,calc(100vw-1.5rem))] overflow-y-auto overflow-x-hidden rounded-lg border bg-background p-4 pb-6 text-foreground shadow-2xl sm:w-[min(50rem,calc(100vw-2rem))] md:p-6 md:pb-8',
          isGodPack &&
            'god-pack-aura border-amber-400/70 bg-linear-to-b from-amber-50/80 to-background dark:from-amber-950/40',
        )}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 id="pack-reveal-title" className="text-lg font-black">
                {m.packs_pulls_title({ set: openPackResult.set.name })}
              </h3>
            </div>
            <p
              className={cn(
                'text-sm font-semibold text-muted-foreground',
                isGodPack && 'text-amber-600 dark:text-amber-400',
              )}
            >
              {subtitle}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SparklesIcon
              className={isGodPack ? 'text-amber-400' : 'text-muted-foreground'}
              aria-hidden="true"
            />
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
              className="relative flex aspect-63/88 w-full max-w-[24rem] animate-[pack-card-reveal_720ms_cubic-bezier(0.22,1,0.36,1)_both] items-center justify-center justify-self-center will-change-transform motion-reduce:animate-none"
            >
              {currentRevealCard.isNew ? (
                <span className="new-card-badge-pulse absolute bottom-full left-0 right-0 z-10 mx-auto mb-1.5 flex w-fit max-w-[90%] items-center gap-1 whitespace-nowrap rounded-full bg-amber-400 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-950 shadow-[0_8px_20px_-6px_rgba(245,158,11,0.55)] animate-[new-card-badge_620ms_cubic-bezier(0.34,1.56,0.64,1)_both] sm:mb-2 sm:gap-1.5 sm:px-4 sm:py-1.5 sm:text-sm">
                  <SparklesIcon className="size-3.5 shrink-0 sm:size-4" aria-hidden="true" />
                  {m.packs_card_new()}
                </span>
              ) : null}
              {currentRevealImageUrl ? (
                <button
                  type="button"
                  className="size-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setSelectedPreviewCard(currentRevealCard)}
                  aria-label={m.packs_view_card_aria({ name: currentRevealCard.name })}
                >
                  <FoilCardImage
                    src={currentRevealImageUrl}
                    alt={currentRevealCard.name}
                    finish={currentRevealCard.finish}
                    className="size-full rounded-lg object-contain drop-shadow-2xl"
                  />
                </button>
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
      {selectedPreviewCard ? (
        <CardImageDialog
          card={selectedPreviewCard}
          onClose={() => setSelectedPreviewCard(undefined)}
        />
      ) : null}
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
          className="relative w-14 rounded-md border bg-card p-1 opacity-80 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:opacity-100 aria-pressed:ring-2 aria-pressed:ring-ring"
          aria-pressed={index === revealedCardIndex}
          onClick={() => onRevealCardIndexChange(index)}
          aria-label={m.packs_view_card_aria({ name: card.name })}
        >
          {card.imageSmall ? (
            <FoilCardImage
              src={card.imageSmall}
              alt=""
              finish={card.finish}
              className="aspect-63/88 w-full rounded-sm object-cover"
            />
          ) : (
            <span className="block aspect-63/88 rounded-sm bg-muted" aria-hidden="true" />
          )}
          {card.isNew ? (
            <span
              className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow"
              title={m.packs_card_new()}
            >
              <SparklesIcon className="size-2.5" aria-hidden="true" />
              <span className="sr-only">{m.packs_card_new()}</span>
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}
