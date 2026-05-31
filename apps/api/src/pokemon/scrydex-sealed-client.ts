import type { Set } from '@tcgdex/sdk'

interface ScrydexSealedClientOptions {
  apiKey?: string
  teamId?: string
}

interface ScrydexSealedImage {
  small?: string
  medium?: string
  large?: string
}

interface ScrydexSealedProduct {
  type?: string
  images?: ScrydexSealedImage[]
}

interface ScrydexSearchResponse {
  data?: ScrydexSealedProduct[]
}

export class ScrydexSealedClient {
  private readonly apiKey?: string
  private readonly teamId?: string

  constructor(options: ScrydexSealedClientOptions = {}) {
    this.apiKey = options.apiKey
    this.teamId = options.teamId
  }

  async getBoosterImageUrl(set: Pick<Set, 'id'>): Promise<string | undefined> {
    const expansionId = toScrydexExpansionId(set.id)

    if (!expansionId) {
      return undefined
    }

    return (await this.searchBoosterImage(expansionId)) ?? getKnownBoosterImageUrl(expansionId)
  }

  private async searchBoosterImage(expansionId: string): Promise<string | undefined> {
    if (!this.apiKey || !this.teamId) {
      return undefined
    }

    const url = new URL(`https://api.scrydex.com/pokemon/v1/expansions/${expansionId}/sealed`)
    url.searchParams.set('q', 'type:"Booster Pack"')
    url.searchParams.set('page_size', '10')
    url.searchParams.set('select', 'type,images')

    const response = await fetch(url, {
      headers: {
        'X-Api-Key': this.apiKey,
        'X-Team-ID': this.teamId,
      },
    })

    if (!response.ok) {
      return undefined
    }

    const payload = (await response.json()) as ScrydexSearchResponse
    const booster = payload.data?.find((product) => product.type === 'Booster Pack')
    const image = booster?.images?.find(
      (candidate) => candidate.large ?? candidate.medium ?? candidate.small,
    )

    return image?.large ?? image?.medium ?? image?.small
  }
}

const knownBoosterImageExpansionIds = new Set(['me1', 'me2', 'me3', 'sv8', 'sv8pt5', 'sv9', 'sv10'])

const getKnownBoosterImageUrl = (expansionId: string): string | undefined => {
  if (
    !knownBoosterImageExpansionIds.has(expansionId) &&
    !isHistoricalBoosterExpansionId(expansionId)
  ) {
    return undefined
  }

  return `https://images.scrydex.com/pokemon/${expansionId}-s1/large`
}

const isHistoricalBoosterExpansionId = (expansionId: string): boolean => {
  return /^(ecard|ex|dp|pl|hgss|bw|xy|sm|swsh)\d+$/.test(expansionId)
}

const toScrydexExpansionId = (tcgdexSetId: string): string | undefined => {
  const historicalMatch = /^(ecard|ex|dp|pl|hgss|bw|xy|sm|swsh)(\d+)$/.exec(tcgdexSetId)

  if (historicalMatch) {
    return tcgdexSetId
  }

  const megaMatch = /^me0?(\d+)$/.exec(tcgdexSetId)

  if (megaMatch) {
    return `me${Number(megaMatch[1])}`
  }

  const scarletVioletMainMatch = /^sv0?(\d+)$/.exec(tcgdexSetId)

  if (scarletVioletMainMatch) {
    return `sv${Number(scarletVioletMainMatch[1])}`
  }

  const scarletVioletSpecialMatch = /^sv0?(\d+)\.5$/.exec(tcgdexSetId)

  if (scarletVioletSpecialMatch) {
    return `sv${Number(scarletVioletSpecialMatch[1])}pt5`
  }

  return undefined
}
