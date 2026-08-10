import { getApiUrl } from '@/lib/api-client'
import { getTcgDexTextureProxyPath } from './tcgdex-texture-url'

interface TextureLoadOptions {
  signal?: AbortSignal
}

export const loadImageTexture = async (
  gl: WebGLRenderingContext,
  imageUrl: string,
  options: TextureLoadOptions = {},
): Promise<WebGLTexture> => {
  const proxyPath = getTcgDexTextureProxyPath(imageUrl)
  const candidates = proxyPath ? [getApiUrl(proxyPath), imageUrl] : [imageUrl]
  let lastError: unknown

  for (const candidate of candidates) {
    try {
      return await uploadImageTexture(gl, candidate, options.signal)
    } catch (error) {
      if (isAbortError(error)) throw error
      lastError = error

      // A non-CORS cache entry can taint texImage2D. Retry once with a unique
      // URL before moving from the same-origin proxy to the original asset.
      if (error instanceof DOMException && error.name === 'SecurityError') {
        const separator = candidate.includes('?') ? '&' : '?'
        try {
          return await uploadImageTexture(
            gl,
            `${candidate}${separator}cors=${Date.now()}`,
            options.signal,
          )
        } catch (retryError) {
          if (isAbortError(retryError)) throw retryError
          lastError = retryError
        }
      }
    }
  }

  throw lastError ?? new Error(`Unable to load texture: ${imageUrl}`)
}

const uploadImageTexture = async (
  gl: WebGLRenderingContext,
  imageUrl: string,
  signal?: AbortSignal,
): Promise<WebGLTexture> => {
  const image = await loadImage(imageUrl, signal)
  const texture = gl.createTexture()

  if (!texture) {
    throw new Error('Unable to create WebGL texture')
  }

  try {
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    configureTexture(gl)
    return texture
  } catch (error) {
    gl.deleteTexture(texture)
    throw error
  }
}

const loadImage = (imageUrl: string, signal?: AbortSignal): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()

    const cleanup = () => {
      image.onload = null
      image.onerror = null
      signal?.removeEventListener('abort', handleAbort)
    }
    const handleAbort = () => {
      cleanup()
      image.src = ''
      reject(new DOMException('Texture load aborted', 'AbortError'))
    }

    if (signal?.aborted) {
      handleAbort()
      return
    }

    image.crossOrigin = 'anonymous'
    image.onload = () => {
      cleanup()
      resolve(image)
    }
    image.onerror = () => {
      cleanup()
      reject(new Error(`Unable to load card texture: ${imageUrl}`))
    }
    signal?.addEventListener('abort', handleAbort, { once: true })
    image.src = imageUrl
  })

const configureTexture = (gl: WebGLRenderingContext): void => {
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
}

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError'
