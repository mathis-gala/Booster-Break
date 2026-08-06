import type { CardFinish, PokemonCardSummary } from '@tcg-collection/shared'
import { normalizeRarity } from '@tcg-collection/shared'

import { getCardFoilSeed } from './card-foil'

export type CardRevealTier = 'standard' | 'holo' | 'rr' | 'ir' | 'sr' | 'ace-spec' | 'jackpot'
export type ParticleRevealTier = Exclude<CardRevealTier, 'standard' | 'holo'>
export type RevealParticleKind = 'glint' | 'streak' | 'mote'

type RevealCardMetadata = Pick<PokemonCardSummary, 'id' | 'number' | 'rarity' | 'finish'>

export interface RevealParticle {
  id: number
  kind: RevealParticleKind
  left: number
  top: number
  travelX: number
  travelY: number
  delay: number
  duration: number
  size: number
  rotation: number
  colorSlot: number
}

const JACKPOT_RARITIES = new Set([
  'sir',
  'sar',
  'special illustration rare',
  'illustration speciale rare',
  'rare illustration speciale',
  'special art rare',
  'mhr',
  'mega hyper rare',
])

const RR_RARITIES = new Set(['rr', 'double rare', 'holo rare v'])

const IR_RARITIES = new Set(['ir', 'illustration rare', 'rare illustration', 'galarian gallery'])

const ACE_SPEC_RARITIES = new Set([
  'ace spec rare',
  'high tech rare',
  'high-tech rare',
  'high tecg rare',
  'high-tecg rare',
])

const SR_RARITIES = new Set([
  'sr',
  'super rare',
  'ultra rare',
  'full art trainer',
  'dresseur full art',
  'radiant rare',
  'radieux rare',
  'amazing rare',
  'magnifique',
  'holo rare vmax',
  'holo rare vstar',
  'hyper rare',
  'hr',
  'secret rare',
  'magnifique rare',
])

export const resolveCardRevealTier = (card: RevealCardMetadata): CardRevealTier => {
  const rarity = normalizeRarity(card.rarity)
  const galleryNumber = getGalarianGalleryNumber(card)

  if (JACKPOT_RARITIES.has(rarity) || (galleryNumber !== undefined && galleryNumber >= 35)) {
    return 'jackpot'
  }

  if (ACE_SPEC_RARITIES.has(rarity)) {
    return 'ace-spec'
  }

  if (SR_RARITIES.has(rarity)) {
    return 'sr'
  }

  if (IR_RARITIES.has(rarity) || galleryNumber !== undefined || isTrainerGalleryCard(card.id)) {
    return 'ir'
  }

  if (RR_RARITIES.has(rarity)) {
    return 'rr'
  }

  return isFoilFinish(card.finish) ? 'holo' : 'standard'
}

export const createRevealParticles = (
  cardId: string,
  tier: ParticleRevealTier,
): RevealParticle[] => {
  const random = createSeededRandom(getCardFoilSeed(`${cardId}:${tier}`))
  const config = getParticleConfig(tier)

  return Array.from({ length: config.count }, (_, id) => {
    const perimeterPosition = config.perimeterOrigins
      ? getRandomPerimeterPosition(id, random)
      : undefined
    const angle = perimeterPosition
      ? Math.atan2(perimeterPosition.top - 50, perimeterPosition.left - 50) +
        (random() - 0.5) * 0.42
      : random() * Math.PI * 2
    const horizontalRadius = 34 + random() * 15
    const verticalRadius = 39 + random() * 14
    const distance = config.minimumDistance + random() * config.distanceVariance
    const kind = resolveParticleKind(id, random())

    return {
      id,
      kind,
      left: perimeterPosition?.left ?? clamp(50 + Math.cos(angle) * horizontalRadius, 1, 99),
      top: perimeterPosition?.top ?? clamp(50 + Math.sin(angle) * verticalRadius, 1, 99),
      travelX: Math.cos(angle) * distance,
      travelY: Math.sin(angle) * distance,
      delay: config.minimumDelay + random() * config.delayVariance,
      duration: config.minimumDuration + random() * config.durationVariance,
      size:
        kind === 'mote'
          ? 2 + random() * 3
          : kind === 'streak'
            ? 14 + random() * config.sizeVariance * 1.5
            : 8 + random() * config.sizeVariance,
      rotation: random() * 180,
      colorSlot: Math.floor(random() * (tier === 'jackpot' ? 4 : 5)),
    }
  })
}

