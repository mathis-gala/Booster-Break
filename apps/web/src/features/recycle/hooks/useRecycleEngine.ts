import { useCallback, useMemo, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AwardedCard, UserCollectionCard } from '@tcg-collection/shared'

import { usePokemonSetsQueryOption } from '@/lib/queries/pokemon'
import { useRecyclePokemonCardsMutationOption } from '@/lib/mutations/pokemon'
import { toast } from '@/features/toast/toast-store'

import type { RecycleConsumedCard } from '../components/RecycleAnimationOverlay'
import {
  buildAutoSelection,
  buildRecycleBatches,
  groupCardsByRarity,
  groupRewardCount,
  recyclableSurplusCount,
  selectionToItems,
  totalRewardCount,
  totalSelectedCount,
  type RecycleSelection,
} from '../lib/recycle-utils'

export interface RecycleAnimationState {
  batches: RecycleConsumedCard[][]
  rewards: AwardedCard[] | null
}

const preloadRewardImages = (rewards: AwardedCard[]) => {
  for (const card of rewards) {
    const url = card.imageLarge ?? card.imageSmall

    if (url) {
      const image = new Image()
      image.src = url
    }
  }
}

export function useRecycleEngine(
  cards: UserCollectionCard[],
  selection: RecycleSelection,
  setSelection: Dispatch<SetStateAction<RecycleSelection>>,
) {
  const queryClient = useQueryClient()
  const [animation, setAnimation] = useState<RecycleAnimationState | null>(null)

  const groups = useMemo(() => groupCardsByRarity(cards), [cards])
  const rewardCount = totalRewardCount(selection, groups)
  const selectedCount = totalSelectedCount(selection)
  const autoSurplus = useMemo(() => recyclableSurplusCount(cards), [cards])

  const rewardByRank = useMemo(() => {
    const map = new Map<number, number>()

    for (const group of groups) {
      map.set(group.rarityRank, groupRewardCount(selection, group))
    }

    return map
  }, [groups, selection])
  const rewardForRank = useCallback(
    (rarityRank: number) => rewardByRank.get(rarityRank) ?? 0,
    [rewardByRank],
  )

  const sets = useQuery(usePokemonSetsQueryOption())
  const setNameById = useMemo(
    () => Object.fromEntries((sets.data ?? []).map((set) => [set.id, set.name])),
    [sets.data],
  )

  const recycleMutation = useMutation(
    useRecyclePokemonCardsMutationOption(queryClient, {
      onSuccess: (result) => {
        setSelection({})
        preloadRewardImages(result.awardedCards)
        setAnimation((current) =>
          current
            ? { ...current, rewards: result.awardedCards }
            : { batches: [], rewards: result.awardedCards },
        )
      },
      onError: (error) => {
        setAnimation(null)
        toast.show(error.message, 'error')
      },
    }),
  )

  const updateSelection = useCallback(
    (key: string, quantity: number) => {
      setSelection((current) => {
        const next = { ...current }

        if (quantity <= 0) {
          delete next[key]
        } else {
          next[key] = quantity
        }

        return next
      })
    },
    [setSelection],
  )

  const clearSelection = useCallback(() => setSelection({}), [setSelection])

  const handleAuto = useCallback(() => {
    setSelection(buildAutoSelection(cards))
  }, [cards, setSelection])

  const handleRecycle = useCallback(() => {
    const items = selectionToItems(selection, cards)

    if (items.length === 0) {
      return
    }

    setAnimation({ batches: buildRecycleBatches(selection, cards), rewards: null })
    recycleMutation.mutate({ items })
  }, [cards, recycleMutation, selection])

  const closeAnimation = useCallback(() => setAnimation(null), [])

  return {
    selection,
    groups,
    rewardCount,
    selectedCount,
    autoSurplus,
    isBusy: recycleMutation.isPending,
    animation,
    setNameById,
    rewardForRank,
    updateSelection,
    clearSelection,
    handleAuto,
    handleRecycle,
    closeAnimation,
  }
}
