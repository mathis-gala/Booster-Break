import type { PokemonCardSummary } from '@tcg-collection/shared'

import { formatRarity } from '@/features/i18n/rarity-labels'
import { FoilCardImage } from '@/features/dashboard/components/FoilCardImage'
import { m } from '@/paraglide/messages'

interface RecycleRewardDialogProps {
  cards: PokemonCardSummary[]
  onClose: () => void
}

export function RecycleRewardDialog({ cards, onClose }: RecycleRewardDialogProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={m.recycle_reward_title({ count: cards.length })}
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-[min(40rem,94vw)] flex-col gap-4 overflow-y-auto rounded-2xl border border-border bg-background p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="text-center">
          <p className="text-lg font-black">{m.recycle_reward_title({ count: cards.length })}</p>
          <p className="text-sm font-medium text-muted-foreground">{m.recycle_reward_subtitle()}</p>
        </div>

        <div className="grid grid-cols-3 justify-items-center gap-3 sm:grid-cols-4">
          {cards.map((card, index) => (
            <article key={`${card.id}-${card.finish ?? 'normal'}-${index}`} className="w-full max-w-28">
              {card.imageSmall ? (
                <FoilCardImage
                  src={card.imageSmall}
                  alt={card.name}
                  finish={card.finish}
                  className="aspect-63/88 w-full rounded-md object-cover"
                />
              ) : (
                <div className="aspect-63/88 w-full rounded-md bg-muted" aria-hidden="true" />
              )}
              <p className="mt-1.5 truncate text-[0.66rem] font-black">{card.name}</p>
              <p className="truncate text-[0.62rem] font-semibold text-muted-foreground">
                {formatRarity(card.rarity)}
              </p>
            </article>
          ))}
        </div>

        <button
          type="button"
          className="mt-1 w-full cursor-pointer rounded-lg bg-sidebar px-4 py-2.5 text-sm font-black text-sidebar-foreground transition-colors hover:bg-sidebar/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onClose}
        >
          {m.recycle_reward_close()}
        </button>
      </div>
    </div>
  )
}
