import type { PokemonCardSummary } from '@tcg-collection/shared'

import { FoilCardImage } from './FoilCardImage'

interface CardImageDialogProps {
  card: PokemonCardSummary
  onClose: () => void
}

export function CardImageDialog({ card, onClose }: CardImageDialogProps) {
  const imageUrl = card.imageLarge ?? card.imageSmall

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={card.name}
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[95vh] w-[min(28rem,92vw)] items-center justify-center"
        onClick={(event) => event.stopPropagation()}
      >
        {imageUrl ? (
          <FoilCardImage
            src={imageUrl}
            alt={card.name}
            finish={card.finish}
            className="max-h-[95vh] w-full object-contain drop-shadow-2xl"
          />
        ) : (
          <div className="aspect-63/88 w-full rounded-lg bg-muted" aria-hidden="true" />
        )}
      </div>
    </div>
  )
}
