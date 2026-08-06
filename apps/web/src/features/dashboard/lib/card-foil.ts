import type { CardFinish } from '@tcg-collection/shared'

export type FoilProfileName =
  | 'none'
  | 'rare-holo'
  | 'swsh-holo-rare'
  | 'reverse-holo'
  | 'double-rare'
  | 'illustration-rare'
  | 'ultra-rare'
  | 'ace-spec'
  | 'special-illustration'
  | 'swsh-gallery-vmax'
  | 'mega-hyper-rare'

export type CardLayout = 'pokemon' | 'trainer' | 'energy'
export type FoilTextureRole =
  | 'birthday-a'
  | 'birthday-b'
  | 'glitter'
  | 'grain'
  | 'illusion'
  | 'metal'
  | 'noise-base'
  | 'noise-top'

export type NormalizedRect = readonly [left: number, top: number, right: number, bottom: number]
export type NormalizedCircle = readonly [centerX: number, centerY: number, radius: number]

export interface FoilCardMetadata {
  cardId: string
  finish?: CardFinish
  rarity?: string
  supertype?: string
  isEvolved?: boolean
}

type FoilProfileContext = Pick<FoilCardMetadata, 'cardId' | 'supertype'> & { cardName?: string }

export interface FoilProfile {
  name: FoilProfileName
  uniform: number
  bandAngle: number
  bandFrequency: number
  intensity: number
  glare: number
  textureScale: number
  motionSpeed: number
  textureRoles: readonly FoilTextureRole[]
  hasEtching: boolean
  hasGlitter: boolean
  hasStars: boolean
  hasMetal: boolean
}

export interface FoilTuning {
  intensity: number
  glare: number
  textureScale: number
  lightX: number
  lightY: number
  motion: boolean
}

export type FoilTuningOverrides = Partial<FoilTuning>

export interface FoilMask {
  artwork: NormalizedRect
  stock: NormalizedRect
  evolution?: NormalizedCircle
}

export interface FoilLighting {
  response: number
  glare: number
  reflectionX: number
  reflectionY: number
  normalX: number
  normalY: number
  normalZ: number
}

const NO_TEXTURES: readonly FoilTextureRole[] = []

