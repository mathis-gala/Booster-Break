export type SwipeDirection = -1 | 1

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
