import { useCallback, useEffect, useRef, useState } from 'react'

import { m } from '@/paraglide/messages'
import { BoosterTearRenderer } from '../webgl/booster-tear-renderer'
import { BoosterFallbackCut } from './BoosterFallbackCut'

interface InteractiveBoosterProps {
  imageUrl: string
  setName: string
  // Whether the player may start ripping right now (authenticated, off cooldown,
  // not already opening). Read live, so toggling it never remounts the canvas.
  canTear: boolean
  autoTear: boolean
  onCut: () => void
  onProgressChange?: (progress: number) => void
}

export function InteractiveBooster({
  imageUrl,
  setName,
  canTear,
  autoTear,
  onCut,
  onProgressChange,
}: InteractiveBoosterProps) {
  const cutRef = useRef(false)
  const rendererRef = useRef<BoosterTearRenderer | undefined>(undefined)
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
          rendererRef.current = renderer
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
        if (rendererRef.current === renderer) rendererRef.current = undefined
        renderer?.dispose()
      }
    },
    [canTear, imageUrl, onCut, onProgressChange],
  )

  useEffect(() => {
    if (autoTear) rendererRef.current?.completeWithAnimation()
  }, [autoTear])

  if (fallback) {
    return (
      <BoosterFallbackCut
        imageUrl={imageUrl}
        canTear={canTear}
        autoTear={autoTear}
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
        className="absolute left-[-12%] top-[-8%] h-[116%] w-[124%] cursor-grab touch-none select-none active:cursor-grabbing"
        role="img"
        aria-label={m.packs_tear_aria({ name: setName })}
      />
    </div>
  )
}
