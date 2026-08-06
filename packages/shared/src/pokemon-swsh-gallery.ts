const gallerySetIdByParentSetId: Record<string, string> = {
  swsh9: 'swsh9.5tg',
  swsh10: 'swsh10.5tg',
  swsh11: 'swsh11.5tg',
  swsh12: 'swsh12.5tg',
  'swsh12.5': 'swsh12.5gg',
}

const parentSetIdByGallerySetId: Record<string, string> = {
  'swsh9.5tg': 'swsh9',
  'swsh10.5tg': 'swsh10',
  'swsh11.5tg': 'swsh11',
  'swsh12.5tg': 'swsh12',
  'swsh12.5gg': 'swsh12.5',
}

export const getSwshGallerySetId = (parentSetId: string): string | undefined => {
  return gallerySetIdByParentSetId[parentSetId]
}

export const getSwshGalleryParentSetId = (gallerySetId: string): string | undefined => {
  return parentSetIdByGallerySetId[gallerySetId]
}
