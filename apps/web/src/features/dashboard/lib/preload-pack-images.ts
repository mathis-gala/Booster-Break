import type { OpenPackResponse } from '@tcg-collection/shared'

import { getApiUrl } from '@/lib/api-client'
import { getTcgDexTextureProxyPath } from '../webgl/tcgdex-texture-url'

type ImagePreloader = (src: string) => Promise<void>

export const preloadPackImages = async (
  pack: OpenPackResponse,
  preload: ImagePreloader = preloadImage,
): Promise<void> => {
  const sourceUrls = [
    pack.set.boosterImageUrl,
    ...pack.cards.map((card) => card.imageLarge ?? card.imageSmall),
  ].filter((imageUrl): imageUrl is string => Boolean(imageUrl))
  const preloadUrls = new Set(sourceUrls.map(getPreloadImageUrl))

  await Promise.all([...preloadUrls].map(preload))
}

const preloadImage = async (src: string): Promise<void> => {
  await new Promise<void>((resolve) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      void image
        .decode()
        .catch(() => undefined)
        .then(resolve)
    }
    image.onerror = () => resolve()
    image.src = src
  })
}

const getPreloadImageUrl = (imageUrl: string): string => {
  const proxyPath = getTcgDexTextureProxyPath(imageUrl)
  return proxyPath ? getApiUrl(proxyPath) : imageUrl
}
