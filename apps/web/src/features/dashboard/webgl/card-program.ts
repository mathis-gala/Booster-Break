import { CARD_VERTEX_STRIDE_FLOATS } from './card-geometry'
import { setAttribute } from './gl-program'

export const bindCardAttributes = (gl: WebGLRenderingContext, program: WebGLProgram): void => {
  const stride = CARD_VERTEX_STRIDE_FLOATS * Float32Array.BYTES_PER_ELEMENT

  setAttribute(gl, program, 'aPosition', 3, stride, 0)
  setAttribute(gl, program, 'aUv', 2, stride, 3 * Float32Array.BYTES_PER_ELEMENT)
  setAttribute(gl, program, 'aNormal', 3, stride, 5 * Float32Array.BYTES_PER_ELEMENT)
  setAttribute(gl, program, 'aSide', 1, stride, 8 * Float32Array.BYTES_PER_ELEMENT)
}
