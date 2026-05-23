import TCGdex, {
  type Card,
  type CardResume,
  type Set,
  type SetResume,
  type SupportedLanguages,
} from '@tcgdex/sdk'

export interface TcgDexCard extends Card {}

export class TcgDexClient {
  private readonly client: TCGdex

  constructor(language: SupportedLanguages = 'en') {
    this.client = new TCGdex(language)
  }

  async getRecentSets(fromDate: string, toDate: string): Promise<Set[]> {
    const setResumes = (await this.client.fetch('sets')) ?? []
    const sets = await Promise.all(setResumes.map(async (set) => this.client.fetch('sets', set.id)))

    return sets
      .filter((set): set is Set => Boolean(set?.releaseDate))
      .filter((set) => set.releaseDate >= fromDate && set.releaseDate <= toDate)
      .sort((first, second) => second.releaseDate.localeCompare(first.releaseDate))
  }

  async getCardsBySet(set: Set): Promise<TcgDexCard[]> {
    const cards = await Promise.all(
      set.cards.map(
        async (card) => this.client.fetch('cards', card.id) as Promise<TcgDexCard | undefined>,
      ),
    )

    return cards.filter((card): card is TcgDexCard => Boolean(card))
  }

  async getSetById(setId: string): Promise<Set | undefined> {
    return this.client.fetch('sets', setId) as Promise<Set | undefined>
  }

  async getCardsByIds(cardIds: string[]): Promise<TcgDexCard[]> {
    const cards = await Promise.all(
      cardIds.map(
        async (cardId) => this.client.fetch('cards', cardId) as Promise<TcgDexCard | undefined>,
      ),
    )

    return cards.filter((card): card is TcgDexCard => Boolean(card))
  }
}

export const getCardImageUrl = (
  card: Pick<CardResume, 'image'>,
  quality: 'low' | 'high',
): string | undefined => {
  return card.image ? `${card.image}/${quality}.png` : undefined
}

export const getAssetUrl = (assetBaseUrl?: string): string | undefined => {
  return assetBaseUrl ? `${assetBaseUrl}.png` : undefined
}

export const getSetSeriesName = (set: Pick<Set, 'serie'> | SetResume): string => {
  return 'serie' in set ? set.serie.name : 'Pokemon'
}