export const FOIL_PROFILES: Readonly<Record<FoilProfileName, FoilProfile>> = {
  none: {
    name: 'none',
    uniform: 0,
    bandAngle: 0,
    bandFrequency: 0,
    intensity: 0,
    glare: 0,
    textureScale: 1,
    motionSpeed: 0,
    textureRoles: NO_TEXTURES,
    hasEtching: false,
    hasGlitter: false,
    hasStars: false,
    hasMetal: false,
  },
  'rare-holo': {
    name: 'rare-holo',
    uniform: 1,
    bandAngle: 0,
    bandFrequency: 4.5,
    intensity: 0.96,
    glare: 0.88,
    textureScale: 1.1,
    motionSpeed: 0.025,
    textureRoles: ['noise-base'],
    hasEtching: false,
    hasGlitter: false,
    hasStars: false,
    hasMetal: false,
  },
  'swsh-holo-rare': {
    name: 'swsh-holo-rare',
    uniform: 9,
    bandAngle: 0,
    bandFrequency: 4.5,
    intensity: 0.96,
    glare: 0.88,
    textureScale: 1.1,
    motionSpeed: 0.025,
    textureRoles: ['noise-base'],
    hasEtching: false,
    hasGlitter: false,
    hasStars: false,
    hasMetal: false,
  },
  'reverse-holo': {
    name: 'reverse-holo',
    uniform: 2,
    bandAngle: 10,
    bandFrequency: 5,
    intensity: 0.96,
    glare: 0.86,
    textureScale: 1.2,
    motionSpeed: 0.018,
    textureRoles: ['grain', 'metal'],
    hasEtching: false,
    hasGlitter: false,
    hasStars: false,
    hasMetal: true,
  },
  'double-rare': {
    name: 'double-rare',
    uniform: 3,
    bandAngle: 128,
    bandFrequency: 4.2,
    intensity: 0.9,
    glare: 0.68,
    textureScale: 0.88,
    motionSpeed: 0.022,
    textureRoles: ['birthday-a', 'birthday-b'],
    hasEtching: false,
    hasGlitter: false,
    hasStars: true,
    hasMetal: false,
  },
  'illustration-rare': {
    name: 'illustration-rare',
    uniform: 4,
    bandAngle: 128,
    bandFrequency: 4.2,
    intensity: 0.86,
    glare: 0.62,
    textureScale: 0.95,
    motionSpeed: 0.022,
    textureRoles: ['noise-top'],
    hasEtching: false,
    hasGlitter: false,
    hasStars: false,
    hasMetal: false,
  },
  'ultra-rare': {
    name: 'ultra-rare',
    uniform: 5,
    bandAngle: 128,
    bandFrequency: 6.5,
    intensity: 0.88,
    glare: 0.64,
    textureScale: 1.2,
    motionSpeed: 0.016,
    textureRoles: ['noise-top', 'illusion'],
    hasEtching: true,
    hasGlitter: false,
    hasStars: false,
    hasMetal: false,
  },
  'ace-spec': {
    name: 'ace-spec',
    uniform: 6,
    bandAngle: 128,
    bandFrequency: 6.5,
    intensity: 0.86,
    glare: 0.62,
    textureScale: 0.95,
    motionSpeed: 0.018,
    textureRoles: ['noise-top'],
    hasEtching: false,
    hasGlitter: false,
    hasStars: false,
    hasMetal: false,
  },
  'special-illustration': {
    name: 'special-illustration',
    uniform: 7,
    bandAngle: 0,
    bandFrequency: 3.6,
    intensity: 0.86,
    glare: 0.62,
    textureScale: 1.2,
    motionSpeed: 0.014,
    textureRoles: ['noise-base', 'illusion', 'glitter'],
    hasEtching: true,
    hasGlitter: true,
    hasStars: false,
    hasMetal: false,
  },
  'swsh-gallery-vmax': {
    name: 'swsh-gallery-vmax',
    uniform: 10,
    bandAngle: 128,
    bandFrequency: 6.5,
    intensity: 0.88,
    glare: 0.64,
    textureScale: 1.2,
    motionSpeed: 0.014,
    textureRoles: ['noise-top', 'glitter'],
    hasEtching: false,
    hasGlitter: true,
    hasStars: false,
    hasMetal: false,
  },
  'mega-hyper-rare': {
    name: 'mega-hyper-rare',
    uniform: 8,
    bandAngle: 104,
    bandFrequency: 1.9,
    intensity: 0.82,
    glare: 0.52,
    textureScale: 0.6,
    motionSpeed: 0.012,
    textureRoles: ['grain'],
    hasEtching: false,
    hasGlitter: false,
    hasStars: false,
    hasMetal: false,
  },
}

// Coordinates use a top-left origin so CSS clips and converted WebGL UVs share
// one contract. The stock rectangle excludes the printed outer border.
export const FOIL_LAYOUT_MASKS: Readonly<Record<CardLayout, FoilMask>> = {
  pokemon: {
    artwork: [0.08, 0.092, 0.927, 0.473],
    stock: [0.04, 0.027, 0.961, 0.973],
  },
  trainer: {
    artwork: [0.075, 0.139, 0.925, 0.519],
    stock: [0.038, 0.07, 0.958, 0.97],
  },
  energy: {
    artwork: [0.074, 0.14, 0.926, 0.71],
    stock: [0.052, 0.038, 0.948, 0.965],
  },
}

export const EVOLUTION_BUBBLE_MASK: NormalizedCircle = [0.111, 0.131, 0.092]

