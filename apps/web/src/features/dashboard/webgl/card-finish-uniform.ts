import type { CardFinish } from '@tcg-collection/shared'

export const getFinishUniform = (finish: CardFinish | undefined): number => {
  if (finish === 'holo') return 1
  if (finish === 'reverse_holo') return 2
  return 0
}
