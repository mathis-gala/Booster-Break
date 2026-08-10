import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import type { OpenPackResponse, OpenedPackCard } from '@tcg-collection/shared'
import { MoveHorizontalIcon, ScissorsIcon, SparklesIcon } from 'lucide-react'
import {
  AnimatePresence,
  animate,
  motion,
  type MotionStyle,
  type MotionValue,
  useMotionValue,
  useReducedMotion,
} from 'motion/react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import {
  DEFAULT_CARD_ARTWORK_PALETTE,
  DEFAULT_CARD_GLOW_COLOR,
  getCachedCardArtworkColor,
  getCachedCardArtworkPalette,
  getCardArtworkAverageColor,
  getCardArtworkPalette,
  type CardArtworkPalette,
} from '../lib/card-art-color'
import {
  createRevealParticles,
  resolveCardRevealTier,
  type CardRevealTier,
  type ParticleRevealTier,
  type RevealParticleKind,
} from '../lib/card-reveal'
import {
  getCardDismissalTransition,
  getSwipeDismissDirection,
} from '../lib/pack-opening-gesture'
import { FoilCardImage } from './FoilCardImage'
import { InteractiveBooster } from './InteractiveBooster'
import { WebGlCardViewer } from './WebGlCardViewer'

type OpeningPhase = 'tear' | 'extract' | 'reveal' | 'recap'

const JACKPOT_DURATION_SECONDS = 21
const JACKPOT_COLOR_BURST_SECONDS = 3.4
const JACKPOT_ZOOM_START_SECONDS = 4.4
const JACKPOT_RECENTER_SECONDS = 17.6
const JACKPOT_FINALE_START_SECONDS = 18.7
const JACKPOT_FINALE_DURATION_SECONDS = JACKPOT_DURATION_SECONDS - JACKPOT_FINALE_START_SECONDS

