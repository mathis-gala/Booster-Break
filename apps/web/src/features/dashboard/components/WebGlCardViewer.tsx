import { useCallback, useEffect, useRef, useState } from 'react'
import type { CardFinish } from '@tcg-collection/shared'
import { motion, type MotionValue, useMotionValue, useReducedMotion } from 'motion/react'

import { cn } from '@/lib/utils'
import type { FoilMask, FoilTuningOverrides } from '../lib/card-foil'
import { CardViewerRenderer } from '../webgl/card-viewer-renderer'
import { FoilCardImage } from './FoilCardImage'

interface WebGlCardViewerProps {
  frontImageUrl: string
  alt: string
  cardId: string
  finish?: CardFinish
  rarity?: string
  supertype?: string
  isEvolved?: boolean
  foilTuning?: FoilTuningOverrides
  foilMask?: FoilMask
  className?: string
  interactive?: boolean
  rotationX?: MotionValue<number>
  rotationY?: MotionValue<number>
  cameraDistance?: number
  onReady?: () => void
  resetOnInteractiveDisable?: boolean
  rendering?: boolean
  rotationLimit?: number
}

export function WebGlCardViewer({
  frontImageUrl,
  alt,
  cardId,
  finish,
  rarity,
  supertype,
  isEvolved,
  foilTuning,
  foilMask,
  className,
  interactive = true,
  rotationX,
  rotationY,
  cameraDistance,
  onReady,
  resetOnInteractiveDisable = false,
  rendering = true,
  rotationLimit,
}: WebGlCardViewerProps) {
  const shouldReduceMotion = useReducedMotion() === true
  const motionEnabled = foilTuning?.motion !== false && !shouldReduceMotion
  const effectiveFoilTuning: FoilTuningOverrides = { ...foilTuning, motion: motionEnabled }
  const rendererRef = useRef<CardViewerRenderer | undefined>(undefined)
  const mountTokenRef = useRef(0)
  const rotationXRef = useRef(rotationX)
  const rotationYRef = useRef(rotationY)
  const onReadyRef = useRef(onReady)
  const interactiveRef = useRef(interactive)
  const renderingRef = useRef(rendering)
  const foilTuningRef = useRef<FoilTuningOverrides>(effectiveFoilTuning)
  const foilMaskRef = useRef(foilMask)
  const fallbackRotationX = useMotionValue(0)
  const fallbackRotationY = useMotionValue(0)
  const [fallbackReason, setFallbackReason] = useState<string>()

  const mountCanvas = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      rendererRef.current?.dispose()
      rendererRef.current = undefined

      if (!canvas) {
        return undefined
      }

      const currentCanvas = canvas
      const mountToken = mountTokenRef.current + 1
      mountTokenRef.current = mountToken
      let renderer: CardViewerRenderer | undefined
      let isDisposed = false

      setFallbackReason(undefined)

      async function startRenderer() {
        try {
          renderer = new CardViewerRenderer(currentCanvas, {
            frontImageUrl,
            cardId,
            finish,
            rarity,
            supertype,
            isEvolved,
            foilTuning: foilTuningRef.current,
            foilMask: foilMaskRef.current,
            reduceMotion: shouldReduceMotion,
            interactive: interactiveRef.current,
            cameraDistance,
            rotationLimit,
            onContextFailure: (reason) => {
              if (!isDisposed && mountTokenRef.current === mountToken) {
                setFallbackReason(reason)
              }
            },
          })
          rendererRef.current = renderer
          await renderer.initialize()

          if (isDisposed || mountTokenRef.current !== mountToken) {
            renderer.dispose()
            return
          }

          renderer.setTargetRotation(
            rotationXRef.current?.get() ?? 0,
            rotationYRef.current?.get() ?? 0,
          )
          renderer.start(interactiveRef.current, renderingRef.current)
          onReadyRef.current?.()
        } catch (error) {
          renderer?.dispose()

          if (!isDisposed && mountTokenRef.current === mountToken) {
            setFallbackReason(error instanceof Error ? error.message : 'Unable to start WebGL')
            onReadyRef.current?.()
          }
        }
      }

      void startRenderer()

      return () => {
        isDisposed = true
        renderer?.dispose()

        if (rendererRef.current === renderer) {
          rendererRef.current = undefined
        }
      }
    },
    [
      cameraDistance,
      cardId,
      finish,
      frontImageUrl,
      isEvolved,
      rarity,
      rotationLimit,
      shouldReduceMotion,
      supertype,
    ],
  )

  const syncExternalRotation = useCallback(() => {
    fallbackRotationX.set((rotationXRef.current?.get() ?? 0) * (180 / Math.PI))
    fallbackRotationY.set((rotationYRef.current?.get() ?? 0) * (180 / Math.PI))
    rendererRef.current?.setTargetRotation(
      rotationXRef.current?.get() ?? 0,
      rotationYRef.current?.get() ?? 0,
    )
  }, [fallbackRotationX, fallbackRotationY])

  useEffect(() => {
    rotationXRef.current = rotationX
    rotationYRef.current = rotationY
    onReadyRef.current = onReady
    syncExternalRotation()
  }, [onReady, rotationX, rotationY, syncExternalRotation])

  useEffect(() => {
    interactiveRef.current = interactive
    rendererRef.current?.setInteractive(interactive)
    if (!interactive && resetOnInteractiveDisable) {
      rendererRef.current?.setTargetRotation(0, 0)
    }
  }, [interactive, resetOnInteractiveDisable])

  useEffect(() => {
    renderingRef.current = rendering
    rendererRef.current?.setRendering(rendering)
  }, [rendering])

  useEffect(() => {
    foilMaskRef.current = foilMask
    rendererRef.current?.setFoilMask(foilMask)
  }, [foilMask])

  useEffect(() => {
    const nextTuning: FoilTuningOverrides = {
      intensity: foilTuning?.intensity,
      glare: foilTuning?.glare,
      textureScale: foilTuning?.textureScale,
      lightX: foilTuning?.lightX,
      lightY: foilTuning?.lightY,
      motion: motionEnabled,
    }
    foilTuningRef.current = nextTuning
    rendererRef.current?.setFoilTuning(nextTuning)
  }, [
    foilTuning?.glare,
    foilTuning?.intensity,
    foilTuning?.lightX,
    foilTuning?.lightY,
    foilTuning?.textureScale,
    motionEnabled,
  ])

  useEffect(() => {
    const unsubscribeX = rotationX?.on('change', syncExternalRotation)
    const unsubscribeY = rotationY?.on('change', syncExternalRotation)

    return () => {
      unsubscribeX?.()
      unsubscribeY?.()
    }
  }, [rotationX, rotationY, syncExternalRotation])

  if (fallbackReason) {
    return (
      <motion.span
        className={cn(
          'relative block aspect-63/88 w-full max-w-[calc(95vh*63/88)] [&>span]:size-full',
          className,
        )}
        style={{
          rotateX: fallbackRotationX,
          rotateY: fallbackRotationY,
          transformPerspective: 1200,
        }}
      >
        <FoilCardImage
          src={frontImageUrl}
          alt={alt}
          cardId={cardId}
          finish={finish}
          rarity={rarity}
          supertype={supertype}
          isEvolved={isEvolved}
          foilTuning={effectiveFoilTuning}
          foilMask={foilMask}
          rotationX={rotationX}
          rotationY={rotationY}
          className="size-full rounded-lg object-fill"
        />
      </motion.span>
    )
  }

  return (
    <canvas
      ref={mountCanvas}
      className={cn(
        'aspect-63/88 max-h-[95vh] w-full touch-none',
        interactive && 'cursor-grab active:cursor-grabbing',
        className,
      )}
      role="img"
      aria-label={alt}
    />
  )
}
