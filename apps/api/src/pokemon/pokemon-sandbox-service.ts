import type {
  CardFinish,
  OpenPackResponse,
  PokemonCardSummary,
  PokemonSetSummary,
  SupportedLocale,
} from '@tcg-collection/shared'
import type { Card, Set } from '@tcgdex/sdk'
import { DEFAULT_LOCALE } from '@tcg-collection/shared'
import { drawPokemonPackCards } from './pack-draft'
import { resolveCardIsEvolved } from './pokemon-mappers'
import type { PokemonServiceError } from './pokemon-service'
import {
  compareSetsByNewestRelease,
  getSandboxSetDateRange,
  getSandboxSetReleaseYear,
  isSandboxBoosterSet,
} from './pokemon-sandbox-sets'
import { ScrydexSealedClient } from './scrydex-sealed-client'
import { getSwshGallerySetId } from './swsh-gallery'
import { getAssetUrl, getCardImageUrl, getSetSeriesName, type TcgDexClient } from './tcgdex-client'

type SandboxPokemonClient = Pick<TcgDexClient, 'getCardsBySet' | 'getRecentSets' | 'getSetById'>
type SandboxSealedClient = Pick<ScrydexSealedClient, 'getBoosterImageUrl'>

export interface PokemonSandboxServiceOptions {
  localizedPokemonClients: Record<SupportedLocale, SandboxPokemonClient>
  pokemonClient: SandboxPokemonClient
  sealedClient: SandboxSealedClient
}

export class PokemonSandboxService {
  private readonly gallerySetCache = new Map<string, Set | null>()

  constructor(private readonly options: PokemonSandboxServiceOptions) {}

  async listSets(locale: SupportedLocale): Promise<PokemonSetSummary[]> {
    const { fromDate, toDate } = getSandboxSetDateRange()
    const client = this.getLocaleClient(locale)
    const yearLatestSets = new Map<number, PokemonSetSummary>()

    const recentSets = (await client.getRecentSets(fromDate, toDate))
      .filter(isSandboxBoosterSet)
      .sort(compareSetsByNewestRelease)

    for (const set of recentSets) {
      const releaseYear = getSandboxSetReleaseYear(set)

      if (releaseYear === undefined || yearLatestSets.has(releaseYear)) {
        continue
      }

      const boosterImageUrl = await this.getSandboxBoosterImageUrl(set, locale)

      if (!boosterImageUrl) {
        continue
      }

      const gallerySet = await this.getGallerySet(set.id, locale)

      yearLatestSets.set(
        releaseYear,
        toPokemonSetSummary(set, {
          boosterImageUrl,
          locale,
          total: set.cardCount.total + (gallerySet?.cardCount.total ?? 0),
        }),
      )
    }

    return Array.from(yearLatestSets.values()).sort(compareSetsByNewestRelease)
  }

  async listCards(
    setId: string | undefined,
    locale: SupportedLocale,
  ): Promise<PokemonCardSummary[]> {
    const sourceSet = await this.getSandboxSourceSet(setId, locale)

    if (!sourceSet) {
      return []
    }

    return this.listSourceSetCards(sourceSet, locale)
  }

  async openPack(input: {
    setId?: string
    locale?: SupportedLocale
  }): Promise<OpenPackResponse | PokemonServiceError> {
    const locale = input.locale ?? DEFAULT_LOCALE
    const sandboxSets = await this.listSets(locale)
    const preferredSetId = input.setId ?? sandboxSets[0]?.id

    if (!preferredSetId) {
      return toPackUnavailable('No sandbox boosters available for the selected year range.')
    }

    const set = sandboxSets.find((sandboxSet) => sandboxSet.id === preferredSetId)

    if (!set) {
      return toPackUnavailable('No cards are available for this booster set.')
    }

    const sourceSet = await this.getSandboxSourceSet(preferredSetId, locale)

    if (!sourceSet) {
      return toPackUnavailable('No cards are available for this booster set.')
    }

    const { cards: drawnCards } = drawPokemonPackCards(
      await this.listSourceSetCards(sourceSet, locale),
      { enableGodPack: false, setId: sourceSet.id },
    )

    if (drawnCards.length === 0) {
      return toPackUnavailable('No cards are available for this booster set.')
    }

    return {
      openingId: crypto.randomUUID(),
      set,
      cards: drawnCards.map((card) => ({ ...card, isNew: false })),
      isGodPack: false,
    }
  }