const isFoilFinish = (finish: CardFinish | undefined): boolean =>
  finish === 'holo' || finish === 'reverse_holo'

const getGalarianGalleryNumber = (card: RevealCardMetadata): number | undefined => {
  const match = /(?:^|-)GG(\d+)$/i.exec(card.id) ?? /^GG(\d+)$/i.exec(card.number)
  if (!match || !card.id.toLowerCase().includes('swsh12.5gg')) return undefined

  const number = Number(match[1])
  return Number.isFinite(number) ? number : undefined
}

const isTrainerGalleryCard = (cardId: string): boolean => /(?:^|-)TG\d+$/i.test(cardId)

const resolveParticleKind = (index: number, random: number): RevealParticleKind => {
  if (index % 5 === 0) return 'streak'
  if (random < 0.22) return 'mote'
  return 'glint'
}

const getRandomPerimeterPosition = (
  index: number,
  random: () => number,
): { left: number; top: number } => {
  const side = index % 4
  const alongEdge = 14 + random() * 72
  const edgeOffset = 7 + random() * 10

  switch (side) {
    case 0:
      return { left: alongEdge, top: edgeOffset }
    case 1:
      return { left: 100 - edgeOffset, top: alongEdge }
    case 2:
      return { left: alongEdge, top: 100 - edgeOffset }
    default:
      return { left: edgeOffset, top: alongEdge }
  }
}

const getParticleConfig = (
  tier: ParticleRevealTier,
): {
  count: number
  minimumDistance: number
  distanceVariance: number
  minimumDelay: number
  delayVariance: number
  minimumDuration: number
  durationVariance: number
  sizeVariance: number
  perimeterOrigins: boolean
} => {
  switch (tier) {
    case 'rr':
      return {
        count: 32,
        minimumDistance: 34,
        distanceVariance: 66,
        minimumDelay: 0,
        delayVariance: 0.44,
        minimumDuration: 1.15,
        durationVariance: 0.7,
        sizeVariance: 14,
        perimeterOrigins: true,
      }
    case 'ir':
      return {
        count: 14,
        minimumDistance: 28,
        distanceVariance: 52,
        minimumDelay: 0.2,
        delayVariance: 0.72,
        minimumDuration: 1.4,
        durationVariance: 0.8,
        sizeVariance: 10,
        perimeterOrigins: false,
      }
    case 'sr':
      return {
        count: 68,
        minimumDistance: 46,
        distanceVariance: 110,
        minimumDelay: 0,
        delayVariance: 0.82,
        minimumDuration: 1.45,
        durationVariance: 1,
        sizeVariance: 20,
        perimeterOrigins: true,
      }
    case 'ace-spec':
      return {
        count: 25,
        minimumDistance: 38,
        distanceVariance: 86,
        minimumDelay: 0,
        delayVariance: 0.28,
        minimumDuration: 0.64,
        durationVariance: 0.46,
        sizeVariance: 16,
        perimeterOrigins: false,
      }
    case 'jackpot':
      return {
        count: 48,
        minimumDistance: 42,
        distanceVariance: 90,
        minimumDelay: 18.75,
        delayVariance: 0.15,
        minimumDuration: 1.6,
        durationVariance: 0.45,
        sizeVariance: 18,
        perimeterOrigins: true,
      }
  }
}

const createSeededRandom = (seed: number): (() => number) => {
  let state = Math.max(1, Math.floor(seed * 0xffffffff))

  return () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state)
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state)
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296
  }
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value))
