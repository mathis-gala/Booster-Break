import { m } from '@/paraglide/messages'

export const formatRarity = (rarity: string | undefined): string => {
  switch (rarity) {
    case 'Common':
      return m.rarity_common()
    case 'Uncommon':
      return m.rarity_uncommon()
    case 'Rare':
      return m.rarity_rare()
    case 'Holo Rare':
      return m.rarity_holo_rare()
    case 'Holo Rare V':
      return m.rarity_holo_rare_v()
    case 'Holo Rare VMAX':
      return m.rarity_holo_rare_vmax()
    case 'Holo Rare VSTAR':
      return m.rarity_holo_rare_vstar()
    case 'Double rare':
    case 'Double Rare':
      return m.rarity_double_rare()
    case 'Illustration rare':
    case 'Illustration Rare':
      return m.rarity_illustration_rare()
    case 'Ultra Rare':
      return m.rarity_ultra_rare()
    case 'ACE SPEC Rare':
      return m.rarity_ace_spec_rare()
    case 'Full Art Trainer':
      return m.rarity_full_art_trainer()
    case 'Radiant Rare':
      return m.rarity_radiant_rare()
    case 'Special illustration rare':
    case 'Special Illustration Rare':
      return m.rarity_special_illustration_rare()
    case 'Mega Hyper Rare':
      return m.rarity_mega_hyper_rare()
    case 'Hyper rare':
    case 'Hyper Rare':
      return m.rarity_hyper_rare()
    case 'Secret Rare':
      return m.rarity_secret_rare()
    case 'Galarian Gallery':
      return m.rarity_galarian_gallery()
    case 'Galarian Gallery Ultra Rare':
      return m.rarity_galarian_gallery_ultra_rare()
    case 'Galarian Gallery Secret Rare':
      return m.rarity_galarian_gallery_secret_rare()
    case 'None':
    case 'Other':
      return m.rarity_other()
    default:
      return rarity ?? m.rarity_other()
  }
}