function createJackpotMotion(
  cardWidth: number,
  cardHeight: number,
): {
  times: number[]
  scale: number[]
  x: number[]
  y: number[]
  rotationX: number[]
  rotationY: number[]
} {
  const times = [0, JACKPOT_ZOOM_START_SECONDS / JACKPOT_DURATION_SECONDS]
  const scale = [1, 1]
  const x = [0, 0]
  const y = [0, 0]
  const rotationX = [0, 0]
  const rotationY = [0, 0]
  const fullCard = { scale: 1, x: 0, y: 0, rotationX: 0, rotationY: 0 }
  const zoomLeadIn = {
    scale: 1.2,
    x: 0,
    y: cardHeight * 0.12,
    rotationX: 0.01,
    rotationY: -0.01,
  }
  const header = {
    scale: 2.05,
    x: 0,
    y: cardHeight * 0.78,
    rotationX: 0.04,
    rotationY: -0.06,
  }
  const upperArtwork = {
    scale: 2.3,
    x: cardWidth * 0.08,
    y: cardHeight * 0.53,
    rotationX: -0.12,
    rotationY: 0.18,
  }
  const artworkCenter = {
    scale: 2.4,
    x: cardWidth * -0.08,
    y: cardHeight * 0.24,
    rotationX: 0.14,
    rotationY: -0.22,
  }
  const rulesText = {
    scale: 2.2,
    x: cardWidth * 0.04,
    y: cardHeight * -0.16,
    rotationX: -0.06,
    rotationY: 0.12,
  }
  const attacks = {
    scale: 2.3,
    x: cardWidth * -0.05,
    y: cardHeight * -0.38,
    rotationX: 0.08,
    rotationY: -0.12,
  }
  const lowerCard = {
    scale: 1.9,
    x: 0,
    y: cardHeight * -0.46,
    rotationX: -0.02,
    rotationY: 0.04,
  }
  const centeredCard = { scale: 1.35, x: 0, y: 0, rotationX: 0, rotationY: 0 }
  type MotionPoint = typeof fullCard & { time: number }
  type MotionProperty = Exclude<keyof MotionPoint, 'time'>
  const scanPoints: MotionPoint[] = [
    { ...fullCard, time: JACKPOT_ZOOM_START_SECONDS },
    { ...zoomLeadIn, time: 5.1 },
    { ...header, time: 6.2 },
    { ...upperArtwork, time: 8.4 },
    { ...artworkCenter, time: 10.6 },
    { ...rulesText, time: 12.8 },
    { ...attacks, time: 14.8 },
    { ...lowerCard, time: 16.4 },
    { ...centeredCard, time: JACKPOT_RECENTER_SECONDS },
  ]

  const getTangent = (index: number, property: MotionProperty): number => {
    if (index === 0 || index === scanPoints.length - 1) return 0

    const previous = scanPoints[index - 1]
    const next = scanPoints[index + 1]
    return (next[property] - previous[property]) / (next.time - previous.time)
  }

  for (let segment = 0; segment < scanPoints.length - 1; segment += 1) {
    const from = scanPoints[segment]
    const to = scanPoints[segment + 1]
    const segmentDuration = to.time - from.time
    const steps = Math.max(1, Math.round(segmentDuration * 30))

    for (let step = 1; step <= steps; step += 1) {
      const progress = step / steps
      const squared = progress * progress
      const cubed = squared * progress
      const h00 = 2 * cubed - 3 * squared + 1
      const h10 = cubed - 2 * squared + progress
      const h01 = -2 * cubed + 3 * squared
      const h11 = cubed - squared
      const interpolate = (property: MotionProperty) =>
        h00 * from[property] +
        h10 * segmentDuration * getTangent(segment, property) +
        h01 * to[property] +
        h11 * segmentDuration * getTangent(segment + 1, property)

      times.push((from.time + segmentDuration * progress) / JACKPOT_DURATION_SECONDS)
      scale.push(interpolate('scale'))
      x.push(interpolate('x'))
      y.push(interpolate('y'))
      rotationX.push(interpolate('rotationX'))
      rotationY.push(interpolate('rotationY'))
    }
  }

  const finalZoomDuration = JACKPOT_FINALE_START_SECONDS - JACKPOT_RECENTER_SECONDS
  const finalZoomSteps = Math.round(finalZoomDuration * 30)
  for (let step = 1; step <= finalZoomSteps; step += 1) {
    const progress = step / finalZoomSteps
    const eased = progress * progress * (3 - 2 * progress)

    times.push((JACKPOT_RECENTER_SECONDS + finalZoomDuration * progress) / JACKPOT_DURATION_SECONDS)
    scale.push(centeredCard.scale + (fullCard.scale - centeredCard.scale) * eased)
    x.push(0)
    y.push(0)
    rotationX.push(0)
    rotationY.push(0)
  }

  times.push(1)
  scale.push(fullCard.scale)
  x.push(0)
  y.push(0)
  rotationX.push(0)
  rotationY.push(0)

  return { times, scale, x, y, rotationX, rotationY }
}

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
  const revealedCardIndexRef = useRef(0)
  const [tearProgress, setTearProgress] = useState(0)
  const [autoTearRequested, setAutoTearRequested] = useState(false)
  const [sampledArtwork, setSampledArtwork] = useState<{
    imageUrl: string
    color: string
    palette: CardArtworkPalette
  }>()
  const shouldReduceMotion = useReducedMotion()
  const currentCard = openPackResult.cards[revealedCardIndex]
  const isRecapVisible = phase === 'recap' || (phase === 'reveal' && !currentCard)
  const currentRevealTier = currentCard ? resolveCardRevealTier(currentCard) : 'standard'
  const currentImageUrl = currentCard?.imageLarge ?? currentCard?.imageSmall
  const isGodPack = openPackResult.isGodPack
  const newCardCount = openPackResult.cards.filter((card) => card.isNew).length
  const glowColor = currentImageUrl
    ? (getCachedCardArtworkColor(currentImageUrl) ??
      (sampledArtwork?.imageUrl === currentImageUrl
        ? sampledArtwork.color
        : DEFAULT_CARD_GLOW_COLOR))
    : DEFAULT_CARD_GLOW_COLOR
  const artworkPalette = currentImageUrl
    ? (getCachedCardArtworkPalette(currentImageUrl) ??
      (sampledArtwork?.imageUrl === currentImageUrl
        ? sampledArtwork.palette
        : DEFAULT_CARD_ARTWORK_PALETTE))
    : DEFAULT_CARD_ARTWORK_PALETTE
  const glowStrength = getGlowStrength(currentRevealTier)

  useEffect(() => {
    for (const card of openPackResult.cards) {
      const imageUrl = card.imageLarge ?? card.imageSmall
      if (imageUrl) void getCardArtworkAverageColor(imageUrl)
    }
  }, [openPackResult.cards])

  useEffect(() => {
    if (!currentImageUrl) return

    let isCurrent = true
    void Promise.all([
      getCardArtworkAverageColor(currentImageUrl),
      getCardArtworkPalette(currentImageUrl),
    ]).then(([color, palette]) => {
      if (isCurrent) setSampledArtwork({ imageUrl: currentImageUrl, color, palette })
    })

    return () => {
      isCurrent = false
    }
  }, [currentImageUrl])
  const handleTearComplete = useCallback(() => {
    setPhase((currentPhase) => (currentPhase === 'tear' ? 'extract' : currentPhase))
  }, [])

  const requestAutoTear = useCallback(() => {
    setAutoTearRequested(true)
  }, [])

  useEffect(() => {
    if (phase !== 'tear' || autoTearRequested) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return
      event.preventDefault()
      requestAutoTear()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [autoTearRequested, phase, requestAutoTear])

  const handleCardDismissed = useCallback(
    (dismissedIndex: number) => {
      const transition = getCardDismissalTransition(
        revealedCardIndexRef.current,
        dismissedIndex,
        openPackResult.cards.length,
      )
      if (!transition) return

      if (transition.isComplete) {
        setPhase((currentPhase) => (currentPhase === 'reveal' ? 'recap' : currentPhase))
        return
      }

      revealedCardIndexRef.current = transition.nextIndex
      setRevealedCardIndex(transition.nextIndex)
    },
    [openPackResult.cards.length],
  )

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
            isRecapVisible ? 'overflow-y-auto' : 'overflow-hidden',
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
                backgroundImage: `radial-gradient(circle at 50% 38%, rgb(${glowColor} / ${glowStrength.primary}), transparent 44%), radial-gradient(circle at 15% 85%, rgb(${glowColor} / ${glowStrength.secondary}), transparent 36%)`,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: shouldReduceMotion ? 0.1 : 0.5 }}
              aria-hidden="true"
            />
          </AnimatePresence>
          <AnimatePresence initial={false}>
            {phase === 'reveal' && currentCard && currentRevealTier === 'jackpot' ? (
              <JackpotBackdrop
                key={`${currentCard.id}-${revealedCardIndex}`}
                color={glowColor}
                palette={artworkPalette}
                shouldReduceMotion={Boolean(shouldReduceMotion)}
              />
            ) : null}
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
                    autoTear={autoTearRequested}
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
                  onClick={requestAutoTear}
                  disabled={autoTearRequested}
                  animate={{ opacity: isTearPhase ? 1 : 0 }}
                  tabIndex={isTearPhase ? 0 : -1}
                >
                  {m.packs_tear_skip()}
                </motion.button>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {isStackPhase && currentCard ? (
              <CardStack
                key="opening-card-stack"
                cards={openPackResult.cards}
                currentIndex={revealedCardIndex}
                canInteract={phase === 'reveal'}
                isExtracting={phase === 'extract'}
                isWaitingForTear={phase === 'tear'}
                isGodPack={isGodPack}
                glowColor={glowColor}
                artworkPalette={artworkPalette}
                shouldReduceMotion={Boolean(shouldReduceMotion)}
                onExtracted={() =>
                  setPhase((currentPhase) => (currentPhase === 'extract' ? 'reveal' : currentPhase))
                }
                onCardDismissed={handleCardDismissed}
              />
            ) : null}

            {isRecapVisible ? (
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
  glowColor: string
  artworkPalette: CardArtworkPalette
  shouldReduceMotion: boolean
  onExtracted: () => void
  onCardDismissed: (cardIndex: number) => void
}

function CardStack({
  cards,
  currentIndex,
  canInteract,
  isExtracting,
  isWaitingForTear,
  isGodPack,
  glowColor,
  artworkPalette,
  shouldReduceMotion,
  onExtracted,
  onCardDismissed,
}: CardStackProps) {
  const cardRef = useRef<HTMLButtonElement>(null)
  const isDismissingRef = useRef(false)
  const [exitDirection, setExitDirection] = useState<-1 | 1>()
  const [completedJackpotKey, setCompletedJackpotKey] = useState<string>()
  const x = useMotionValue(0)
  const activeCard = cards[currentIndex]
  const activeCardKey = activeCard ? `${activeCard.id}-${currentIndex}` : undefined
  const activeRevealTier = activeCard ? resolveCardRevealTier(activeCard) : 'standard'
  const isJackpotLocked =
    canInteract && activeRevealTier === 'jackpot' && completedJackpotKey !== activeCardKey
  const canDismiss = canInteract && !isJackpotLocked
  const hasRevealEffects =
    canInteract &&
    isParticleRevealTier(activeRevealTier) &&
    (activeRevealTier !== 'jackpot' || isJackpotLocked)
  const visibleCards = cards.slice(currentIndex, currentIndex + 3).map((card, offset) => ({
    card,
    absoluteIndex: currentIndex + offset,
    depth: offset,
  }))

  useEffect(() => {
    if (isJackpotLocked) {
      cardRef.current?.blur()
      return
    }

    if (canDismiss) cardRef.current?.focus({ preventScroll: true })
  }, [canDismiss, currentIndex, isJackpotLocked])

  useEffect(() => {
    isDismissingRef.current = false
  }, [currentIndex])

  const handleJackpotComplete = useCallback((cardKey: string) => {
    setCompletedJackpotKey(cardKey)
  }, [])

  const dismiss = useCallback(
    (direction: -1 | 1) => {
      if (!canDismiss || isDismissingRef.current) return
      isDismissingRef.current = true
      setExitDirection(direction)

      const targetX = shouldReduceMotion ? 0 : direction * Math.max(window.innerWidth * 0.85, 520)
      const movement = animate(x, targetX, {
        duration: shouldReduceMotion ? 0.06 : 0.18,
        ease: [0.32, 0.72, 0, 1],
      })

      void movement.then(() => {
        if (currentIndex < cards.length - 1) {
          x.set(0)
          setExitDirection(undefined)
        }
        onCardDismissed(currentIndex)
      })
    },
    [canDismiss, cards.length, currentIndex, onCardDismissed, shouldReduceMotion, x],
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
      exit={{
        opacity: 0,
        scale: shouldReduceMotion ? 1 : 0.985,
        transition: {
          duration: shouldReduceMotion ? 0.1 : 0.28,
          ease: 'easeOut',
        },
      }}
    >
      <motion.div
        className="relative z-10 aspect-63/88 w-[min(84vw,calc(71.6dvh-6.5rem),26rem)] will-change-transform sm:w-[min(54vw,calc(71.6dvh-6.5rem),26rem)]"
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
              cardKey={`${card.id}-${absoluteIndex}`}
              depth={depth}
              exitDirection={depth === 0 ? exitDirection : undefined}
              isActive={depth === 0}
              isBackCard={depth === visibleCards.length - 1}
              isGodPack={isGodPack}
              isJackpotCinematic={isJackpotLocked}
              showBadge={canDismiss}
              shouldReduceMotion={shouldReduceMotion}
              x={x}
              onJackpotComplete={handleJackpotComplete}
            />
          ))}

        <AnimatePresence initial={false}>
          {activeCard && hasRevealEffects ? (
            <RevealStageAccent
              key={`${activeCardKey}-${activeRevealTier}-accent`}
              color={glowColor}
              palette={artworkPalette}
              tier={activeRevealTier}
              shouldReduceMotion={shouldReduceMotion}
            />
          ) : null}
          {activeCard &&
          hasRevealEffects &&
          activeRevealTier === 'jackpot' &&
          !shouldReduceMotion ? (
            <RevealParticleBurst
              key={`${activeCardKey}-${activeRevealTier}-opening-particles`}
              cardId={activeCard.id}
              color={glowColor}
              palette={artworkPalette}
              tier={activeRevealTier}
              phase="opening"
              shouldReduceMotion={false}
            />
          ) : null}
          {activeCard && hasRevealEffects ? (
            <RevealParticleBurst
              key={`${activeCardKey}-${activeRevealTier}-particles`}
              cardId={activeCard.id}
              color={glowColor}
              palette={artworkPalette}
              tier={activeRevealTier}
              shouldReduceMotion={shouldReduceMotion}
            />
          ) : null}
        </AnimatePresence>

        {activeCard ? (
          <motion.button
            ref={cardRef}
            type="button"
            className={cn(
              'absolute inset-0 z-30 touch-none select-none rounded-lg bg-transparent p-0 focus-visible:outline-none',
              !canDismiss || exitDirection
                ? 'pointer-events-none'
                : 'cursor-grab active:cursor-grabbing',
            )}
            tabIndex={canDismiss ? 0 : -1}
            style={{ x }}
            drag={canDismiss && !exitDirection ? 'x' : false}
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
            aria-disabled={!canDismiss}
            data-reveal-tier={activeRevealTier}
          />
        ) : null}
      </motion.div>

      <span className="sr-only" aria-live="polite">
        {isJackpotLocked
          ? m.packs_jackpot_reveal_in_progress({ name: activeCard?.name ?? '' })
          : ''}
      </span>

      <motion.div
        className="pointer-events-none absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1.5 text-center"
        initial={false}
        animate={
          shouldReduceMotion
            ? { opacity: canDismiss ? 1 : 0 }
            : { opacity: canDismiss ? 1 : 0, y: canDismiss ? 0 : 10 }
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
  cardKey: string
  depth: number
  exitDirection?: -1 | 1
  isActive: boolean
  isBackCard: boolean
  isGodPack: boolean
  isJackpotCinematic: boolean
  showBadge: boolean
  shouldReduceMotion: boolean
  x: MotionValue<number>
  onJackpotComplete: (cardKey: string) => void
}

