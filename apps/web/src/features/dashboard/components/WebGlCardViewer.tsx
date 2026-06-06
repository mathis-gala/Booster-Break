import { useCallback, useRef, useState } from 'react'
import type { CardFinish } from '@tcg-collection/shared'

import { cn } from '@/lib/utils'
import { CardViewerRenderer } from '../webgl/card-viewer-renderer'
import { FoilCardImage } from './FoilCardImage'

interface WebGlCardViewerProps {
  frontImageUrl: string
  alt: string
  finish?: CardFinish
  className?: string
}

export function WebGlCardViewer({
  frontImageUrl,
  alt,
  finish,
  className,
}: WebGlCardViewerProps) {
  const rendererRef = useRef<CardViewerRenderer | undefined>(undefined)
  const mountTokenRef = useRef(0)
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
          })
          rendererRef.current = renderer
          await renderer.initialize()

          if (isDisposed || mountTokenRef.current !== mountToken) {
            renderer.dispose()
            return
          }

          renderer.start()
        } catch (error) {
          renderer?.dispose()

          if (!isDisposed && mountTokenRef.current === mountToken) {
            setFallbackReason(error instanceof Error ? error.message : 'Unable to start WebGL')
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
    [finish, frontImageUrl],
  )

  if (fallbackReason) {
    return (
      <FoilCardImage
        src={frontImageUrl}
        alt={alt}
        finish={finish}
        className={cn('max-h-[95vh] w-full rounded-lg object-contain drop-shadow-2xl', className)}
      />
    )
  }

  return (
    <canvas
      ref={mountCanvas}
      className={cn(
        'aspect-63/88 max-h-[95vh] w-full touch-none cursor-grab active:cursor-grabbing',
        className,
      )}
      role="img"
      aria-label={alt}
    />
  )
}
