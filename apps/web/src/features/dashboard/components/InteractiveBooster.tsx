import { useCallback, useRef, useState } from 'react'

import { m } from '@/paraglide/messages'
import { BoosterTearRenderer } from '../webgl/booster-tear-renderer'
import { BoosterFallbackCut } from './BoosterFallbackCut'

interface InteractiveBoosterProps {
  imageUrl: string
  setName: string
  // Whether the player may start ripping right now (authenticated, off cooldown,
  // not already opening). Read live, so toggling it never remounts the canvas.
  canTear: boolean
  onCut: () => void
  onProgressChange?: (progress: number) => void
}

export function InteractiveBooster({
  imageUrl,
  setName,
  canTear,
  onCut,
  onProgressChange,
}: InteractiveBoosterProps) {
  const cutRef = useRef(false)
  const [, setProgress] = useState(0)
  const [fallback, setFallback] = useState(false)

  const mountCanvas = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return

      const currentCanvas = canvas
      let renderer: BoosterTearRenderer | undefined
      let disposed = false

      async function startRenderer() {
        try {
          renderer = new BoosterTearRenderer(currentCanvas, {
            imageUrl,
            onProgress: (value) => {
              setProgress(value)
              onProgressChange?.(value)
            },
            onComplete: () => {
              if (cutRef.current) return
              cutRef.current = true
              onCut()
            },
            canTear: () => canTear,
          })
          await renderer.initialize()
          if (disposed) {
            renderer.dispose()
            return
          }
          renderer.start()
        } catch (error) {
          renderer?.dispose()
          if (!disposed) {
            console.warn('[InteractiveBooster] WebGL tear unavailable, using image', error)
            setFallback(true)
          }
        }
      }

      void startRenderer()

      return () => {
        disposed = true
        renderer?.dispose()
      }
    },
    [canTear, imageUrl, onCut, onProgressChange],
  )

  if (fallback) {
    return (
      <BoosterFallbackCut
        imageUrl={imageUrl}
        canTear={canTear}
        onCut={() => {
          if (cutRef.current) return
          cutRef.current = true
          onCut()
        }}
        onProgressChange={onProgressChange}
      />
    )
  }

  return (
    <div className="relative size-full">
      <canvas
        ref={mountCanvas}
        className="size-full cursor-grab touch-none select-none active:cursor-grabbing"
        role="img"
        aria-label={m.packs_tear_aria({ name: setName })}
      />
    </div>
  )
}
