import { useCallback, useRef, useState } from 'react'

import { clamp } from '../webgl/number-utils'

interface BoosterFallbackCutProps {
  imageUrl: string
  canTear: boolean
  onCut: () => void
  onProgressChange?: (progress: number) => void
}

// Drag distance (as a fraction of width) needed to fully open without WebGL.
const CUT_TRAVEL = 0.94
const LAUNCH_MS = 980
const TOP_STRIP_HEIGHT = 14

/**
 * Non-WebGL fallback so the booster can still be opened by dragging across it.
 * Dragging cuts the top; once cut, the top strip launches up and away while
 * light bursts from the opening, then we hand off to the reveal.
 */
export function BoosterFallbackCut({
  imageUrl,
  canTear,
  onCut,
  onProgressChange,
}: BoosterFallbackCutProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const startXRef = useRef(0)
  const cutRef = useRef(false)
  const [dragging, setDragging] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [progress, setProgress] = useState(0)

  const updateProgress = useCallback(
    (value: number) => {
      setProgress(value)
      onProgressChange?.(value)
    },
    [onProgressChange],
  )

  const launch = useCallback(() => {
    cutRef.current = true
    setDragging(false)
    setLaunching(true)
    updateProgress(1)
    window.setTimeout(onCut, LAUNCH_MS)
  }, [onCut, updateProgress])

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!canTear || cutRef.current) return
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      startXRef.current = event.clientX
      setDragging(true)
    },
    [canTear],
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging || cutRef.current) return
      const width = containerRef.current?.getBoundingClientRect().width ?? 1
      const delta = event.clientX - startXRef.current
      setDirection(delta >= 0 ? 1 : -1)
      const travelled = Math.abs(delta) / Math.max(width, 1)
      const next = clamp(travelled / CUT_TRAVEL, 0, 1)
      updateProgress(next)
      if (next >= 1) launch()
    },
    [dragging, launch, updateProgress],
  )

  const handlePointerUp = useCallback(() => {
    if (cutRef.current) return
    setDragging(false)
    updateProgress(0)
  }, [updateProgress])

  const hasVisibleCut = progress > 0.04 || launching
  const transformOrigin = direction > 0 ? '100% 14%' : '0% 14%'
  const rotation = direction * progress * 10
  const launchRotation = direction * 13

  const bodyStyle = hasVisibleCut
    ? {
        clipPath: `inset(${TOP_STRIP_HEIGHT}% 0 0 0)`,
      }
    : undefined

  const lidStyle = launching
    ? {
        clipPath: `inset(0 0 ${100 - TOP_STRIP_HEIGHT}% 0)`,
        transformOrigin,
        transform: `translateY(-18%) translateX(${direction * 4}%) rotate(${launchRotation}deg) rotateX(28deg) scale(1.02)`,
        opacity: 1,
        transition: `transform ${LAUNCH_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
      }
    : {
        clipPath: `inset(0 0 ${100 - TOP_STRIP_HEIGHT}% 0)`,
        transformOrigin,
        transform: `translateY(${-progress * 10}%) translateX(${direction * progress * 2}%) rotate(${rotation}deg) rotateX(${progress * 18}deg) scale(${1 + progress * 0.01})`,
        opacity: 1,
        transition: dragging ? 'none' : 'transform 240ms ease-out',
      }

  return (
    <div
      ref={containerRef}
      className="relative size-full cursor-grab touch-none select-none [perspective:900px] active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <img
        src={imageUrl}
        alt=""
        crossOrigin="anonymous"
        draggable={false}
        className="size-full object-contain drop-shadow-2xl"
        style={bodyStyle}
        aria-hidden="true"
      />

      {/* The torn-off top strip (same image, clipped) that flies away. */}
      <img
        src={imageUrl}
        crossOrigin="anonymous"
        draggable={false}
        alt=""
        className="pointer-events-none absolute inset-0 size-full object-contain drop-shadow-2xl will-change-transform"
        style={lidStyle}
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute left-[13%] top-[14%] h-1 w-[74%] origin-left bg-amber-100 shadow-[0_0_20px_rgba(250,204,21,0.9)]"
        style={{
          opacity: progress,
          clipPath:
            'polygon(0 0, 4% 100%, 8% 0, 12% 100%, 16% 0, 20% 100%, 24% 0, 28% 100%, 32% 0, 36% 100%, 40% 0, 44% 100%, 48% 0, 52% 100%, 56% 0, 60% 100%, 64% 0, 68% 100%, 72% 0, 76% 100%, 80% 0, 84% 100%, 88% 0, 92% 100%, 96% 0, 100% 100%)',
          transform: `scaleX(${progress})`,
          transition: dragging ? 'none' : 'opacity 180ms ease-out, transform 240ms ease-out',
        }}
        aria-hidden="true"
      />
    </div>
  )
}
