import { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import type { OpenPackResponse, OpenedPackCard } from '@tcg-collection/shared'
import { MoveHorizontalIcon, ScissorsIcon, SparklesIcon } from 'lucide-react'
import {
  AnimatePresence,
  animate,
  motion,
  type MotionValue,
  useMotionValue,
  useReducedMotion,
} from 'motion/react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import {
  DEFAULT_CARD_GLOW_COLOR,
  getCachedCardArtworkColor,
  getCardArtworkAverageColor,
} from '../lib/card-art-color'
import { getSwipeDismissDirection } from '../lib/pack-opening-gesture'
import { FoilCardImage } from './FoilCardImage'
import { InteractiveBooster } from './InteractiveBooster'
import { WebGlCardViewer } from './WebGlCardViewer'

type OpeningPhase = 'tear' | 'extract' | 'reveal' | 'recap'

interface PackOpeningExperienceProps {
  openPackResult: OpenPackResponse
  onComplete: () => void
  resultLabel?: string
}

export function PackOpeningExperience({
  openPackResult,
  onComplete,
  resultLabel,
}: PackOpeningExperienceProps) {
  const [phase, setPhase] = useState<OpeningPhase>('tear')
  const [revealedCardIndex, setRevealedCardIndex] = useState(0)
  const [tearProgress, setTearProgress] = useState(0)
  const [sampledGlow, setSampledGlow] = useState<{
    imageUrl: string
    color: string
  }>()
  const shouldReduceMotion = useReducedMotion()
  const currentCard = openPackResult.cards[revealedCardIndex]
  const currentImageUrl = currentCard?.imageLarge ?? currentCard?.imageSmall
  const isGodPack = openPackResult.isGodPack
  const newCardCount = openPackResult.cards.filter((card) => card.isNew).length
  const glowColor = currentImageUrl
    ? (getCachedCardArtworkColor(currentImageUrl) ??
      (sampledGlow?.imageUrl === currentImageUrl ? sampledGlow.color : DEFAULT_CARD_GLOW_COLOR))
    : DEFAULT_CARD_GLOW_COLOR

  useEffect(() => {
    for (const card of openPackResult.cards) {
      const imageUrl = card.imageLarge ?? card.imageSmall
      if (imageUrl) void getCardArtworkAverageColor(imageUrl)
    }
  }, [openPackResult.cards])

  useEffect(() => {
    if (!currentImageUrl) return

    let isCurrent = true
    void getCardArtworkAverageColor(currentImageUrl).then((color) => {
      if (isCurrent) setSampledGlow({ imageUrl: currentImageUrl, color })
    })

    return () => {
      isCurrent = false
    }
  }, [currentImageUrl])
  const handleTearComplete = useCallback(() => {
    setPhase((currentPhase) => (currentPhase === 'tear' ? 'extract' : currentPhase))
  }, [])

  const handleCardDismissed = useCallback(() => {
    if (revealedCardIndex >= openPackResult.cards.length - 1) {
      setPhase('recap')
      return
    }

    setRevealedCardIndex((currentIndex) => currentIndex + 1)
  }, [openPackResult.cards.length, revealedCardIndex])

  const isTearPhase = phase === 'tear'
  const isStackPhase = phase === 'tear' || phase === 'extract' || phase === 'reveal'
  const hintOpacity = Math.max(0, 1 - tearProgress * 2.4)

  return (
    <DialogPrimitive.Root
      open
      modal
      disablePointerDismissal
      onOpenChange={(_open, eventDetails) => eventDetails.cancel()}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Popup
          className={cn(
            'fixed inset-0 z-50 text-white focus:outline-none',
            phase === 'recap' ? 'overflow-y-auto' : 'overflow-hidden',
          )}
        >
          <div
            className="pointer-events-none fixed inset-0 bg-slate-950/80 backdrop-blur-md"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none fixed inset-0 bg-linear-to-b from-slate-950/20 to-slate-950/75"
            aria-hidden="true"
          />
          <AnimatePresence initial={false}>
            <motion.div
              key={`${currentCard?.id ?? openPackResult.set.id}-${glowColor}`}
              className="pointer-events-none fixed inset-0"
              style={{
                backgroundImage: `radial-gradient(circle at 50% 38%, rgb(${glowColor} / 0.3), transparent 44%), radial-gradient(circle at 15% 85%, rgb(${glowColor} / 0.12), transparent 36%)`,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: shouldReduceMotion ? 0.1 : 0.5 }}
              aria-hidden="true"
            />
          </AnimatePresence>

          <DialogPrimitive.Title id="pack-opening-title" className="sr-only">
            {m.packs_pulls_title({ set: openPackResult.set.name })}
          </DialogPrimitive.Title>

          <AnimatePresence>
            {phase === 'tear' || phase === 'extract' ? (
              <motion.div
                key="booster-wrapper"
                className={cn(
                  'fixed inset-0 z-20 flex flex-col items-center justify-center p-4',
                  'will-change-transform',
                  !isTearPhase && 'pointer-events-none',
                )}
                initial={false}
                animate={
                  phase === 'extract'
                    ? {
                        y: shouldReduceMotion ? 0 : '72dvh',
                        rotate: 0,
                        scale: 1,
                        opacity: 0,
                      }
                    : { y: 0, rotate: 0, scale: 1, opacity: 1 }
                }
                transition={
                  shouldReduceMotion
                    ? { duration: 0.12 }
                    : {
                        y: { delay: 0.078, duration: 0.767, ease: [0.32, 0.72, 0, 1] },
                        opacity: { delay: 0.58, duration: 0.27 },
                      }
                }
              >
                <div className="relative aspect-[2.32/4.2] h-[min(84dvh,44rem)] max-w-full">
                  <InteractiveBooster
                    imageUrl={openPackResult.set.boosterImageUrl ?? ''}
                    setName={openPackResult.set.name}
                    canTear
                    onCut={handleTearComplete}
                    onProgressChange={setTearProgress}
                  />
                </div>

                <motion.p
                  className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-white/70"
                  style={{ opacity: hintOpacity }}
                  animate={{ opacity: isTearPhase ? hintOpacity : 0 }}
                >
                  <ScissorsIcon
                    className="size-3.5 animate-pulse motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                  {m.packs_tear_instruction()}
                </motion.p>

                <motion.button
                  type="button"
                  className="mt-2 text-xs font-semibold text-white/45 underline-offset-4 transition hover:text-white/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                  onClick={handleTearComplete}
                  animate={{ opacity: isTearPhase ? 1 : 0 }}
                  tabIndex={isTearPhase ? 0 : -1}
                >
                  {m.packs_tear_skip()}
                </motion.button>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {isStackPhase && currentCard ? (
              <CardStack
                key="opening-card-stack"
                cards={openPackResult.cards}
                currentIndex={revealedCardIndex}
                canInteract={phase === 'reveal'}
                isExtracting={phase === 'extract'}
                isWaitingForTear={phase === 'tear'}
                isGodPack={isGodPack}
                shouldReduceMotion={Boolean(shouldReduceMotion)}
                onExtracted={() =>
                  setPhase((currentPhase) => (currentPhase === 'extract' ? 'reveal' : currentPhase))
                }
                onCardDismissed={handleCardDismissed}
              />
            ) : null}

            {phase === 'recap' ? (
              <PackRecap
                key="pack-recap"
                cards={openPackResult.cards}
                isGodPack={isGodPack}
                newCardCount={newCardCount}
                resultLabel={resultLabel}
                setName={openPackResult.set.name}
                shouldReduceMotion={Boolean(shouldReduceMotion)}
                onComplete={onComplete}
              />
            ) : null}
          </AnimatePresence>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

interface CardStackProps {
  cards: OpenPackResponse['cards']
  currentIndex: number
  canInteract: boolean
  isExtracting: boolean
  isWaitingForTear: boolean
  isGodPack: boolean
  shouldReduceMotion: boolean
  onExtracted: () => void
  onCardDismissed: () => void
}

function CardStack({
  cards,
  currentIndex,
  canInteract,
  isExtracting,
  isWaitingForTear,
  isGodPack,
  shouldReduceMotion,
  onExtracted,
  onCardDismissed,
}: CardStackProps) {
  const cardRef = useRef<HTMLButtonElement>(null)
  const isDismissingRef = useRef(false)
  const [exitDirection, setExitDirection] = useState<-1 | 1>()
  const x = useMotionValue(0)
  const activeCard = cards[currentIndex]
  const visibleCards = cards.slice(currentIndex, currentIndex + 3).map((card, offset) => ({
    card,
    absoluteIndex: currentIndex + offset,
    depth: offset,
  }))

  useEffect(() => {
    if (canInteract) cardRef.current?.focus({ preventScroll: true })
  }, [canInteract, currentIndex])

  const dismiss = useCallback(
    (direction: -1 | 1) => {
      if (!canInteract || isDismissingRef.current) return
      isDismissingRef.current = true
      setExitDirection(direction)

      const targetX = shouldReduceMotion ? 0 : direction * Math.max(window.innerWidth * 0.85, 520)
      const movement = animate(x, targetX, {
        duration: shouldReduceMotion ? 0.06 : 0.18,
        ease: [0.32, 0.72, 0, 1],
      })

      void movement.then(() => {
        x.set(0)
        setExitDirection(undefined)
        isDismissingRef.current = false
        onCardDismissed()
      })
    },
    [canInteract, onCardDismissed, shouldReduceMotion, x],
  )

  return (
    <motion.div
      className="fixed inset-0 z-10 flex items-center justify-center px-4 [perspective:1200px]"
      initial={false}
      animate={
        isWaitingForTear
          ? { clipPath: 'inset(0 0 80dvh 0)' }
          : isExtracting && !shouldReduceMotion
            ? {
                clipPath: [
                  'inset(0 0 80dvh 0)',
                  'inset(0 0 80dvh 0)',
                  'inset(0 0 8dvh 0)',
                  'inset(0 0 0dvh 0)',
                ],
              }
            : { clipPath: 'none' }
      }
      transition={
        isExtracting && !shouldReduceMotion
          ? {
              duration: 1.3,
              times: [0, 0.06, 0.65, 1],
              ease: ['linear', [0.32, 0.72, 0, 1], 'linear'],
            }
          : { duration: 0 }
      }
    >
      <motion.div
        className="relative aspect-63/88 w-[min(84vw,calc(71.6dvh-6.5rem),26rem)] will-change-transform sm:w-[min(54vw,calc(71.6dvh-6.5rem),26rem)]"
        initial={false}
        animate={
          isWaitingForTear
            ? {
                opacity: 1,
                scale: 0.56,
                y: '20vh',
              }
            : shouldReduceMotion
              ? { opacity: 1, scale: 1, y: 0 }
              : isExtracting
                ? {
                    opacity: 1,
                    scale: [0.56, 0.56, 0.72, 1],
                    y: ['20vh', '20vh', '-12vh', '0vh'],
                  }
                : {
                    opacity: 1,
                    scale: 1,
                    y: 0,
                  }
        }
        transition={
          isWaitingForTear
            ? { duration: 0 }
            : shouldReduceMotion
              ? { duration: 0.2 }
              : isExtracting
                ? {
                    duration: 1.3,
                    times: [0, 0.06, 0.65, 1],
                    ease: ['linear', 'easeOut', 'easeInOut'],
                  }
                : { duration: 0 }
        }
        onAnimationComplete={() => {
          if (isExtracting) onExtracted()
        }}
      >
        {visibleCards
          .slice()
          .reverse()
          .map(({ card, absoluteIndex, depth }) => (
            <OpeningCardSurface
              key={`${card.id}-${absoluteIndex}`}
              card={card}
              depth={depth}
              exitDirection={depth === 0 ? exitDirection : undefined}
              isActive={depth === 0}
              isBackCard={depth === visibleCards.length - 1}
              isGodPack={isGodPack}
              showBadge={canInteract}
              shouldReduceMotion={shouldReduceMotion}
              x={x}
            />
          ))}

        {activeCard ? (
          <motion.button
            ref={cardRef}
            type="button"
            className={cn(
              'absolute inset-0 z-30 touch-none select-none rounded-lg bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950/70',
              !canInteract || exitDirection
                ? 'pointer-events-none'
                : 'cursor-grab active:cursor-grabbing',
            )}
            tabIndex={canInteract ? 0 : -1}
            style={{ x }}
            drag={canInteract && !exitDirection ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.84}
            dragMomentum={false}
            onDragEnd={(_, info) => {
              const direction = getSwipeDismissDirection(info.offset.x, info.velocity.x)
              if (direction) {
                dismiss(direction)
                return
              }

              animate(x, 0, { type: 'spring', stiffness: 420, damping: 30 })
            }}
            onTap={() => dismiss(1)}
            onClick={(event) => {
              if (event.detail === 0) dismiss(1)
            }}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowRight') return
              event.preventDefault()
              dismiss(1)
            }}
            aria-label={m.packs_reveal_card_aria({
              current: currentIndex + 1,
              total: cards.length,
              name: activeCard.name,
            })}
          />
        ) : null}
      </motion.div>

      <motion.div
        className="pointer-events-none absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5 text-center"
        initial={false}
        animate={
          shouldReduceMotion
            ? { opacity: canInteract ? 1 : 0 }
            : { opacity: canInteract ? 1 : 0, y: canInteract ? 0 : 10 }
        }
      >
        <p className="text-sm font-black tabular-nums text-white/86" aria-live="polite">
          {currentIndex + 1} / {cards.length}
        </p>
        <p className="flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-white/55 sm:text-sm">
          <MoveHorizontalIcon className="size-4" aria-hidden="true" />
          {m.packs_reveal_instruction()}
        </p>
      </motion.div>
    </motion.div>
  )
}

interface OpeningCardSurfaceProps {
  card: OpenedPackCard
  depth: number
  exitDirection?: -1 | 1
  isActive: boolean
  isBackCard: boolean
  isGodPack: boolean
  showBadge: boolean
  shouldReduceMotion: boolean
  x: MotionValue<number>
}

function OpeningCardSurface({
  card,
  depth,
  exitDirection,
  isActive,
  isBackCard,
  isGodPack,
  showBadge,
  shouldReduceMotion,
  x,
}: OpeningCardSurfaceProps) {
  const imageUrl = card.imageLarge ?? card.imageSmall

  return (
    <motion.div
      className={cn(
        'pointer-events-none absolute inset-0 origin-bottom rounded-lg',
        isBackCard && shouldReduceMotion && 'drop-shadow-[0_24px_24px_rgb(0_0_0/0.38)]',
      )}
      initial={false}
      animate={{
        y: depth * 5,
        scale: 1,
        rotate: 0,
        opacity: 1,
      }}
      transition={
        shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 28 }
      }
      style={{ zIndex: 10 - depth }}
      aria-hidden="true"
    >
      <motion.div
        className="size-full rounded-lg"
        style={{
          x: isActive ? x : 0,
        }}
        animate={{
          opacity: exitDirection ? 0 : 1,
          scale: exitDirection && !shouldReduceMotion ? 0.94 : 1,
          y: exitDirection && !shouldReduceMotion ? -18 : 0,
        }}
        transition={
          exitDirection
            ? { duration: shouldReduceMotion ? 0.06 : 0.18, ease: [0.32, 0.72, 0, 1] }
            : { type: 'spring', stiffness: 340, damping: 28 }
        }
      >
        {card.isNew && isActive && showBadge ? (
          <NewCardBadge className="-top-10" shouldReduceMotion={shouldReduceMotion} />
        ) : null}

        {imageUrl && !shouldReduceMotion ? (
          <WebGlCardViewer
            frontImageUrl={imageUrl}
            alt={card.name}
            finish={card.finish}
            interactive={false}
            cameraDistance={5.65}
            className={cn(
              'pointer-events-none size-full max-h-none rounded-lg',
              isBackCard && 'drop-shadow-[0_24px_24px_rgb(0_0_0/0.38)]',
              isGodPack && isBackCard && 'drop-shadow-[0_0_30px_rgb(251_191_36/0.42)]',
            )}
          />
        ) : imageUrl ? (
          <FoilCardImage
            src={imageUrl}
            alt={card.name}
            finish={card.finish}
            className="size-full rounded-lg object-cover"
          />
        ) : (
          <span className="block size-full rounded-lg bg-slate-800" aria-hidden="true" />
        )}
      </motion.div>
    </motion.div>
  )
}

interface PackRecapProps {
  cards: OpenPackResponse['cards']
  isGodPack: boolean
  newCardCount: number
  resultLabel?: string
  setName: string
  shouldReduceMotion: boolean
  onComplete: () => void
}

function PackRecap({
  cards,
  isGodPack,
  newCardCount,
  resultLabel,
  setName,
  shouldReduceMotion,
  onComplete,
}: PackRecapProps) {
  const headingRef = useRef<HTMLElement>(null)
  const [selectedCardIndex, setSelectedCardIndex] = useState<number>()
  const [activeRendererIndex, setActiveRendererIndex] = useState<number>()
  const [renderAllRecapCards, setRenderAllRecapCards] = useState(true)
  const [zoomInteractionReady, setZoomInteractionReady] = useState(false)
  const [hasInspectedCard, setHasInspectedCard] = useState(false)
  const [recapEntranceComplete, setRecapEntranceComplete] = useState(false)
  const selectedCard = selectedCardIndex === undefined ? undefined : cards[selectedCardIndex]
  const subtitle =
    resultLabel ??
    (isGodPack
      ? m.packs_god_pack_subtitle()
      : newCardCount > 0
        ? m.packs_new_cards_count({ count: newCardCount })
        : m.packs_added_to_collection())

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  const closeSelectedCard = useCallback(() => {
    setZoomInteractionReady(false)
    setSelectedCardIndex(undefined)
  }, [])

  return (
    <motion.div
      className="relative z-30 mx-auto flex min-h-full w-full max-w-7xl flex-col items-center justify-center px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.header
        ref={headingRef}
        className={cn(
          'relative z-20 mb-4 text-center outline-none',
          selectedCard && 'pointer-events-none',
        )}
        tabIndex={-1}
        initial={shouldReduceMotion ? false : { opacity: 0, y: -16 }}
        animate={
          selectedCard ? { opacity: 0, y: shouldReduceMotion ? 0 : -50 } : { opacity: 1, y: 0 }
        }
        transition={
          selectedCard || hasInspectedCard
            ? { duration: shouldReduceMotion ? 0.1 : 0.28 }
            : { delay: shouldReduceMotion ? 0 : 0.18 }
        }
      >
        <div className="mb-1 flex items-center justify-center gap-2">
          {isGodPack ? (
            <span className="rounded-full bg-amber-400 px-3 py-1 text-[0.68rem] font-black tracking-[0.18em] text-amber-950 shadow-[0_0_28px_rgb(251_191_36/0.45)]">
              {m.packs_god_pack_badge()}
            </span>
          ) : (
            <SparklesIcon className="size-5 text-white/55" aria-hidden="true" />
          )}
        </div>
        <h3 className="text-balance text-xl font-black tracking-tight text-white sm:text-2xl">
          {m.packs_pulls_title({ set: setName })}
        </h3>
        <p
          className={cn('mt-1 text-sm font-semibold text-white/58', isGodPack && 'text-amber-300')}
        >
          {subtitle}
        </p>
        <p className="mt-1 text-xs font-medium text-white/38">{m.packs_recap_instruction()}</p>
      </motion.header>

      <div
        className={cn(
          'relative z-20 grid w-full max-w-7xl grid-cols-2 gap-0 md:w-[min(100%,calc(179dvh-24.25rem))] md:grid-cols-5',
          selectedCard && 'pointer-events-none',
        )}
      >
        {cards.map((card, index) => {
          const imageUrl = card.imageLarge ?? card.imageSmall
          const isSelected = selectedCardIndex === index

          return (
            <div key={`${card.id}-${index}-recap-slot`} className="relative aspect-63/88 w-full">
              <motion.button
                type="button"
                layout
                className={cn(
                  'aspect-63/88 rounded-lg bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950/70',
                  isSelected
                    ? 'pointer-events-auto fixed inset-0 z-50 m-auto w-[min(32rem,94vw,68dvh)]'
                    : 'absolute inset-0 w-full',
                  selectedCard && !isSelected && 'pointer-events-none',
                )}
                tabIndex={selectedCard && !isSelected ? -1 : 0}
                initial={
                  hasInspectedCard
                    ? false
                    : shouldReduceMotion
                      ? { opacity: 0 }
                      : {
                          opacity: 0,
                          scale: 0.52,
                          y: -90 - (index % 3) * 14,
                          rotate: (index % 2 === 0 ? -1 : 1) * (7 + (index % 3) * 2),
                        }
                }
                animate={
                  selectedCard && !isSelected
                    ? {
                        opacity: 0,
                        scale: shouldReduceMotion ? 1 : 0.86,
                        x: shouldReduceMotion
                          ? 0
                          : (index % 2 === 0 ? -1 : 1) * window.innerWidth * 0.72,
                        y: shouldReduceMotion
                          ? 0
                          : (index < cards.length / 2 ? -1 : 1) * window.innerHeight * 0.28,
                        rotate: shouldReduceMotion ? 0 : (index % 2 === 0 ? -1 : 1) * 9,
                      }
                    : { opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 }
                }
                transition={
                  isSelected
                    ? {
                        layout: shouldReduceMotion
                          ? { duration: 0.1 }
                          : { type: 'spring', stiffness: 235, damping: 25, mass: 0.92 },
                      }
                    : shouldReduceMotion
                      ? { delay: index * 0.025, duration: 0.12 }
                      : hasInspectedCard || recapEntranceComplete
                        ? selectedCard
                          ? {
                              delay: Math.min(index * 0.012, 0.08),
                              duration: 0.42,
                              ease: [0.32, 0.72, 0, 1],
                            }
                          : { type: 'spring', stiffness: 230, damping: 25 }
                        : {
                            delay: 0.12 + index * 0.065,
                            type: 'spring',
                            stiffness: 235,
                            damping: 23,
                          }
                }
                whileHover={
                  isSelected || shouldReduceMotion
                    ? undefined
                    : {
                        y: -4,
                        scale: 1.025,
                        transition: { delay: 0, duration: 0.12, ease: 'easeOut' },
                      }
                }
                whileTap={
                  isSelected ? undefined : { scale: 0.98, transition: { delay: 0, duration: 0.08 } }
                }
                onClick={() => {
                  if (isSelected) return
                  setHasInspectedCard(true)
                  setZoomInteractionReady(false)
                  setRenderAllRecapCards(false)
                  setActiveRendererIndex(index)
                  setSelectedCardIndex(index)
                }}
                onKeyDown={(event) => {
                  if (isSelected && event.key === 'Escape') closeSelectedCard()
                }}
                onLayoutAnimationComplete={() => {
                  if (selectedCardIndex === index) {
                    setZoomInteractionReady(true)
                    return
                  }

                  if (
                    selectedCardIndex === undefined &&
                    activeRendererIndex === index &&
                    !renderAllRecapCards
                  ) {
                    setActiveRendererIndex(undefined)
                    setRenderAllRecapCards(true)
                  }
                }}
                onAnimationComplete={() => {
                  if (
                    index === cards.length - 1 &&
                    !recapEntranceComplete &&
                    selectedCardIndex === undefined
                  ) {
                    setRecapEntranceComplete(true)
                  }
                }}
                aria-label={m.packs_view_card_aria({ name: card.name })}
              >
                {card.isNew && !isSelected ? (
                  <NewCardBadge
                    className="-top-1"
                    compact
                    shouldReduceMotion={shouldReduceMotion}
                  />
                ) : null}
                {imageUrl ? (
                  <WebGlCardViewer
                    frontImageUrl={imageUrl}
                    alt={card.name}
                    finish={card.finish}
                    interactive={isSelected && zoomInteractionReady}
                    rendering={renderAllRecapCards || activeRendererIndex === index}
                    resetOnInteractiveDisable
                    cameraDistance={6.6}
                    rotationLimit={0.48}
                    className={cn(
                      'size-full max-h-none rounded-lg drop-shadow-[0_18px_24px_rgb(0_0_0/0.38)]',
                      isGodPack && 'drop-shadow-[0_14px_28px_rgb(251_191_36/0.36)]',
                    )}
                  />
                ) : (
                  <span className="block size-full rounded-lg bg-slate-800" aria-hidden="true" />
                )}
              </motion.button>
            </div>
          )
        })}
      </div>

      <motion.div
        className={cn(
          'fixed inset-x-0 bottom-[max(2rem,env(safe-area-inset-bottom))] z-30 flex justify-center md:relative md:inset-auto md:mt-4',
          selectedCard && 'pointer-events-none',
        )}
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
        animate={
          selectedCard ? { opacity: 0, y: shouldReduceMotion ? 0 : 50 } : { opacity: 1, y: 0 }
        }
        transition={
          selectedCard || hasInspectedCard
            ? { duration: shouldReduceMotion ? 0.1 : 0.28 }
            : { delay: shouldReduceMotion ? 0.3 : 0.9 }
        }
      >
        <Button
          type="button"
          size="lg"
          className="min-w-40 rounded-full bg-white font-black text-slate-950 shadow-[0_16px_45px_-18px_rgb(255_255_255/0.68)] hover:bg-white/90"
          onClick={onComplete}
          disabled={Boolean(selectedCard)}
        >
          {m.packs_finish_opening()}
        </Button>
      </motion.div>

      <AnimatePresence>
        {selectedCard ? (
          <motion.div
            key="recap-card-backdrop"
            className="fixed inset-0 z-10 touch-none bg-slate-950/62 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.1 : 0.28 }}
            onClick={closeSelectedCard}
            aria-hidden="true"
          />
        ) : null}
      </AnimatePresence>
    </motion.div>
  )
}

interface NewCardBadgeProps {
  className?: string
  compact?: boolean
  shouldReduceMotion: boolean
}

function NewCardBadge({ className, compact = false, shouldReduceMotion }: NewCardBadgeProps) {
  return (
    <motion.span
      className={cn(
        'pointer-events-none absolute left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-amber-400 font-black uppercase tracking-wide text-amber-950 shadow-[0_8px_24px_-7px_rgb(245_158_11/0.75)]',
        compact
          ? 'px-2 py-0.5 text-[0.58rem] sm:px-2.5 sm:text-[0.65rem]'
          : 'px-3 py-1 text-xs sm:px-4 sm:py-1.5 sm:text-sm',
        className,
      )}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.55, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={
        shouldReduceMotion
          ? { duration: 0.1 }
          : { delay: 0.16, type: 'spring', stiffness: 410, damping: 20 }
      }
    >
      <SparklesIcon className={compact ? 'size-2.5' : 'size-3.5'} aria-hidden="true" />
      {m.packs_card_new()}
    </motion.span>
  )
}