function OpeningCardSurface({
  card,
  cardKey,
  depth,
  exitDirection,
  isActive,
  isBackCard,
  isGodPack,
  isJackpotCinematic,
  showBadge,
  shouldReduceMotion,
  x,
  onJackpotComplete,
}: OpeningCardSurfaceProps) {
  const imageUrl = card.imageLarge ?? card.imageSmall
  const cinematicCardRef = useRef<HTMLDivElement>(null)
  const cinematicScale = useMotionValue(1)
  const cinematicX = useMotionValue(0)
  const cinematicY = useMotionValue(0)
  const rotationX = useMotionValue(0)
  const rotationY = useMotionValue(0)

  useEffect(() => {
    if (!isActive || !isJackpotCinematic) return

    if (shouldReduceMotion) {
      const timeout = window.setTimeout(() => onJackpotComplete(cardKey), 800)
      return () => window.clearTimeout(timeout)
    }

    const duration = JACKPOT_DURATION_SECONDS
    const cardElement = cinematicCardRef.current
    const jackpotMotion = createJackpotMotion(
      cardElement?.offsetWidth ?? 400,
      cardElement?.offsetHeight ?? 560,
    )
    const animations = [
      animate(cinematicScale, jackpotMotion.scale, {
        duration,
        times: jackpotMotion.times,
        ease: 'linear',
      }),
      animate(cinematicX, jackpotMotion.x, {
        duration,
        times: jackpotMotion.times,
        ease: 'linear',
      }),
      animate(cinematicY, jackpotMotion.y, {
        duration,
        times: jackpotMotion.times,
        ease: 'linear',
      }),
      animate(rotationX, jackpotMotion.rotationX, {
        duration,
        times: jackpotMotion.times,
        ease: 'linear',
      }),
      animate(rotationY, jackpotMotion.rotationY, {
        duration,
        times: jackpotMotion.times,
        ease: 'linear',
      }),
    ]
    let isCurrent = true

    void Promise.all(animations).then(() => {
      if (isCurrent) onJackpotComplete(cardKey)
    })

    return () => {
      isCurrent = false
      for (const animation of animations) animation.stop()
    }
  }, [
    cardKey,
    cinematicScale,
    cinematicX,
    cinematicY,
    isActive,
    isJackpotCinematic,
    onJackpotComplete,
    rotationX,
    rotationY,
    shouldReduceMotion,
  ])

  return (
    <motion.div
      className={cn(
        'pointer-events-none absolute inset-0 origin-bottom rounded-lg',
        isBackCard && shouldReduceMotion && 'drop-shadow-[0_24px_24px_rgb(0_0_0/0.38)]',
      )}
      initial={false}
      animate={{
        y: depth * 5,
        scale: isJackpotCinematic && !isActive ? 0.97 : 1,
        rotate: 0,
        opacity: isJackpotCinematic && !isActive ? 0.06 : 1,
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
        <motion.div
          ref={cinematicCardRef}
          className="relative size-full rounded-lg will-change-transform"
          style={{ x: cinematicX, y: cinematicY, scale: cinematicScale }}
        >
          {card.isNew && isActive && showBadge ? (
            <NewCardBadge className="-top-10" shouldReduceMotion={shouldReduceMotion} />
          ) : null}

          {imageUrl && !shouldReduceMotion ? (
            <WebGlCardViewer
              frontImageUrl={imageUrl}
              alt={card.name}
              cardId={card.id}
              finish={card.finish}
              rarity={card.rarity}
              supertype={card.supertype}
              isEvolved={card.isEvolved}
              interactive={false}
              rotationX={rotationX}
              rotationY={rotationY}
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
              cardId={card.id}
              finish={card.finish}
              rarity={card.rarity}
              supertype={card.supertype}
              isEvolved={card.isEvolved}
              className="size-full rounded-lg object-cover"
            />
          ) : (
            <span className="block size-full rounded-lg bg-slate-800" aria-hidden="true" />
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

function JackpotBackdrop({
  color,
  palette,
  shouldReduceMotion,
}: {
  color: string
  palette: CardArtworkPalette
  shouldReduceMotion: boolean
}) {
  const duration = shouldReduceMotion ? 0.8 : JACKPOT_DURATION_SECONDS

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-slate-950"
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        transition: { duration: shouldReduceMotion ? 0.1 : 0.28, ease: 'easeOut' },
      }}
      exit={{
        opacity: 0,
        transition: { duration: shouldReduceMotion ? 0.1 : 0.65, ease: 'easeInOut' },
      }}
      aria-hidden="true"
    >
      <motion.div
        className="absolute -inset-[18%] blur-xl"
        style={{
          backgroundImage: `radial-gradient(ellipse 52% 64% at 12% 34%, rgb(${palette[0]} / 0.76), transparent 74%), radial-gradient(ellipse 54% 66% at 88% 30%, rgb(${palette[1]} / 0.7), transparent 76%), radial-gradient(ellipse 70% 46% at 52% 94%, rgb(${palette[2]} / 0.72), transparent 78%), radial-gradient(ellipse 42% 50% at 48% 12%, rgb(${palette[3]} / 0.48), transparent 70%), radial-gradient(ellipse 45% 55% at 72% 70%, rgb(${palette[4]} / 0.44), transparent 72%), linear-gradient(132deg, transparent 28%, rgb(${color} / 0.32) 50%, transparent 72%)`,
        }}
        initial={{ opacity: 0, scale: 1.06 }}
        animate={
          shouldReduceMotion
            ? { opacity: [0, 0.5, 0.46] }
            : {
                opacity: [0.34, 0.62, 0.56, 0.52, 0.64, 0.58],
                scale: [1.06, 1.03, 1.01, 1.03, 1.05, 1.04],
              }
        }
        transition={{
          duration,
          times: shouldReduceMotion
            ? [0, 0.5, 1]
            : [
                0,
                JACKPOT_COLOR_BURST_SECONDS / JACKPOT_DURATION_SECONDS,
                (JACKPOT_COLOR_BURST_SECONDS + 0.5) / JACKPOT_DURATION_SECONDS,
                JACKPOT_ZOOM_START_SECONDS / JACKPOT_DURATION_SECONDS,
                JACKPOT_FINALE_START_SECONDS / JACKPOT_DURATION_SECONDS,
                1,
              ],
          ease: 'easeInOut',
        }}
      />
      {!shouldReduceMotion ? (
        <>
          <motion.div
            className="absolute -inset-[8%] mix-blend-screen blur-xl"
            style={{
              backgroundImage: `radial-gradient(ellipse at center, rgb(${palette[0]} / 0.72), transparent 74%)`,
            }}
            initial={{ opacity: 0, scale: 0.72 }}
            animate={{
              opacity: [0, 0.9, 0.7, 0],
              scale: [0.72, 1, 1.18, 1.3],
            }}
            transition={{
              duration: JACKPOT_COLOR_BURST_SECONDS,
              times: [0, 0.22, 0.72, 1],
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute -inset-[8%] mix-blend-screen blur-xl"
            style={{
              backgroundImage: `radial-gradient(ellipse at center, rgb(${palette[0]} / 0.68), transparent 72%)`,
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
              opacity: [0, 0.82, 0.52, 0],
              scale: [0.9, 1, 1.06, 1.12],
            }}
            transition={{
              delay: JACKPOT_FINALE_START_SECONDS,
              duration: JACKPOT_FINALE_DURATION_SECONDS,
              times: [0, 0.18, 0.68, 1],
              ease: 'easeOut',
            }}
          />
        </>
      ) : null}
      <div className="absolute inset-0 bg-slate-950/12" />
    </motion.div>
  )
}

function JackpotHaloBurst({
  palette,
  phase,
}: {
  palette: CardArtworkPalette
  phase: 'opening' | 'finale'
}) {
  const isOpening = phase === 'opening'
  const delay = isOpening ? 0 : JACKPOT_FINALE_START_SECONDS
  const duration = isOpening ? JACKPOT_COLOR_BURST_SECONDS : JACKPOT_FINALE_DURATION_SECONDS
  const times = isOpening ? [0, 0.2, 0.72, 1] : [0, 0.18, 0.68, 1]
  const phaseDirection = isOpening ? 1 : -1

  return (
    <>
      <motion.div
        className="absolute inset-[12%] rounded-full mix-blend-screen blur-3xl"
        style={{
          backgroundImage: `radial-gradient(circle, rgb(${palette[0]} / 0.64), transparent 68%)`,
        }}
        initial={{ opacity: 0, scale: 0.62 }}
        animate={{
          opacity: isOpening ? [0, 0.8, 0.54, 0] : [0, 0.86, 0.56, 0],
          scale: [0.62, 0.98, 1.1, 1.17],
        }}
        transition={{ delay, duration, times, ease: 'easeOut' }}
      />
      {palette.slice(0, 3).map((paletteColor, index) => {
        const direction = phaseDirection * (index % 2 === 0 ? 1 : -1)
        const initialRotation = (-20 + index * 8) * direction
        const driftX = (index - 1) * 14
        const driftY = index === 1 ? -11 : 8

        return (
          <motion.div
            key={`jackpot-${phase}-halo-${index}-${paletteColor}`}
            className="absolute inset-0 rounded-full mix-blend-screen blur-2xl"
            style={{
              backgroundImage: `conic-gradient(from ${index * 120 + 12}deg, transparent 0deg 108deg, rgb(${paletteColor} / 0.92) 138deg, rgb(${paletteColor} / 0.32) 158deg, transparent 188deg 360deg)`,
              maskImage:
                'radial-gradient(ellipse at center, transparent 0 30%, black 48%, transparent 76%)',
              WebkitMaskImage:
                'radial-gradient(ellipse at center, transparent 0 30%, black 48%, transparent 76%)',
            }}
            initial={{ opacity: 0, scale: 0.68, rotate: initialRotation }}
            animate={{
              opacity: [0, 0.88, 0.62, 0],
              scale: [0.68, 0.98 + index * 0.015, 1.09 + index * 0.015, 1.17],
              x: [0, driftX * -0.35, driftX * 0.4, driftX],
              y: [0, driftY * -0.3, driftY * 0.45, driftY],
              rotate: [
                initialRotation,
                (22 + index * 12) * direction,
                (48 + index * 14) * direction,
                (72 + index * 16) * direction,
              ],
            }}
            transition={{
              delay: delay + index * (isOpening ? 0.08 : 0.04),
              duration: duration - index * 0.04,
              times,
              ease: 'easeInOut',
            }}
          />
        )
      })}
    </>
  )
}

function RevealStageAccent({
  color,
  palette,
  tier,
  shouldReduceMotion,
}: {
  color: string
  palette: CardArtworkPalette
  tier: ParticleRevealTier
  shouldReduceMotion: boolean
}) {
  const presenceTransition = {
    duration: shouldReduceMotion ? 0.1 : 0.26,
    ease: 'easeOut' as const,
  }

  if (tier === 'rr') {
    return (
      <motion.div
        className="pointer-events-none absolute -inset-[22%] z-[5]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={presenceTransition}
        aria-hidden="true"
      >
        <motion.div
          className="absolute inset-[12%] rounded-full mix-blend-screen blur-3xl"
          style={{
            backgroundImage: `radial-gradient(circle, rgb(${palette[0]} / 0.46), transparent 68%)`,
          }}
          initial={{ opacity: 0, scale: 0.66 }}
          animate={
            shouldReduceMotion
              ? { opacity: [0, 0.3, 0] }
              : { opacity: [0, 0.58, 0.38, 0], scale: [0.66, 0.96, 1.07, 1.13] }
          }
          transition={{
            duration: shouldReduceMotion ? 0.35 : 3.25,
            times: shouldReduceMotion ? [0, 0.5, 1] : [0, 0.16, 0.7, 1],
            ease: 'easeOut',
          }}
        />
        {palette.slice(0, 3).map((paletteColor, index) => {
          const direction = index % 2 === 0 ? 1 : -1
          const initialRotation = (-18 + index * 7) * direction
          const driftX = (index - 1) * 10
          const driftY = index === 1 ? -8 : 6

          return (
            <motion.div
              key={`${index}-${paletteColor}`}
              className="absolute inset-0 rounded-full mix-blend-screen blur-2xl"
              style={{
                backgroundImage: `conic-gradient(from ${index * 120 + 12}deg, transparent 0deg 108deg, rgb(${paletteColor} / 0.66) 138deg, rgb(${paletteColor} / 0.22) 158deg, transparent 188deg 360deg)`,
                maskImage:
                  'radial-gradient(ellipse at center, transparent 0 30%, black 48%, transparent 76%)',
                WebkitMaskImage:
                  'radial-gradient(ellipse at center, transparent 0 30%, black 48%, transparent 76%)',
              }}
              initial={{ opacity: 0, scale: 0.68, rotate: initialRotation }}
              animate={
                shouldReduceMotion
                  ? { opacity: [0, 0.28, 0] }
                  : {
                      opacity: [0, 0.64, 0.42, 0],
                      scale: [0.68, 0.97 + index * 0.015, 1.07 + index * 0.015, 1.15],
                      x: [0, driftX * -0.35, driftX * 0.4, driftX],
                      y: [0, driftY * -0.3, driftY * 0.45, driftY],
                      rotate: [
                        initialRotation,
                        (18 + index * 10) * direction,
                        (38 + index * 12) * direction,
                        (58 + index * 14) * direction,
                      ],
                    }
              }
              transition={{
                delay: shouldReduceMotion ? 0 : index * 0.07,
                duration: shouldReduceMotion ? 0.35 : 3.2 - index * 0.04,
                times: shouldReduceMotion ? [0, 0.5, 1] : [0, 0.18, 0.68, 1],
                ease: 'easeInOut',
              }}
            />
          )
        })}
      </motion.div>
    )
  }

  if (tier === 'jackpot') {
    return (
      <motion.div
        className="pointer-events-none absolute -inset-[22%] z-[5]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={presenceTransition}
        aria-hidden="true"
      >
        {shouldReduceMotion ? (
          <motion.div
            className="absolute inset-[12%] rounded-full blur-3xl"
            style={{
              backgroundImage: `radial-gradient(circle, rgb(${palette[0]} / 0.42), transparent 68%)`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.42, 0] }}
            transition={{ duration: 0.7, times: [0, 0.5, 1] }}
          />
        ) : (
          <>
            <JackpotHaloBurst palette={palette} phase="opening" />
            <JackpotHaloBurst palette={palette} phase="finale" />
          </>
        )}
      </motion.div>
    )
  }

  if (tier === 'ir') {
    return (
      <motion.div
        className="pointer-events-none absolute -inset-[46%] z-[5]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={presenceTransition}
        aria-hidden="true"
      >
        <motion.div
          className="absolute -inset-[12%] blur-[72px]"
          style={{
            backgroundImage: `radial-gradient(ellipse 34% 44% at 14% 28%, rgb(${palette[0]} / 0.62), rgb(${palette[0]} / 0.16) 48%, transparent 78%), radial-gradient(ellipse 42% 32% at 76% 12%, rgb(${palette[1]} / 0.58), rgb(${palette[1]} / 0.14) 50%, transparent 80%), radial-gradient(ellipse 32% 46% at 91% 64%, rgb(${palette[2]} / 0.62), rgb(${palette[2]} / 0.15) 48%, transparent 76%), radial-gradient(ellipse 43% 34% at 58% 92%, rgb(${palette[3]} / 0.58), rgb(${palette[3]} / 0.14) 52%, transparent 80%), radial-gradient(ellipse 35% 42% at 10% 76%, rgb(${palette[4]} / 0.62), rgb(${palette[4]} / 0.15) 48%, transparent 78%)`,
          }}
          initial={{ opacity: 0, scale: 0.76, x: -10, y: 8, rotate: -12 }}
          animate={
            shouldReduceMotion
              ? { opacity: [0, 0.3, 0] }
              : {
                  opacity: [0, 0.72, 0.5, 0],
                  scale: [0.76, 1, 1.08, 1.16],
                  x: [-10, 11],
                  y: [8, -9],
                  rotate: [-12, 78],
                }
          }
          transition={
            shouldReduceMotion
              ? { duration: 0.35, times: [0, 0.5, 1], ease: 'easeInOut' }
              : {
                  opacity: {
                    duration: 4.8,
                    times: [0, 0.2, 0.76, 1],
                    ease: 'easeInOut',
                  },
                  scale: {
                    duration: 4.8,
                    times: [0, 0.2, 0.76, 1],
                    ease: 'easeInOut',
                  },
                  x: { duration: 4.8, ease: 'easeInOut' },
                  y: { duration: 4.8, ease: 'easeInOut' },
                  rotate: { duration: 4.8, ease: 'linear' },
                }
          }
        />
        {palette.map((paletteColor, index) => {
          const positions = [
            { left: '-3%', top: '10%', width: '43%', height: '49%' },
            { left: '58%', top: '3%', width: '41%', height: '46%' },
            { left: '63%', top: '53%', width: '39%', height: '42%' },
            { left: '5%', top: '57%', width: '44%', height: '40%' },
            { left: '30%', top: '25%', width: '42%', height: '46%' },
          ] as const
          const position = positions[index]
          const initialRotation = -16 + index * 8
          const driftDirection = index % 2 === 0 ? 1 : -1

          return (
            <motion.div
              key={`ir-scatter-${index}-${paletteColor}`}
              className="absolute rounded-full blur-3xl"
              style={{
                ...position,
                backgroundImage: `radial-gradient(ellipse, rgb(${paletteColor} / 0.68), rgb(${paletteColor} / 0.16) 48%, transparent 76%)`,
              }}
              initial={{ opacity: 0, scale: 0.58, rotate: initialRotation }}
              animate={
                shouldReduceMotion
                  ? { opacity: [0, 0.3, 0] }
                  : {
                      opacity: [0, 0.58, 0.4, 0],
                      scale: [0.58, 1, 1.12, 1.26],
                      x: [0, driftDirection * 12, driftDirection * -6, driftDirection * 18],
                      y: [0, index >= 2 ? -10 : 8, index >= 2 ? -18 : 14, index >= 2 ? -26 : 22],
                      rotate: [initialRotation, initialRotation + 52 + index * 5],
                    }
              }
              transition={
                shouldReduceMotion
                  ? { duration: 0.35, times: [0, 0.5, 1], ease: 'easeInOut' }
                  : {
                      opacity: {
                        delay: index * 0.1,
                        duration: 4.4,
                        times: [0, 0.18, 0.72, 1],
                        ease: 'easeInOut',
                      },
                      scale: {
                        delay: index * 0.1,
                        duration: 4.4,
                        times: [0, 0.18, 0.72, 1],
                        ease: 'easeInOut',
                      },
                      x: { delay: index * 0.1, duration: 4.4, ease: 'easeInOut' },
                      y: { delay: index * 0.1, duration: 4.4, ease: 'easeInOut' },
                      rotate: { delay: index * 0.1, duration: 4.4, ease: 'linear' },
                    }
              }
            />
          )
        })}
      </motion.div>
    )
  }

  if (tier === 'sr') {
    return (
      <motion.div
        className="pointer-events-none absolute -inset-[28%] z-[5]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={presenceTransition}
        aria-hidden="true"
      >
        <motion.div
          className="absolute inset-[12%] rounded-full mix-blend-screen blur-3xl"
          style={{
            backgroundImage: `radial-gradient(circle, rgb(${color} / 0.56), transparent 68%)`,
          }}
          initial={{ opacity: 0, scale: 0.64 }}
          animate={
            shouldReduceMotion
              ? { opacity: [0, 0.4, 0] }
              : { opacity: [0, 0.76, 0.5, 0], scale: [0.64, 0.98, 1.1, 1.18] }
          }
          transition={{
            duration: shouldReduceMotion ? 0.35 : 4.4,
            times: shouldReduceMotion ? [0, 0.5, 1] : [0, 0.15, 0.7, 1],
            ease: 'easeOut',
          }}
        />
        {palette.slice(0, 3).map((paletteColor, index) => {
          const direction = index % 2 === 0 ? 1 : -1
          const initialRotation = (-20 + index * 8) * direction
          const driftX = (index - 1) * 14
          const driftY = index === 1 ? -11 : 8

          return (
            <motion.div
              key={`${index}-${paletteColor}`}
              className="absolute inset-0 rounded-full mix-blend-screen blur-2xl"
              style={{
                backgroundImage: `conic-gradient(from ${index * 120 + 12}deg, transparent 0deg 108deg, rgb(${paletteColor} / 0.86) 138deg, rgb(${paletteColor} / 0.29) 158deg, transparent 188deg 360deg)`,
                maskImage:
                  'radial-gradient(ellipse at center, transparent 0 30%, black 48%, transparent 76%)',
                WebkitMaskImage:
                  'radial-gradient(ellipse at center, transparent 0 30%, black 48%, transparent 76%)',
              }}
              initial={{ opacity: 0, scale: 0.68, rotate: initialRotation }}
              animate={
                shouldReduceMotion
                  ? { opacity: [0, 0.38, 0] }
                  : {
                      opacity: [0, 0.82, 0.56, 0],
                      scale: [0.68, 0.98 + index * 0.015, 1.1 + index * 0.015, 1.2],
                      x: [0, driftX * -0.35, driftX * 0.4, driftX],
                      y: [0, driftY * -0.3, driftY * 0.45, driftY],
                      rotate: [
                        initialRotation,
                        (22 + index * 12) * direction,
                        (48 + index * 14) * direction,
                        (76 + index * 16) * direction,
                      ],
                    }
              }
              transition={{
                delay: shouldReduceMotion ? 0 : index * 0.09,
                duration: shouldReduceMotion ? 0.35 : 4.25 - index * 0.05,
                times: shouldReduceMotion ? [0, 0.5, 1] : [0, 0.17, 0.7, 1],
                ease: 'easeInOut',
              }}
            />
          )
        })}
      </motion.div>
    )
  }

  return (
    <motion.div
      className="pointer-events-none absolute -inset-[40%] z-[5]"
      style={{ '--card-reveal-accent': '255 38 156' } as CSSProperties}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={presenceTransition}
      aria-hidden="true"
    >
      <motion.div
        className="absolute inset-[8%] rounded-full blur-2xl"
        style={{
          backgroundImage:
            'conic-gradient(from 30deg, transparent, rgb(var(--card-reveal-accent) / 0.78), transparent 24%, transparent 48%, rgb(255 171 220 / 0.68), transparent 70%)',
        }}
        initial={{ opacity: 0, scale: 0.64, rotate: -18 }}
        animate={
          shouldReduceMotion
            ? { opacity: [0, 0.5, 0] }
            : {
                opacity: [0, 0.82, 0.58, 0],
                scale: [0.64, 1, 1.18, 1.32],
                rotate: [-18, 18, 42, 58],
              }
        }
        transition={{
          duration: shouldReduceMotion ? 0.35 : 1.7,
          times: shouldReduceMotion ? [0, 0.5, 1] : [0, 0.16, 0.65, 1],
          ease: 'easeOut',
        }}
      />
    </motion.div>
  )
}

function RevealParticleBurst({
  cardId,
  color,
  palette,
  tier,
  phase = 'finale',
  shouldReduceMotion,
}: {
  cardId: string
  color: string
  palette: CardArtworkPalette
  tier: ParticleRevealTier
  phase?: 'opening' | 'finale'
  shouldReduceMotion: boolean
}) {
  const isOpeningBurst = tier === 'jackpot' && phase === 'opening'
  const particles = createRevealParticles(cardId, tier).slice(
    0,
    isOpeningBurst
      ? 28
      : shouldReduceMotion
        ? tier === 'jackpot' || tier === 'sr'
          ? 12
          : 8
        : undefined,
  )
  const peakOpacity = isOpeningBurst ? 0.9 : tier === 'ir' ? 0.72 : 1

  return (
    <motion.div
      className="pointer-events-none absolute -inset-[22%] z-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: shouldReduceMotion ? 0.1 : 0.24, ease: 'easeOut' }}
      aria-hidden="true"
    >
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className={cn('card-reveal-particle', getParticleClassName(particle.kind))}
          style={
            {
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              width: particle.size,
              height:
                particle.kind === 'streak' ? Math.max(1, particle.size * 0.08) : particle.size,
              rotate: particle.rotation,
              '--card-reveal-color': getParticleColor(tier, color, palette, particle.colorSlot),
            } as MotionStyle & { '--card-reveal-color': string }
          }
          initial={{ opacity: 0, scale: 0.2, x: 0, y: 0 }}
          animate={
            shouldReduceMotion
              ? {
                  opacity: [0, tier === 'ir' ? 0.38 : 0.8, 0],
                  scale: [0.7, 1, 0.85],
                }
              : {
                  opacity: [0, peakOpacity, peakOpacity * 0.82, 0],
                  scale: isOpeningBurst
                    ? [0.2, 0.72, 1.04, 0.38]
                    : tier === 'ir'
                      ? [0.2, 0.7, 1.02, 0.45]
                      : [0.2, 0.85, 1.2, 0.45],
                  x: [
                    0,
                    particle.travelX * (isOpeningBurst ? 0.12 : 0.18),
                    particle.travelX * (isOpeningBurst ? 0.42 : 0.62),
                    particle.travelX * (isOpeningBurst ? 0.72 : 1),
                  ],
                  y: [
                    0,
                    particle.travelY * (isOpeningBurst ? 0.12 : 0.18),
                    particle.travelY * (isOpeningBurst ? 0.42 : 0.62),
                    particle.travelY * (isOpeningBurst ? 0.72 : 1),
                  ],
                }
          }
          transition={{
            delay: shouldReduceMotion
              ? 0
              : isOpeningBurst
                ? 0.06 + (particle.id % 8) * 0.07
                : particle.delay,
            duration: shouldReduceMotion
              ? 0.35
              : isOpeningBurst
                ? 2 + (particle.id % 4) * 0.14
                : particle.duration,
            times: shouldReduceMotion
              ? [0, 0.5, 1]
              : isOpeningBurst
                ? [0, 0.16, 0.7, 1]
                : [0, 0.18, 0.58, 1],
            ease: 'easeOut',
          }}
        />
      ))}
    </motion.div>
  )
}

const getParticleClassName = (kind: RevealParticleKind): string => {
  switch (kind) {
    case 'glint':
      return 'card-reveal-glint'
    case 'streak':
      return 'card-reveal-streak'
    case 'mote':
      return 'card-reveal-mote'
  }
}

const ACE_SPEC_PARTICLE_COLORS = [
  '255 255 255',
  '255 186 225',
  '255 92 181',
  '255 38 156',
  '216 27 117',
] as const

const getParticleColor = (
  tier: ParticleRevealTier,
  artworkColor: string,
  artworkPalette: CardArtworkPalette,
  colorSlot: number,
): string => {
  if (tier === 'rr' || tier === 'ir' || tier === 'sr') {
    return artworkPalette[colorSlot % artworkPalette.length]
  }
  if (tier === 'ace-spec') {
    return ACE_SPEC_PARTICLE_COLORS[colorSlot % ACE_SPEC_PARTICLE_COLORS.length]
  }
  if (tier === 'jackpot') {
    return colorSlot === 0 ? '255 255 255' : artworkPalette[(colorSlot - 1) % 3]
  }
  return artworkColor
}

const isParticleRevealTier = (tier: CardRevealTier): tier is ParticleRevealTier =>
  tier !== 'standard' && tier !== 'holo'

const getGlowStrength = (tier: CardRevealTier): { primary: number; secondary: number } => {
  switch (tier) {
    case 'holo':
      return { primary: 0.38, secondary: 0.17 }
    case 'ir':
      return { primary: 0.36, secondary: 0.16 }
    case 'sr':
    case 'ace-spec':
      return { primary: 0.4, secondary: 0.18 }
    case 'jackpot':
      return { primary: 0.42, secondary: 0.2 }
    default:
      return { primary: 0.3, secondary: 0.12 }
  }
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
                    cardId={card.id}
                    finish={card.finish}
                    rarity={card.rarity}
                    supertype={card.supertype}
                    isEvolved={card.isEvolved}
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
