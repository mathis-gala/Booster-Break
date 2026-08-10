import { useEffect, useState } from 'react'

const CAROUSEL_STEP_MS = 24

export function useBoosterCarouselSelection<T extends { id: string }>(sets: readonly T[]) {
  const [selectedSetId, setSelectedSetId] = useState<string>()
  const [targetSetId, setTargetSetId] = useState<string>()
  const activeSetId =
    selectedSetId && sets.some((set) => set.id === selectedSetId) ? selectedSetId : sets[0]?.id
  const activeSet = sets.find((set) => set.id === activeSetId)
  const isTravelling = Boolean(
    targetSetId && activeSetId !== targetSetId && sets.some((set) => set.id === targetSetId),
  )

  useEffect(() => {
    if (!targetSetId || activeSetId === targetSetId) return

    const currentIndex = sets.findIndex((set) => set.id === activeSetId)
    const targetIndex = sets.findIndex((set) => set.id === targetSetId)
    if (currentIndex < 0 || targetIndex < 0) return

    const nextSet = sets[currentIndex + Math.sign(targetIndex - currentIndex)]
    if (!nextSet) return

    const timeout = window.setTimeout(() => setSelectedSetId(nextSet.id), CAROUSEL_STEP_MS)
    return () => window.clearTimeout(timeout)
  }, [activeSetId, sets, targetSetId])

  const selectSet = (setId: string) => {
    const currentIndex = sets.findIndex((set) => set.id === activeSetId)
    const targetIndex = sets.findIndex((set) => set.id === setId)
    if (targetIndex < 0) return

    setTargetSetId(setId)
    if (targetIndex === currentIndex) return

    const firstStep = sets[currentIndex + Math.sign(targetIndex - currentIndex)]
    setSelectedSetId(firstStep?.id ?? setId)
  }

  return { activeSet, activeSetId, isTravelling, selectSet }
}
