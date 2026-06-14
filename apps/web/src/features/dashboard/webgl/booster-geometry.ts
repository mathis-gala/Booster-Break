// A finely tessellated plane used to render the booster in two passes: the
// fixed wrapper body and the removable top strip.

export const BOOSTER_ASPECT = 2.32 / 3.6
// Keep the pack slightly smaller than the camera frame so the cut strip has
// room to detach without clipping against the canvas edge.
export const BOOSTER_HEIGHT = 4.72
export const BOOSTER_WIDTH = BOOSTER_HEIGHT * BOOSTER_ASPECT

// uv.y above which the booster is considered the removable top strip (the
// crimped top of the wrapper that tears off).
export const BOOSTER_TEAR_BASELINE = 0.86

export const BOOSTER_COLS = 72
export const BOOSTER_ROWS = 64
export const BOOSTER_VERTEX_STRIDE_FLOATS = 4

export interface BoosterMesh {
  vertices: Float32Array
  indices: Uint16Array
  indexCount: number
}

export const buildBoosterMesh = (): BoosterMesh => {
  const halfWidth = BOOSTER_WIDTH / 2
  const halfHeight = BOOSTER_HEIGHT / 2
  const vertices: number[] = []

  for (let row = 0; row <= BOOSTER_ROWS; row += 1) {
    const v = row / BOOSTER_ROWS
    const y = v * BOOSTER_HEIGHT - halfHeight
    for (let col = 0; col <= BOOSTER_COLS; col += 1) {
      const u = col / BOOSTER_COLS
      const x = u * BOOSTER_WIDTH - halfWidth
      // position (x, y), uv (u, v)
      vertices.push(x, y, u, v)
    }
  }

  const indices: number[] = []
  const rowStride = BOOSTER_COLS + 1
  for (let row = 0; row < BOOSTER_ROWS; row += 1) {
    for (let col = 0; col < BOOSTER_COLS; col += 1) {
      const topLeft = row * rowStride + col
      const topRight = topLeft + 1
      const bottomLeft = topLeft + rowStride
      const bottomRight = bottomLeft + 1
      indices.push(topLeft, bottomLeft, topRight, topRight, bottomLeft, bottomRight)
    }
  }

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint16Array(indices),
    indexCount: indices.length,
  }
}
