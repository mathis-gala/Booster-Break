const tcgDexAssetOrigin = 'https://assets.tcgdex.net'
const cardAssetPathPattern = /^\/(?:en|fr)\/[a-zA-Z0-9_./-]+\/(?:low|high)\.png$/

export const getTcgDexTextureProxyPath = (imageUrl: string): `/${string}` | undefined => {
  try {
    const url = new URL(imageUrl)

    if (url.origin !== tcgDexAssetOrigin || !cardAssetPathPattern.test(url.pathname)) {
      return undefined
    }

    return `/pokemon/assets${url.pathname}`
  } catch {
    return undefined
  }
}