// SWSH cards use an older Pokemon frame while Trainer geometry is nearly unchanged.
// The era-specific values remain independently tunable in the development foil lab.
export const SWSH_FOIL_LAYOUT_MASKS: Readonly<Record<CardLayout, FoilMask>> = {
  pokemon: {
    artwork: [0.075, 0.092, 0.925, 0.478],
    stock: [0.038, 0.028, 0.96, 0.972],
  },
  trainer: {
    artwork: [0.075, 0.141, 0.925, 0.522],
    stock: [0.038, 0.07, 0.96, 0.97],
  },
  energy: {
    artwork: [0.074, 0.14, 0.926, 0.71],
    stock: [0.052, 0.038, 0.948, 0.965],
  },
}

export const SWSH_EVOLUTION_BUBBLE_MASK: NormalizedCircle = [0.095, 0.114, 0.075]

export const FOIL_TEXTURE_PATHS: Readonly<Record<FoilTextureRole, string>> = {
  'birthday-a': 'foil-textures/151/birthday-holo-dank.webp',
  'birthday-b': 'foil-textures/151/birthday-holo-dank-2.webp',
  glitter: 'foil-textures/151/iri-8.webp',
  grain: 'foil-textures/grain.webp',
  illusion: 'foil-textures/illusion.png',
  metal: 'foil-textures/metal.png',
  'noise-base': 'foil-textures/151/noise-base.webp',
  'noise-top': 'foil-textures/151/noise-top.webp',
}

const normalizeMetadataValue = (value: string | undefined): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()

const SWSH_GALLERY_VMAX_CARD_IDS = new Set([
  'swsh9.5tg-TG15',
  'swsh9.5tg-TG17',
  'swsh9.5tg-TG19',
  'swsh9.5tg-TG21',
  'swsh9.5tg-TG23',
  'swsh10.5tg-TG15',
  'swsh10.5tg-TG18',
  'swsh11.5tg-TG13',
  'swsh11.5tg-TG15',
  'swsh11.5tg-TG17',
  'swsh11.5tg-TG22',
  'swsh12.5tg-TG15',
  'swsh12.5tg-TG19',
  'swsh12.5tg-TG20',
  'swsh12.5tg-TG21',
  'swsh12.5gg-GG42',
  'swsh12.5gg-GG45',
  'swsh12.5gg-GG47',
])

const SWSH_GALLERY_VSTAR_CARD_IDS = new Set([
  'swsh12.5gg-GG35',
  'swsh12.5gg-GG37',
  'swsh12.5gg-GG40',
  'swsh12.5gg-GG43',
  'swsh12.5gg-GG44',
  'swsh12.5gg-GG46',
  'swsh12.5gg-GG50',
  'swsh12.5gg-GG52',
  'swsh12.5gg-GG55',
  'swsh12.5gg-GG56',
])

const SWSH_GALLERY_TRAINER_RANGES: Readonly<
  Record<string, readonly [minimum: number, maximum: number]>
> = {
  'swsh9.5tg': [24, 28],
  'swsh10.5tg': [24, 28],
  'swsh11.5tg': [23, 28],
  'swsh12.5tg': [23, 28],
  'swsh12.5gg': [57, 66],
}

export const isSwordShieldCardId = (cardId: string | undefined): boolean =>
  /^swsh\d+(?:\.\d+)?(?:tg|gg)?-/i.test(cardId ?? '')

export const isPreSwordShieldCardId = (cardId: string | undefined): boolean =>
  /^(?:ecard|ex|dp|pl|hgss|bw|xy|sm)\d+(?:\.\d+)?-/i.test(cardId ?? '')

