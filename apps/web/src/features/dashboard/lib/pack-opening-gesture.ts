export type SwipeDirection = -1 | 1

export interface CardDismissalTransition {
  nextIndex: number
  isComplete: boolean
}

export const getCardDismissalTransition = (
  currentIndex: number,
  dismissedIndex: number,
  cardCount: number,
): CardDismissalTransition | undefined => {
  if (dismissedIndex !== currentIndex) return undefined

  const isComplete = currentIndex >= cardCount - 1
  return {
    nextIndex: isComplete ? currentIndex : currentIndex + 1,
    isComplete,
  }
}

export const getSwipeDismissDirection = (
  offsetX: number,
  velocityX: number,
): SwipeDirection | undefined => {
  const intent = offsetX + velocityX * 0.16

  if (Math.abs(offsetX) >= 82) {
    return offsetX < 0 ? -1 : 1
  }

  if (Math.abs(intent) >= 155) {
    return intent < 0 ? -1 : 1
  }

  return undefined
}
