export const DEFAULT_CARD_GLOW_COLOR = '92 123 170'
export const DEFAULT_CARD_ARTWORK_PALETTE = [
  DEFAULT_CARD_GLOW_COLOR,
  '139 105 196',
  '65 174 190',
  '211 92 162',
  '225 174 76',
] as const satisfies CardArtworkPalette

export type CardArtworkPalette = readonly [string, string, string, string, string]

interface CardArtworkSample {
  color: string
  palette: CardArtworkPalette
}

interface ColorBucket {
  red: number
  green: number
  blue: number
  weight: number
}

const DEFAULT_SAMPLE: CardArtworkSample = {
  color: DEFAULT_CARD_GLOW_COLOR,
  palette: DEFAULT_CARD_ARTWORK_PALETTE,
}

const resolvedSamples = new Map<string, CardArtworkSample>()
const pendingSamples = new Map<string, Promise<CardArtworkSample>>()

export const getCachedCardArtworkColor = (imageUrl: string): string | undefined =>
  resolvedSamples.get(imageUrl)?.color

export const getCachedCardArtworkPalette = (imageUrl: string): CardArtworkPalette | undefined =>
  resolvedSamples.get(imageUrl)?.palette

export const getCardArtworkAverageColor = async (imageUrl: string): Promise<string> =>
  (await getCardArtworkSample(imageUrl)).color

export const getCardArtworkPalette = async (imageUrl: string): Promise<CardArtworkPalette> =>
  (await getCardArtworkSample(imageUrl)).palette

const getCardArtworkSample = (imageUrl: string): Promise<CardArtworkSample> => {
  const resolved = resolvedSamples.get(imageUrl)
  if (resolved) return Promise.resolve(resolved)

  const pending = pendingSamples.get(imageUrl)
  if (pending) return pending

  const request = sampleImage(imageUrl)
    .then((sample) => {
      resolvedSamples.set(imageUrl, sample)
      return sample
    })
    .catch(() => DEFAULT_SAMPLE)
    .finally(() => {
      pendingSamples.delete(imageUrl)
    })

  pendingSamples.set(imageUrl, request)
  return request
}

const sampleImage = async (imageUrl: string): Promise<CardArtworkSample> => {
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

const sampleLoadedImage = (image: HTMLImageElement): CardArtworkSample => {
  const canvas = document.createElement('canvas')
  canvas.width = 36
  canvas.height = 48
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return DEFAULT_SAMPLE

  // Sample most of the interior so full-art accents outside the traditional
  // illustration window can contribute to premium reveal effects.
  context.drawImage(
    image,
    image.naturalWidth * 0.06,
    image.naturalHeight * 0.07,
    image.naturalWidth * 0.88,
    image.naturalHeight * 0.86,
    0,
    0,
    canvas.width,
    canvas.height,
  )

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  return {
    color: getAverageArtworkColor(pixels),
    palette: extractDominantArtworkColors(pixels),
  }
}

export const extractDominantArtworkColors = (pixels: Uint8ClampedArray): CardArtworkPalette => {
  const buckets = new Map<number, ColorBucket>()

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] / 255
    if (alpha < 0.2) continue

    const red = pixels[index]
    const green = pixels[index + 1]
    const blue = pixels[index + 2]
    const maximum = Math.max(red, green, blue)
    const minimum = Math.min(red, green, blue)
    const saturation = maximum === 0 ? 0 : (maximum - minimum) / maximum
    const brightness = maximum / 255
    const weight = alpha * (0.3 + saturation * 1.7) * (0.7 + brightness * 0.3)
    const key = ((red >> 5) << 6) | ((green >> 5) << 3) | (blue >> 5)
    const bucket = buckets.get(key) ?? { red: 0, green: 0, blue: 0, weight: 0 }

    bucket.red += red * weight
    bucket.green += green * weight
    bucket.blue += blue * weight
    bucket.weight += weight
    buckets.set(key, bucket)
  }

  const candidates = [...buckets.values()]
    .filter((bucket) => bucket.weight > 0)
    .sort((first, second) => second.weight - first.weight)
    .map((bucket) => ({
      color: [
        bucket.red / bucket.weight,
        bucket.green / bucket.weight,
        bucket.blue / bucket.weight,
      ] as const,
    }))
  const selected: Array<readonly [number, number, number]> = []
  const vividCandidates = candidates.filter(
    (candidate) => getColorSaturation(candidate.color) >= 0.2,
  )
  const addDistinctColors = (
    source: typeof candidates,
    minimumDistance: number,
    minimumHueDistance = 0,
  ): void => {
    for (const candidate of source) {
      if (selected.some((color) => getColorDistance(color, candidate.color) < 1)) continue
      if (
        selected.every(
          (color) =>
            getColorDistance(color, candidate.color) >= minimumDistance &&
            getHueDistance(color, candidate.color) >= minimumHueDistance,
        )
      ) {
        selected.push(candidate.color)
      }
      if (selected.length === 5) return
    }
  }

  addDistinctColors(vividCandidates, 50, 28)
  addDistinctColors(vividCandidates, 50, 16)
  addDistinctColors(vividCandidates, 50)
  addDistinctColors(candidates, 50)
  addDistinctColors(vividCandidates, 34)
  addDistinctColors(candidates, 34)
  addDistinctColors(candidates, 0)

  const fallback = DEFAULT_CARD_ARTWORK_PALETTE.map(parseRgbColor)
  const colors = [
    selected[0] ?? fallback[0],
    selected[1] ?? fallback[1],
    selected[2] ?? fallback[2],
    selected[3] ?? fallback[3],
    selected[4] ?? fallback[4],
  ]

  return [
    formatSampledColor(colors[0]),
    formatSampledColor(colors[1]),
    formatSampledColor(colors[2]),
    formatSampledColor(colors[3]),
    formatSampledColor(colors[4]),
  ]
}

const getAverageArtworkColor = (pixels: Uint8ClampedArray): string => {
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

  return formatSampledColor([
    Math.sqrt(red / totalWeight),
    Math.sqrt(green / totalWeight),
    Math.sqrt(blue / totalWeight),
  ])
}

const formatSampledColor = (color: readonly [number, number, number]): string => {
  const brightest = Math.max(...color)
  const brightnessScale = brightest < 145 ? 145 / Math.max(brightest, 1) : 1
  return color.map((channel) => Math.round(Math.min(255, channel * brightnessScale))).join(' ')
}

const getColorDistance = (
  first: readonly [number, number, number],
  second: readonly [number, number, number],
): number => Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2])

const getColorSaturation = (color: readonly [number, number, number]): number => {
  const maximum = Math.max(...color)
  return maximum === 0 ? 0 : (maximum - Math.min(...color)) / maximum
}

const getHueDistance = (
  first: readonly [number, number, number],
  second: readonly [number, number, number],
): number => {
  const difference = Math.abs(getColorHue(first) - getColorHue(second))
  return Math.min(difference, 360 - difference)
}

const getColorHue = (color: readonly [number, number, number]): number => {
  const [red, green, blue] = color.map((channel) => channel / 255)
  const maximum = Math.max(red, green, blue)
  const minimum = Math.min(red, green, blue)
  const delta = maximum - minimum
  if (delta === 0) return 0

  const hue =
    maximum === red
      ? ((green - blue) / delta) % 6
      : maximum === green
        ? (blue - red) / delta + 2
        : (red - green) / delta + 4
  return (hue * 60 + 360) % 360
}

const parseRgbColor = (color: string): readonly [number, number, number] => {
  const [red = 0, green = 0, blue = 0] = color.split(' ').map(Number)
  return [red, green, blue]
}