export const resolveFoilProfile = (
  finish: CardFinish | undefined,
  rarity: string | undefined,
  context?: FoilProfileContext,
): FoilProfile => {
  if (finish !== 'holo' && finish !== 'reverse_holo') {
    return FOIL_PROFILES.none
  }

  if (finish === 'reverse_holo') {
    return FOIL_PROFILES['reverse-holo']
  }

  const value = normalizeMetadataValue(rarity)

  if (context && isPreSwordShieldCardId(context.cardId)) {
    const cardName = normalizeMetadataValue(context.cardName)
    const isNamedHit =
      /\b(?:ex|gx|break|legend)\b|\blv x\b/.test(cardName) || /[☆★]/.test(context.cardName ?? '')

    return ['rare', 'rare holo', 'holo rare'].includes(value) && !isNamedHit
      ? FOIL_PROFILES['rare-holo']
      : FOIL_PROFILES['illustration-rare']
  }

  if (context && isSwordShieldCardId(context.cardId)) {
    return resolveSwordShieldFoilProfile(value, context)
  }

  if (value === 'mhr' || value.includes('mega hyper rare')) {
    return FOIL_PROFILES['mega-hyper-rare']
  }

  if (
    value === 'sir' ||
    value === 'sar' ||
    value === 'hr' ||
    value.includes('special illustration rare') ||
    value.includes('illustration speciale rare') ||
    value.includes('rare illustration speciale') ||
    value.includes('special art rare') ||
    value === 'hyper rare'
  ) {
    return FOIL_PROFILES['special-illustration']
  }

  if (
    value === 'ace spec' ||
    value.includes('ace spec rare') ||
    value.includes('high tech rare') ||
    value.includes('high tecg rare')
  ) {
    return FOIL_PROFILES['ace-spec']
  }

  if (value === 'sr' || value.includes('ultra rare') || value === 'super rare') {
    return FOIL_PROFILES['ultra-rare']
  }

  if (value === 'ir' || value === 'illustration rare' || value === 'rare illustration') {
    return FOIL_PROFILES['illustration-rare']
  }

  if (value === 'rr' || value === 'double rare') {
    return FOIL_PROFILES['double-rare']
  }

  return FOIL_PROFILES['rare-holo']
}

export const resolveCardLayout = (supertype: string | undefined): CardLayout => {
  const value = normalizeMetadataValue(supertype)

  if (value === 'trainer' || value === 'dresseur') {
    return 'trainer'
  }

  if (value === 'energy' || value === 'energie') {
    return 'energy'
  }

  return 'pokemon'
}

export const resolveFoilMask = (
  supertype: string | undefined,
  profileName?: FoilProfileName,
  isEvolved?: boolean,
  cardId?: string,
  override?: FoilMask,
): FoilMask => {
  const layout = resolveCardLayout(supertype)
  const isPreSwordShield = isPreSwordShieldCardId(cardId)

  if (isPreSwordShield && profileName === 'reverse-holo') {
    return { artwork: [0, 0, 0, 0], stock: [0, 0, 1, 1] }
  }

  if (isPreSwordShield && profileName === 'rare-holo') {
    return { artwork: [0, 0, 1, 1], stock: [0, 0, 1, 1] }
  }

  const isSwordShield = isSwordShieldCardId(cardId)
  const mask =
    override ?? (isSwordShield ? SWSH_FOIL_LAYOUT_MASKS[layout] : FOIL_LAYOUT_MASKS[layout])
  const usesEvolutionExclusion =
    profileName === 'rare-holo' ||
    profileName === 'swsh-holo-rare' ||
    profileName === 'reverse-holo'
  const evolutionMask =
    mask.evolution ?? (isSwordShield ? SWSH_EVOLUTION_BUBBLE_MASK : EVOLUTION_BUBBLE_MASK)

  if (layout === 'pokemon' && usesEvolutionExclusion && isEvolved) {
    return { ...mask, evolution: evolutionMask }
  }

  return mask.evolution ? { artwork: mask.artwork, stock: mask.stock } : mask
}

export const toCssCircleClipPath = ([centerX, centerY, radius]: NormalizedCircle): string =>
  `ellipse(${radius * 100}% ${radius * (63 / 88) * 100}% at ${centerX * 100}% ${centerY * 100}%)`

export const resolveFoilTuning = (
  profile: FoilProfile,
  overrides: FoilTuningOverrides = {},
): FoilTuning => ({
  intensity: clamp(overrides.intensity ?? profile.intensity, 0, 1),
  glare: clamp(overrides.glare ?? profile.glare, 0, 1),
  textureScale: clamp(overrides.textureScale ?? profile.textureScale, 0.25, 3),
  lightX: clamp(overrides.lightX ?? 0.35, -1, 1),
  lightY: clamp(overrides.lightY ?? -0.3, -1, 1),
  motion: overrides.motion ?? true,
})

