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
import type { PokemonServiceError } from './pokemon-service'
import {
  compareSetsByNewestRelease,
  getSandboxSetDateRange,
  getSandboxSetReleaseYear,
  isSandboxBoosterSet,
} from './pokemon-sandbox-sets'
import { ScrydexSealedClient } from './scrydex-sealed-client'
import { getAssetUrl, getCardImageUrl, getSetSeriesName, TcgDexClient } from './tcgdex-client'

export interface PokemonSandboxServiceOptions {
  localizedPokemonClients: Record<SupportedLocale, TcgDexClient>
  pokemonClient: TcgDexClient
  sealedClient: ScrydexSealedClient
}

export class PokemonSandboxService {
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

      yearLatestSets.set(
        releaseYear,
        toPokemonSetSummary(set, {
          boosterImageUrl,
          locale,
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

    const drawnCards = drawPokemonPackCards(await this.listSourceSetCards(sourceSet, locale))

    if (drawnCards.length === 0) {
      return toPackUnavailable('No cards are available for this booster set.')
    }

    return {
      openingId: crypto.randomUUID(),
      set,
      cards: drawnCards,
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
    return (await this.getLocaleClient(locale).getCardsBySet(sourceSet)).map((card) =>
      toPokemonCardSummary(card, locale),
    )
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

  private getLocaleClient(locale: SupportedLocale): TcgDexClient {
    return this.options.localizedPokemonClients[locale] ?? this.options.pokemonClient
  }
}

const toPackUnavailable = (message: string): PokemonServiceError => ({
  error: 'pack_unavailable',
  message,
})

const toPokemonSetSummary = (
  set: Set,
  input: { boosterImageUrl: string; locale: SupportedLocale },
): PokemonSetSummary => ({
  id: set.id,
  name: set.name,
  series: getSetSeriesName(set),
  total: set.cardCount.total,
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
