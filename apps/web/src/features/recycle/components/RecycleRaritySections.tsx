import { formatRarity } from '@/features/i18n/rarity-labels'
import { m } from '@/paraglide/messages'

import { RecycleCardTile } from './RecycleCardTile'
import {
  getSelectedQuantity,
  recycleKey,
  type RecyclePageSegment,
  type RecycleSelection,
} from '../lib/recycle-utils'

interface RecycleRaritySectionsProps {
  segments: RecyclePageSegment[]
  selection: RecycleSelection
  onChange: (key: string, quantity: number) => void
  /** Full-group reward yield for a rarity rank (independent of the page/search). */
  rewardForRank: (rarityRank: number) => number
}

export function RecycleRaritySections({
  segments,
  selection,
  onChange,
  rewardForRank,
}: RecycleRaritySectionsProps) {
  return (
    <div className="flex flex-col gap-6">
      {segments.map((segment, segmentIndex) => {
        const groupRewards = rewardForRank(segment.group.rarityRank)

        return (
          <section
            key={`${segment.group.rarityRank}-${segmentIndex}`}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-black">{formatRarity(segment.group.rarity)}</h3>
              {groupRewards > 0 ? (
                <span className="rounded-full bg-sidebar px-2 py-0.5 text-[0.7rem] font-black text-sidebar-foreground">
                  {m.recycle_group_yield({ count: groupRewards })}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {segment.cards.map((card) => (
                <RecycleCardTile
                  key={recycleKey(card)}
                  card={card}
                  selected={getSelectedQuantity(selection, card)}
                  onChange={(quantity) => onChange(recycleKey(card), quantity)}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
