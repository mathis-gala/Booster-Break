import type {
  CardFinish,
  PokemonCardSummary,
  PokemonSetSummary,
  SupportedLocale,
} from '@tcg-collection/shared'
import { getAssetUrl, getCardImageUrl, getSetSeriesName, type TcgDexCard } from './tcgdex-client'
import type { Set as TcgDexSet } from '@tcgdex/sdk'

export type LocalizedSetText = Partial<Record<SupportedLocale, { name: string; series: string }>>
export type LocalizedCardNames = Map<string, Partial<Record<SupportedLocale, string>>>

export const toCardWrite = (
  card: TcgDexCard,
  syncedAt: string,
  localizedNames?: LocalizedCardNames,
) => ({
  id: card.id,
  setId: card.set.id,
  localId: card.localId,
  name: card.name,
  nameEn: localizedNames?.get(card.id)?.en ?? card.name,
  nameFr: localizedNames?.get(card.id)?.fr,
  rarity: card.rarity,
  category: card.category,
  imageSmall: getCardImageUrl(card, 'low'),
  imageLarge: getCardImageUrl(card, 'high'),
  rawJson: JSON.stringify(card),
  syncedAt,
})

export const toSetWrite = (
  set: TcgDexSet,
  syncedAt: string,
  boosterImageUrl?: string,
  localizedText?: LocalizedSetText,
) => {
  const series = getSetSeriesName(set)

  return {
    id: set.id,
    name: set.name,
    nameEn: localizedText?.en?.name ?? set.name,
    nameFr: localizedText?.fr?.name,
    series,
    seriesEn: localizedText?.en?.series ?? series,
    seriesFr: localizedText?.fr?.series,
    total: set.cardCount.total,
    releaseDate: set.releaseDate,
    symbolUrl: getAssetUrl(set.symbol),
    logoUrl: getAssetUrl(set.logo),
    boosterImageUrl,
    rawJson: JSON.stringify(set),
    syncedAt,
  }
}

export const toSetSummary = (
  set: {
    id: string
    name: string
    nameEn: string | null
    nameFr: string | null
    series: string
    seriesEn: string | null
    seriesFr: string | null
    total: number
    releaseDate: string
    symbolUrl: string | null
    logoUrl: string | null
    boosterImageUrl: string | null
  },
  locale: SupportedLocale,
): PokemonSetSummary => ({
  id: set.id,
  name: getLocalizedValue(locale, {
    base: set.name,
    en: set.nameEn,
    fr: set.nameFr,
  }),
  series: getLocalizedValue(locale, {
    base: set.series,
    en: set.seriesEn,
    fr: set.seriesFr,
  }),
  total: set.total,
  releaseDate: set.releaseDate,
  symbolUrl: localizeTcgDexAssetUrl(set.symbolUrl, locale),
  logoUrl: localizeTcgDexAssetUrl(set.logoUrl, locale),
  boosterImageUrl: set.boosterImageUrl ?? undefined,
})

export const toCardSummary = (
  card: {
    id: string
    setId: string
    localId: string
    name: string
    nameEn: string | null
    nameFr: string | null
    rarity: string | null
    category: string | null
    rawJson: string
    imageSmall: string | null
    imageLarge: string | null
  },
  finish?: CardFinish,
  locale: SupportedLocale = 'fr',
): PokemonCardSummary => ({
  id: card.id,
  setId: card.setId,
  name: getLocalizedCardName(card, locale),
  number: card.localId,
  rarity: card.rarity ?? undefined,
  supertype: card.category ?? undefined,
  finishes: getAvailableFinishes(card.rawJson),
  finish,
  imageSmall: localizeTcgDexAssetUrl(card.imageSmall, locale),
  imageLarge: localizeTcgDexAssetUrl(card.imageLarge, locale),
})

export const getLocalizedCardName = (
  card: { name: string; nameEn?: string | null; nameFr?: string | null },
  locale: SupportedLocale,
): string => {
  return getLocalizedValue(locale, {
    base: card.name,
    en: card.nameEn,
    fr: card.nameFr,
  })
}

export const getLocalizedSetName = (
  set: { name: string; nameEn?: string | null; nameFr?: string | null },
  locale: SupportedLocale,
): string => {
  return getLocalizedValue(locale, {
    base: set.name,
    en: set.nameEn,
    fr: set.nameFr,
  })
}

const getLocalizedValue = (
  locale: SupportedLocale,
  values: { base: string; en?: string | null; fr?: string | null },
): string => {
  if (locale === 'fr') {
    return values.fr ?? values.en ?? values.base
  }

  return values.en ?? values.fr ?? values.base
}

const localizeTcgDexAssetUrl = (
  url: string | null | undefined,
  locale: SupportedLocale,
): string | undefined => {
  if (!url) {
    return undefined
  }

  return url.replace('://assets.tcgdex.net/en/', `://assets.tcgdex.net/${locale}/`)
}

const getAvailableFinishes = (rawJson: string): CardFinish[] => {
  const variants = parseCardVariants(rawJson)
  const finishes: CardFinish[] = []

  if (variants.normal) {
    finishes.push('normal')
  }

  if (variants.holo) {
    finishes.push('holo')
  }

  if (variants.reverse) {
    finishes.push('reverse_holo')
  }

  return finishes.length > 0 ? finishes : ['normal']
}

const parseCardVariants = (
  rawJson: string,
): { normal?: boolean; holo?: boolean; reverse?: boolean } => {
  try {
    const card = JSON.parse(rawJson) as {
      variants?: {
        normal?: boolean
        holo?: boolean
        reverse?: boolean
      }
    }

    return card.variants ?? {}
  } catch {
    return {}
  }
}
