import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RecycleIcon, Wand2Icon, XIcon } from 'lucide-react'
import type { PokemonCardSummary } from '@tcg-collection/shared'
import { RECYCLE_COST } from '@tcg-collection/shared'

import { useLocale } from '@/features/i18n/useLocale'
import { formatRarity } from '@/features/i18n/rarity-labels'
import { usePokemonCollectionAllQueryOption } from '@/lib/queries/pokemon'
import { useRecyclePokemonCardsMutationOption } from '@/lib/mutations/pokemon'
import { toast } from '@/features/toast/toast-store'
import { m } from '@/paraglide/messages'

import { RecycleCardTile } from '../components/RecycleCardTile'
import { RecycleRewardDialog } from '../components/RecycleRewardDialog'
import {
  buildAutoSelection,
  getSelectedQuantity,
  groupCardsByRarity,
  groupRewardCount,
  recycleKey,
  recyclableSurplusCount,
  selectionToItems,
  totalRewardCount,
  totalSelectedCount,
  type RecycleSelection,
} from '../lib/recycle-utils'

export function RecycleView() {
  useLocale()
  const queryClient = useQueryClient()
  const [selection, setSelection] = useState<RecycleSelection>({})
  const [rewards, setRewards] = useState<PokemonCardSummary[] | null>(null)

  const collection = useQuery(
    usePokemonCollectionAllQueryOption({ sort: 'rarity', source: 'owned' }),
  )
  const cards = useMemo(() => collection.data?.cards ?? [], [collection.data?.cards])
  const groups = useMemo(() => groupCardsByRarity(cards), [cards])

  const rewardCount = totalRewardCount(selection, groups)
  const selectedCount = totalSelectedCount(selection)
  const autoSurplus = useMemo(() => recyclableSurplusCount(cards), [cards])

  const recycleMutation = useMutation(
    useRecyclePokemonCardsMutationOption(queryClient, {
      onSuccess: (result) => {
        setSelection({})
        setRewards(result.awardedCards)
        toast.show(m.recycle_success({ count: result.rewardCount }), 'success')
      },
      onError: (error) => {
        toast.show(error.message, 'error')
      },
    }),
  )

  function updateSelection(key: string, quantity: number) {
    setSelection((current) => {
      const next = { ...current }

      if (quantity <= 0) {
        delete next[key]
      } else {
        next[key] = quantity
      }

      return next
    })
  }

  function handleAuto() {
    const autoSelection = buildAutoSelection(cards)

    if (totalRewardCount(autoSelection, groups) === 0) {
      toast.show(m.recycle_auto_empty({ cost: RECYCLE_COST }), 'error')

      return
    }

    setSelection(autoSelection)
  }

  function handleRecycle() {
    const items = selectionToItems(selection, cards)

    if (items.length === 0) {
      return
    }

    recycleMutation.mutate({ items })
  }

  const isBusy = recycleMutation.isPending
  const hasRecyclableCards = groups.length > 0

  return (
    <div className="flex w-full flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-black">{m.recycle_title()}</h1>
        <p className="max-w-2xl text-sm font-medium text-muted-foreground">
          {m.recycle_description({ cost: RECYCLE_COST })}
        </p>
      </header>

      <div className="sticky top-16 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/95 p-3 backdrop-blur md:top-3">
        <div className="text-sm font-semibold text-muted-foreground">
          {m.recycle_summary({ selected: selectedCount, rewards: rewardCount })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedCount > 0 ? (
            <button
              type="button"
              disabled={isBusy}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-black transition-colors enabled:hover:border-sidebar disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setSelection({})}
            >
              <XIcon className="size-4" aria-hidden="true" />
              {m.recycle_unselect_all()}
            </button>
          ) : null}
          <button
            type="button"
            disabled={isBusy || autoSurplus === 0}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-black transition-colors enabled:hover:border-sidebar disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={handleAuto}
          >
            <Wand2Icon className="size-4" aria-hidden="true" />
            {m.recycle_auto({ count: autoSurplus })}
          </button>
          <button
            type="button"
            disabled={isBusy || rewardCount === 0}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-sidebar px-4 py-2 text-sm font-black text-sidebar-foreground transition-colors enabled:hover:bg-sidebar/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={handleRecycle}
          >
            <RecycleIcon className="size-4" aria-hidden="true" />
            {isBusy ? m.recycle_action_pending() : m.recycle_action({ count: rewardCount })}
          </button>
        </div>
      </div>

      {collection.isPending ? (
        <p className="py-12 text-center text-sm font-medium text-muted-foreground">
          {m.recycle_loading()}
        </p>
      ) : !hasRecyclableCards ? (
        <p className="py-12 text-center text-sm font-medium text-muted-foreground">
          {m.recycle_empty()}
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => {
            const groupRewards = groupRewardCount(selection, group)

            return (
              <section key={group.rarityRank} className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-black">{formatRarity(group.rarity)}</h2>
                  {groupRewards > 0 ? (
                    <span className="rounded-full bg-sidebar px-2 py-0.5 text-[0.7rem] font-black text-sidebar-foreground">
                      {m.recycle_group_yield({ count: groupRewards })}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.cards.map((card) => (
                    <RecycleCardTile
                      key={recycleKey(card)}
                      card={card}
                      selected={getSelectedQuantity(selection, card)}
                      onChange={(quantity) => updateSelection(recycleKey(card), quantity)}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {rewards ? <RecycleRewardDialog cards={rewards} onClose={() => setRewards(null)} /> : null}
    </div>
  )
}
