import { m } from '@/paraglide/messages'

export const formatRarity = (rarity: string | undefined): string => {
  switch (rarity) {
    case 'Common':
      return m.rarity_common()
    case 'Uncommon':
      return m.rarity_uncommon()
    case 'Rare':
      return m.rarity_rare()
    case 'Double rare':
    case 'Double Rare':
      return m.rarity_double_rare()
    case 'Illustration rare':
    case 'Illustration Rare':
      return m.rarity_illustration_rare()
    case 'Ultra Rare':
      return m.rarity_ultra_rare()
    case 'Special illustration rare':
    case 'Special Illustration Rare':
      return m.rarity_special_illustration_rare()
    case 'Mega Hyper Rare':
      return m.rarity_mega_hyper_rare()
    case 'Hyper rare':
    case 'Hyper Rare':
      return m.rarity_hyper_rare()
    default:
      return rarity ?? m.rarity_other()
  }
}