export const getCardFoilSeed = (cardId: string): number => {
  let hash = 2166136261

  for (let index = 0; index < cardId.length; index += 1) {
    hash ^= cardId.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0) / 4294967296
}

export const getFoilBandDirection = (angleDegrees: number): readonly [number, number] => {
  const angle = (angleDegrees * Math.PI) / 180
  return [Math.sin(angle), -Math.cos(angle)]
}

export const resolveFoilAssetUrl = (role: FoilTextureRole, baseUrl?: string): string => {
  const base = baseUrl ?? import.meta.env.BASE_URL ?? '/'
  return `${base.endsWith('/') ? base : `${base}/`}${FOIL_TEXTURE_PATHS[role]}`
}

export const getFoilTextureUrls = (profile: FoilProfile, baseUrl?: string): readonly string[] =>
  profile.textureRoles.map((role) => resolveFoilAssetUrl(role, baseUrl))

export const getMainFoilRegions = (
  profile: FoilProfile,
  mask: FoilMask,
): readonly NormalizedRect[] => {
  if (profile.name === 'rare-holo' || profile.name === 'swsh-holo-rare') {
    return [mask.artwork]
  }

  if (profile.name === 'reverse-holo') {
    return subtractRect(mask.stock, mask.artwork)
  }

  return profile.name === 'none' ? [] : [[0, 0, 1, 1]]
}

export const getBorderFoilRegions = (
  profile: FoilProfile,
  mask: FoilMask,
): readonly NormalizedRect[] =>
  profile.name === 'rare-holo' ? subtractRect([0, 0, 1, 1], mask.stock) : []

export const toCssClipPath = ([left, top, right, bottom]: NormalizedRect): string =>
  `polygon(${left * 100}% ${top * 100}%, ${right * 100}% ${top * 100}%, ${right * 100}% ${bottom * 100}%, ${left * 100}% ${bottom * 100}%)`

export const computeFoilLighting = (
  rotationX: number,
  rotationY: number,
  lightX: number,
  lightY: number,
): FoilLighting => {
  const normalX = Math.sin(rotationY) * Math.cos(rotationX)
  const normalY = -Math.sin(rotationX)
  const normalZ = Math.max(0, Math.cos(rotationX) * Math.cos(rotationY))
  const lightLength = Math.hypot(lightX * 0.58, -lightY * 0.58, 1.35)
  const lightDirectionX = (lightX * 0.58) / lightLength
  const lightDirectionY = (-lightY * 0.58) / lightLength
  const lightDirectionZ = 1.35 / lightLength
  const halfLength = Math.hypot(lightDirectionX, lightDirectionY, lightDirectionZ + 1)
  const halfX = lightDirectionX / halfLength
  const halfY = lightDirectionY / halfLength
  const halfZ = (lightDirectionZ + 1) / halfLength
  const alignment = clamp(normalX * halfX + normalY * halfY + normalZ * halfZ, 0, 1)
  const specular = alignment ** 30
  const fresnel = (1 - normalZ) ** 1.35
  const response = clamp(0.035 + specular * 0.52 + fresnel * 0.7, 0.035, 1)
  const glare = clamp(alignment ** 70 * 0.72 + fresnel * 0.32, 0, 1)

  return {
    response,
    glare,
    reflectionX: clamp(50 + (lightX - normalX * 1.55) * 35, -12, 112),
    reflectionY: clamp(50 + (lightY + normalY * 1.55) * 35, -12, 112),
    normalX,
    normalY,
    normalZ,
  }
}

// Front-face geometry uses bottom-origin UVs. Masks are top-origin like CSS.
export const webGlUvToMaskUv = (u: number, v: number): readonly [number, number] => [u, 1 - v]

