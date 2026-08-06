import {
  normalizeRarity,
  type CardFinish,
  type OpenPackResponse,
  type PokemonCardSummary,
  type PokemonSetSummary,
} from '@tcg-collection/shared'
import { drawPokemonPackCards } from '@tcg-collection/shared/pack-draft'

export type ForcedPullId =
  | 'random'
  | 'ace-spec'
  | 'illustration-rare'
  | 'special-illustration-rare'
  | 'hyper-rare'
  | 'second-slot-hit'
  | 'double-rare'
  | 'ultra-rare'
  | 'final-slot-hit'
  | 'swsh-insert'
  | 'gallery-normal'
  | 'gallery-premium'
  | 'gallery-gold'
  | 'gallery-any'
  | 'holo-rare'
  | 'holo-rare-v'
  | 'holo-rare-vmax'
  | 'holo-rare-vstar'
  | 'swsh-ultra-rare'
  | 'swsh-secret-rare'
  | 'swsh-rare-slot-hit'

export interface ForcedPullOption {
  id: ForcedPullId
  label: string
  slot: number
  candidateCount?: number
}

interface ForcedPullRule extends ForcedPullOption {
  finish: CardFinish
  matches: (card: PokemonCardSummary) => boolean
}

const SWSH_SET_IDS = new Set([
  'swsh1',
  'swsh2',
  'swsh3',
  'swsh4',
  'swsh5',
  'swsh6',
  'swsh7',
  'swsh8',
  'swsh9',
  'swsh10',
  'swsh11',
  'swsh12',
  'swsh12.5',
])

const MODERN_RULES: readonly ForcedPullRule[] = [
  createRule('ace-spec', 'ACE SPEC - position 8', 8, 'holo', isAceSpec),
  createRule('illustration-rare', 'Illustration Rare - position 9', 9, 'holo', isIllustrationRare),
  createRule(
    'special-illustration-rare',
    'Special Illustration Rare - position 9',
    9,
    'holo',
    isSpecialIllustrationRare,
  ),
  createRule('hyper-rare', 'Hyper / Mega Hyper Rare - position 9', 9, 'holo', isHyperRare),
  createRule(
    'second-slot-hit',
    'Random IR-or-better hit - position 9',
    9,
    'holo',
    (card) => isIllustrationRare(card) || isSpecialIllustrationRare(card) || isHyperRare(card),
  ),
  createRule('double-rare', 'Double Rare - position 10', 10, 'holo', isDoubleRare),
  createRule('ultra-rare', 'Ultra Rare / SR - position 10', 10, 'holo', isUltraRare),
  createRule(
    'final-slot-hit',
    'Random RR or SR - position 10',
    10,
    'holo',
    (card) => isDoubleRare(card) || isUltraRare(card),
  ),
]

const SWSH_RULES: readonly ForcedPullRule[] = [
  createRule('swsh-insert', 'Amazing / Radiant Rare - position 9', 9, 'holo', isSwshReverseInsert),
  createRule(
    'gallery-normal',
    'Trainer / Galarian Gallery - position 9',
    9,
    'holo',
    (card) => getGalleryCategory(card) === 'normal',
  ),
  createRule(
    'gallery-premium',
    'Gallery Ultra Rare - position 9',
    9,
    'holo',
    (card) => getGalleryCategory(card) === 'premium',
  ),
  createRule(
    'gallery-gold',
    'Gallery Secret Rare - position 9',
    9,
    'holo',
    (card) => getGalleryCategory(card) === 'gold',
  ),
  createRule(
    'gallery-any',
    'Random gallery pull - position 9',
    9,
    'holo',
    (card) => getGalleryCategory(card) !== undefined,
  ),
  createRarityRule('holo-rare', 'Holo Rare - position 10', 10, ['holo rare']),
  createRarityRule('holo-rare-v', 'Pokemon V - position 10', 10, ['holo rare v']),
  createRarityRule('holo-rare-vmax', 'Pokemon VMAX - position 10', 10, ['holo rare vmax']),
  createRarityRule('holo-rare-vstar', 'Pokemon VSTAR - position 10', 10, ['holo rare vstar']),
  createRule('swsh-ultra-rare', 'Ultra Rare / Full Art - position 10', 10, 'holo', isSwshUltraRare),
  createRarityRule('swsh-secret-rare', 'Secret Rare - position 10', 10, [
    'secret rare',
    'magnifique rare',
  ]),
  createRule(
    'swsh-rare-slot-hit',
    'Random rare-slot hit - position 10',
    10,
    'holo',
    (card) =>
      isRarity(card, [
        'holo rare',
        'holo rare v',
        'holo rare vmax',
        'holo rare vstar',
        'secret rare',
        'magnifique rare',
      ]) || isSwshUltraRare(card),
  ),
]

export const isAuthenticPackSetId = (setId: string): boolean =>
  SWSH_SET_IDS.has(setId) || setId.startsWith('sv') || setId.startsWith('me')

export const getForcedPullOptions = (
  setId: string,
  cards: PokemonCardSummary[],
): ForcedPullOption[] => [
  { id: 'random', label: 'No forced pull - production odds', slot: 0 },
  ...getRules(setId).flatMap((rule) => {
    const candidateCount = cards.filter(rule.matches).length
    return candidateCount > 0 ? [{ ...toOption(rule), candidateCount }] : []
  }),
]

