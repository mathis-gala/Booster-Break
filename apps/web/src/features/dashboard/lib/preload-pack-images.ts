import type { OpenPackResponse } from '@tcg-collection/shared'

const PACK_IMAGE_PRELOAD_TIMEOUT_MS = 2_500

export const preloadPackImages = async (pack: OpenPackResponse): Promise<void> => {
  const imageUrls = pack.cards
    .map((card) => card.imageLarge ?? card.imageSmall)
    .filter((imageUrl): imageUrl is string => Boolean(imageUrl))

  await Promise.race([
    Promise.all(imageUrls.map(preloadImage)),
    new Promise((resolve) => window.setTimeout(resolve, PACK_IMAGE_PRELOAD_TIMEOUT_MS)),
  ])
}

const preloadImage = async (src: string): Promise<void> => {
  await new Promise<void>((resolve) => {
    const image = new Image()
    image.onload = () => resolve()
    image.onerror = () => resolve()
    image.src = src

    if (image.complete) {
      resolve()
    }
  })
}