  private async getSandboxSourceSet(
    setId: string | undefined,
    locale: SupportedLocale,
  ): Promise<Set | undefined> {
    if (!setId) {
      return undefined
    }

    const sourceSet = await this.getLocaleClient(locale).getSetById(setId)

    return sourceSet && isSandboxBoosterSet(sourceSet) ? sourceSet : undefined
  }

  private async listSourceSetCards(
    sourceSet: Set,
    locale: SupportedLocale,
  ): Promise<PokemonCardSummary[]> {
    const client = this.getLocaleClient(locale)
    const [parentCards, gallerySet] = await Promise.all([
      client.getCardsBySet(sourceSet),
      this.getGallerySet(sourceSet.id, locale),
    ])
    const galleryCards = gallerySet ? await client.getCardsBySet(gallerySet) : []

    return [...parentCards, ...galleryCards].map((card) => toPokemonCardSummary(card, locale))
  }

  private async getGallerySet(
    parentSetId: string,
    locale: SupportedLocale,
  ): Promise<Set | undefined> {
    const gallerySetId = getSwshGallerySetId(parentSetId)

    if (!gallerySetId) {
      return undefined
    }

    const cacheKey = `${locale}:${gallerySetId}`

    if (this.gallerySetCache.has(cacheKey)) {
      return this.gallerySetCache.get(cacheKey) ?? undefined
    }

    const gallerySet = await this.getLocaleClient(locale).getSetById(gallerySetId)
    this.gallerySetCache.set(cacheKey, gallerySet ?? null)

    return gallerySet
  }

  private async getSandboxBoosterImageUrl(
    set: Set,
    locale: SupportedLocale,
  ): Promise<string | undefined> {
    return (
      (await this.options.sealedClient.getBoosterImageUrl(set)) ??
      localizeTcgDexAssetUrl(getAssetUrl(set.logo), locale) ??
      localizeTcgDexAssetUrl(getAssetUrl(set.symbol), locale)
    )
  }

  private getLocaleClient(locale: SupportedLocale): SandboxPokemonClient {
    return this.options.localizedPokemonClients[locale] ?? this.options.pokemonClient
  }
}

const toPackUnavailable = (message: string): PokemonServiceError => ({
  error: 'pack_unavailable',
  message,
})

const toPokemonSetSummary = (
  set: Set,
  input: { boosterImageUrl: string; locale: SupportedLocale; total: number },
): PokemonSetSummary => ({
  id: set.id,
  name: set.name,
  series: getSetSeriesName(set),
  total: input.total,
  releaseDate: set.releaseDate,
  symbolUrl: localizeTcgDexAssetUrl(getAssetUrl(set.symbol), input.locale),
  logoUrl: localizeTcgDexAssetUrl(getAssetUrl(set.logo), input.locale),
  boosterImageUrl: input.boosterImageUrl,
})

const toPokemonCardSummary = (card: Card, locale: SupportedLocale): PokemonCardSummary => ({
  id: card.id,
  setId: card.set.id,
  name: card.name,
  number: card.localId,
  rarity: card.rarity ?? undefined,
  supertype: card.category ?? undefined,
  isEvolved: resolveCardIsEvolved(card.stage, card.evolveFrom),
  finishes: getCardFinishes(card.variants),
  imageSmall: localizeTcgDexAssetUrl(getCardImageUrl(card, 'low'), locale),
  imageLarge: localizeTcgDexAssetUrl(getCardImageUrl(card, 'high'), locale),
})

const localizeTcgDexAssetUrl = (
  url: string | null | undefined,
  locale: SupportedLocale,
): string | undefined => {
  if (!url) {
    return undefined
  }

  return url.replace('://assets.tcgdex.net/en/', `://assets.tcgdex.net/${locale}/`)
}

const getCardFinishes = (
  variants?: {
    normal?: boolean
    holo?: boolean
    reverse?: boolean
  } | null,
): CardFinish[] => {
  const finishes: CardFinish[] = []

  if (variants?.normal ?? true) {
    finishes.push('normal')
  }

  if (variants?.holo) {
    finishes.push('holo')
  }

  if (variants?.reverse) {
    finishes.push('reverse_holo')
  }

  return finishes.length > 0 ? finishes : ['normal']
}
