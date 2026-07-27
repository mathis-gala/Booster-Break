import { useCallback, useEffect, useRef, useState } from 'react'
import type { CardFinish } from '@tcg-collection/shared'
import { motion, type MotionValue, useMotionValue } from 'motion/react'

import { cn } from '@/lib/utils'
import { CardViewerRenderer } from '../webgl/card-viewer-renderer'
import { FoilCardImage } from './FoilCardImage'

interface WebGlCardViewerProps {
  frontImageUrl: string
  alt: string
  finish?: CardFinish
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
  finish,
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
  const rendererRef = useRef<CardViewerRenderer | undefined>(undefined)
  const mountTokenRef = useRef(0)
  const rotationXRef = useRef(rotationX)
  const rotationYRef = useRef(rotationY)
  const onReadyRef = useRef(onReady)
  const interactiveRef = useRef(interactive)
  const renderingRef = useRef(rendering)
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
            finish,
            interactive: interactiveRef.current,
            cameraDistance,
            rotationLimit,
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
    [cameraDistance, finish, frontImageUrl, rotationLimit],
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
          'relative block aspect-63/88 max-h-[95vh] w-full [&>span]:size-full',
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
          finish={finish}
          className="size-full rounded-lg object-contain"
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