export const createRealPack = (
  set: PokemonSetSummary,
  allCards: PokemonCardSummary[],
  forcedPullId: ForcedPullId,
  random: () => number = Math.random,
): OpenPackResponse => {
  const rule =
    forcedPullId === 'random'
      ? undefined
      : getRules(set.id).find((candidateRule) => candidateRule.id === forcedPullId)

  if (forcedPullId !== 'random' && !rule) {
    throw new Error(`Forced pull ${forcedPullId} is not valid for ${set.name}.`)
  }

  const candidates = rule ? allCards.filter(rule.matches) : []
  if (rule && candidates.length === 0) {
    throw new Error(`${set.name} has no cards matching ${rule.label}.`)
  }

  const forcedCard = rule ? pickRandomCard(candidates, random) : undefined
  const drawPool = forcedCard ? allCards.filter((card) => card.id !== forcedCard.id) : allCards
  const draw = drawPokemonPackCards(drawPool, {
    setId: set.id,
    enableGodPack: forcedPullId === 'random',
  })

  if (draw.cards.length !== 10) {
    throw new Error(`${set.name} could not produce a complete ten-card pack.`)
  }

  if (rule && forcedCard) {
    draw.cards[rule.slot - 1] = { ...forcedCard, finish: rule.finish }
  }

  if (new Set(draw.cards.map((card) => card.id)).size !== draw.cards.length) {
    throw new Error(`${set.name} produced duplicate cards.`)
  }

  return {
    openingId: crypto.randomUUID(),
    set,
    cards: draw.cards.map((card) => ({ ...card, isNew: false })),
    isGodPack: draw.isGodPack,
  }
}

const getRules = (setId: string): readonly ForcedPullRule[] =>
  SWSH_SET_IDS.has(setId) ? SWSH_RULES : MODERN_RULES

function createRule(
  id: ForcedPullId,
  label: string,
  slot: number,
  finish: CardFinish,
  matches: ForcedPullRule['matches'],
): ForcedPullRule {
  return { id, label, slot, finish, matches }
}

function createRarityRule(
  id: ForcedPullId,
  label: string,
  slot: number,
  rarities: readonly string[],
): ForcedPullRule {
  return createRule(id, label, slot, 'holo', (card) => isRarity(card, rarities))
}

const toOption = ({ id, label, slot }: ForcedPullRule): ForcedPullOption => ({ id, label, slot })

const pickRandomCard = (cards: PokemonCardSummary[], random: () => number): PokemonCardSummary =>
  cards[Math.min(cards.length - 1, Math.floor(random() * cards.length))]

function isRarity(card: PokemonCardSummary, rarities: readonly string[]): boolean {
  return rarities.includes(normalizeRarity(card.rarity))
}

function isAceSpec(card: PokemonCardSummary): boolean {
  return isRarity(card, ['ace spec rare', 'high-tech rare', 'high tech rare'])
}

function isIllustrationRare(card: PokemonCardSummary): boolean {
  return isRarity(card, ['ir', 'illustration rare', 'rare illustration'])
}

function isSpecialIllustrationRare(card: PokemonCardSummary): boolean {
  return isRarity(card, [
    'sir',
    'sar',
    'special illustration rare',
    'illustration speciale rare',
    'rare illustration speciale',
  ])
}

function isHyperRare(card: PokemonCardSummary): boolean {
  return isRarity(card, ['hr', 'mhr', 'hyper rare', 'mega hyper rare'])
}

function isDoubleRare(card: PokemonCardSummary): boolean {
  return isRarity(card, ['rr', 'double rare'])
}

function isUltraRare(card: PokemonCardSummary): boolean {
  return isRarity(card, ['sr', 'super rare', 'ultra rare'])
}

function isSwshReverseInsert(card: PokemonCardSummary): boolean {
  return isRarity(card, ['amazing rare', 'magnifique', 'radiant rare', 'radieux rare'])
}

function isSwshUltraRare(card: PokemonCardSummary): boolean {
  return (
    isRarity(card, ['ultra rare', 'full art trainer', 'dresseur full art']) &&
    getGalleryCategory(card) === undefined
  )
}

type GalleryCategory = 'normal' | 'premium' | 'gold'

function getGalleryCategory(card: PokemonCardSummary): GalleryCategory | undefined {
  const match = /^(swsh(?:9|10|11|12)\.5tg|swsh12\.5gg)-(?:TG|GG)(\d+)$/i.exec(card.id)
  if (!match) return undefined

  const setId = match[1].toLowerCase()
  const number = Number(match[2])

  if (setId === 'swsh12.5gg') {
    return number <= 34 ? 'normal' : number <= 66 ? 'premium' : 'gold'
  }

  if (setId === 'swsh10.5tg') {
    return number <= 12 ? 'normal' : 'premium'
  }

  const normalMaximum = setId === 'swsh11.5tg' ? 11 : 12
  return number <= normalMaximum ? 'normal' : number <= 28 ? 'premium' : 'gold'
}
