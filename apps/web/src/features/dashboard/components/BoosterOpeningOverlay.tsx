import { useCallback, useState } from 'react'
import { ScissorsIcon } from 'lucide-react'

import { m } from '@/paraglide/messages'
import { InteractiveBooster } from './InteractiveBooster'

interface BoosterOpeningOverlayProps {
  boosterImageUrl: string
  setName: string
  onComplete: () => void
}

export function BoosterOpeningOverlay({
  boosterImageUrl,
  setName,
  onComplete,
}: BoosterOpeningOverlayProps) {
  const [progress, setProgress] = useState(0)
  const hintOpacity = Math.max(0, 1 - progress * 2.4)

  const handleProgressChange = useCallback((nextProgress: number) => {
    setProgress(nextProgress)
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-cyan-950/80 p-4 backdrop-blur-md focus:outline-none"
      role="dialog"
      aria-modal="true"
      aria-label={m.packs_tear_aria({ name: setName })}
      tabIndex={-1}
      autoFocus
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,oklch(0.72_0.16_255_/_28%),transparent_55%)]"
        aria-hidden="true"
      />

      <div className="relative flex flex-col items-center">
        <div className="relative aspect-[2.32/4.2] h-[min(84vh,44rem)] max-w-full">
          <InteractiveBooster
            imageUrl={boosterImageUrl}
            setName={setName}
            canTear
            onCut={onComplete}
            onProgressChange={handleProgressChange}
          />
        </div>

        {/* Small, unobtrusive helper kept off the booster itself. */}
        <p
          className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-white/70 transition-opacity duration-200"
          style={{ opacity: hintOpacity }}
        >
          <ScissorsIcon className="size-3.5 animate-pulse" aria-hidden="true" />
          {m.packs_tear_instruction()}
        </p>

        <button
          type="button"
          className="mt-2 text-xs font-semibold text-white/45 underline-offset-4 transition hover:text-white/80 hover:underline"
          onClick={onComplete}
        >
          {m.packs_tear_skip()}
        </button>
      </div>
    </div>
  )
}
