export const DEFAULT_CARD_GLOW_COLOR = '92 123 170'

const resolvedColors = new Map<string, string>()
const pendingColors = new Map<string, Promise<string>>()

export const getCachedCardArtworkColor = (imageUrl: string): string | undefined =>
  resolvedColors.get(imageUrl)

export const getCardArtworkAverageColor = (imageUrl: string): Promise<string> => {
  const resolved = resolvedColors.get(imageUrl)
  if (resolved) return Promise.resolve(resolved)

  const pending = pendingColors.get(imageUrl)
  if (pending) return pending

  const request = sampleImage(imageUrl)
    .then((color) => {
      resolvedColors.set(imageUrl, color)
      return color
    })
    .catch(() => DEFAULT_CARD_GLOW_COLOR)
    .finally(() => {
      pendingColors.delete(imageUrl)
    })

  pendingColors.set(imageUrl, request)
  return request
}

const sampleImage = async (imageUrl: string): Promise<string> => {
  try {
    return sampleLoadedImage(await loadImage(imageUrl))
  } catch (error) {
    if (!(error instanceof DOMException) || error.name !== 'SecurityError') throw error
    const separator = imageUrl.includes('?') ? '&' : '?'
    return sampleLoadedImage(await loadImage(`${imageUrl}${separator}color-sample=1`))
  }
}

const loadImage = (imageUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Unable to sample card artwork: ${imageUrl}`))
    image.src = imageUrl
  })

const sampleLoadedImage = (image: HTMLImageElement): string => {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return DEFAULT_CARD_GLOW_COLOR

  // This region covers the illustration window on standard cards and remains
  // representative for full-art cards while avoiding most borders and text.
  context.drawImage(
    image,
    image.naturalWidth * 0.07,
    image.naturalHeight * 0.14,
    image.naturalWidth * 0.86,
    image.naturalHeight * 0.46,
    0,
    0,
    canvas.width,
    canvas.height,
  )

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  let red = 0
  let green = 0
  let blue = 0
  let totalWeight = 0

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] / 255
    if (alpha < 0.2) continue

    const pixelRed = pixels[index]
    const pixelGreen = pixels[index + 1]
    const pixelBlue = pixels[index + 2]
    const maximum = Math.max(pixelRed, pixelGreen, pixelBlue)
    const minimum = Math.min(pixelRed, pixelGreen, pixelBlue)
    const saturation = (maximum - minimum) / 255
    const weight = alpha * (0.7 + saturation * 1.3)

    red += pixelRed * pixelRed * weight
    green += pixelGreen * pixelGreen * weight
    blue += pixelBlue * pixelBlue * weight
    totalWeight += weight
  }

  if (totalWeight === 0) return DEFAULT_CARD_GLOW_COLOR

  const color = [red, green, blue].map((channel) => Math.sqrt(channel / totalWeight))
  const brightest = Math.max(...color)
  const brightnessScale = brightest < 145 ? 145 / Math.max(brightest, 1) : 1

  return color.map((channel) => Math.round(Math.min(255, channel * brightnessScale))).join(' ')
}
