const tcgDexAssetOrigin = 'https://assets.tcgdex.net'
const cardAssetPathPattern = /^(?:en|fr)\/[a-zA-Z0-9_./-]+\/(?:low|high)\.png$/
type AssetFetcher = (url: string) => Promise<Response>

export const proxyTcgDexCardAsset = async (
  assetPath: string,
  fetcher: AssetFetcher = fetch,
): Promise<Response> => {
  if (
    !cardAssetPathPattern.test(assetPath) ||
    assetPath.split('/').some((segment) => segment === '.' || segment === '..')
  ) {
    return new Response('Invalid TCGdex card asset path', { status: 400 })
  }

  try {
    const upstream = await fetcher(`${tcgDexAssetOrigin}/${assetPath}`)

    if (!upstream.ok) {
      return new Response('Unable to load TCGdex card asset', { status: upstream.status })
    }

    const contentType = upstream.headers.get('content-type')
    if (contentType !== 'image/png') {
      return new Response('Unexpected TCGdex asset type', { status: 502 })
    }

    return new Response(upstream.body, {
      headers: {
        'Cache-Control': upstream.headers.get('cache-control') ?? 'public, max-age=2592000',
        'Content-Type': contentType,
      },
    })
  } catch {
    return new Response('Unable to load TCGdex card asset', { status: 502 })
  }
}
