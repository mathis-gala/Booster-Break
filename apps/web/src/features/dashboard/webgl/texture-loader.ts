export const loadImageTexture = async (
  gl: WebGLRenderingContext,
  imageUrl: string,
): Promise<WebGLTexture> => {
  try {
    return await uploadImageTexture(gl, imageUrl)
  } catch (error) {
    // A non-CORS cache entry (e.g. the same image already shown via a plain
    // <img>) taints texImage2D. Retry once with a cache-busting param to force a
    // fresh CORS fetch.
    if (error instanceof DOMException && error.name === 'SecurityError') {
      const separator = imageUrl.includes('?') ? '&' : '?'
      return uploadImageTexture(gl, `${imageUrl}${separator}cors=1`)
    }
    throw error
  }
}

const uploadImageTexture = async (
  gl: WebGLRenderingContext,
  imageUrl: string,
): Promise<WebGLTexture> => {
  const image = await loadImage(imageUrl)
  const texture = gl.createTexture()

  if (!texture) {
    throw new Error('Unable to create WebGL texture')
  }

  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
  configureTexture(gl)

  return texture
}

const loadImage = (imageUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Unable to load card texture: ${imageUrl}`))
    image.src = imageUrl
  })

const configureTexture = (gl: WebGLRenderingContext): void => {
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
}