const subtractRect = (outer: NormalizedRect, inner: NormalizedRect): readonly NormalizedRect[] => {
  const [outerLeft, outerTop, outerRight, outerBottom] = outer
  const innerLeft = clamp(inner[0], outerLeft, outerRight)
  const innerTop = clamp(inner[1], outerTop, outerBottom)
  const innerRight = clamp(inner[2], outerLeft, outerRight)
  const innerBottom = clamp(inner[3], outerTop, outerBottom)

  const regions: NormalizedRect[] = [
    [outerLeft, outerTop, outerRight, innerTop],
    [outerLeft, innerTop, innerLeft, innerBottom],
    [innerRight, innerTop, outerRight, innerBottom],
    [outerLeft, innerBottom, outerRight, outerBottom],
  ]

  return regions.filter((rect) => rect[2] > rect[0] && rect[3] > rect[1])
}

const resolveSwordShieldFoilProfile = (
  rarity: string,
  context: FoilProfileContext,
): FoilProfile => {
  const galleryCard = parseSwordShieldGalleryCardId(context.cardId)

  if (galleryCard) {
    const canonicalCardId = `${galleryCard.setId}-${galleryCard.prefix}${String(galleryCard.number).padStart(2, '0')}`

    if (isSwordShieldGalleryGold(galleryCard) || SWSH_GALLERY_VSTAR_CARD_IDS.has(canonicalCardId)) {
      return FOIL_PROFILES['special-illustration']
    }

    if (SWSH_GALLERY_VMAX_CARD_IDS.has(canonicalCardId)) {
      return FOIL_PROFILES['swsh-gallery-vmax']
    }

    if (
      galleryCard.setId === 'swsh12.5gg' &&
      galleryCard.number >= 35 &&
      galleryCard.number <= 56
    ) {
      return FOIL_PROFILES['ultra-rare']
    }

    const trainerRange = SWSH_GALLERY_TRAINER_RANGES[galleryCard.setId]
    const isTrainer =
      normalizeMetadataValue(context.supertype) === 'trainer' ||
      normalizeMetadataValue(context.supertype) === 'dresseur' ||
      (trainerRange !== undefined &&
        galleryCard.number >= trainerRange[0] &&
        galleryCard.number <= trainerRange[1])

    return isTrainer ? FOIL_PROFILES['ultra-rare'] : FOIL_PROFILES['illustration-rare']
  }

  if (['common', 'commune', 'uncommon', 'peu commune', 'rare'].includes(rarity)) {
    return FOIL_PROFILES.none
  }

  if (rarity === 'holo rare vmax' || rarity === 'holo rare vstar') {
    return FOIL_PROFILES['ultra-rare']
  }

  if (rarity === 'holo rare v') {
    return FOIL_PROFILES['illustration-rare']
  }

  if (rarity === 'amazing rare' || rarity === 'magnifique') {
    return FOIL_PROFILES['special-illustration']
  }

  if (rarity === 'radiant rare' || rarity === 'radieux rare') {
    return FOIL_PROFILES['ultra-rare']
  }

  if (rarity === 'ultra rare' || rarity === 'full art trainer' || rarity === 'dresseur full art') {
    return FOIL_PROFILES['ultra-rare']
  }

  if (rarity === 'secret rare' || rarity === 'magnifique rare') {
    return FOIL_PROFILES['special-illustration']
  }

  return FOIL_PROFILES['swsh-holo-rare']
}

interface SwordShieldGalleryCardId {
  setId: string
  prefix: 'TG' | 'GG'
  number: number
}

const parseSwordShieldGalleryCardId = (cardId: string): SwordShieldGalleryCardId | undefined => {
  const match = /^(swsh(?:9|10|11|12)\.5tg|swsh12\.5gg)-(TG|GG)(\d+)$/i.exec(cardId)

  return match
    ? {
        setId: match[1].toLowerCase(),
        prefix: match[2].toUpperCase() as 'TG' | 'GG',
        number: Number(match[3]),
      }
    : undefined
}

const isSwordShieldGalleryGold = (card: SwordShieldGalleryCardId): boolean =>
  (card.prefix === 'TG' && card.number >= 29 && card.number <= 30) ||
  (card.prefix === 'GG' && card.number >= 67 && card.number <= 70)

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value))
