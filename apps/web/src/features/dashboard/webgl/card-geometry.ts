const CARD_WIDTH = 3
const CARD_HEIGHT = 4.2
const CARD_DEPTH = 0.05

export const CARD_VERTEX_STRIDE_FLOATS = 9
export const CARD_INDEX_COUNT = 36

export const buildCardVertices = (): Float32Array => {
  const halfWidth = CARD_WIDTH / 2
  const halfHeight = CARD_HEIGHT / 2
  const halfDepth = CARD_DEPTH / 2
  const vertices: number[] = []

  pushFace(vertices, [
    [-halfWidth, -halfHeight, halfDepth, 0, 0, 0, 0, 1, 1],
    [halfWidth, -halfHeight, halfDepth, 1, 0, 0, 0, 1, 1],
    [halfWidth, halfHeight, halfDepth, 1, 1, 0, 0, 1, 1],
    [-halfWidth, halfHeight, halfDepth, 0, 1, 0, 0, 1, 1],
  ])
  pushFace(vertices, [
    [halfWidth, -halfHeight, -halfDepth, 0, 0, 0, 0, -1, 0],
    [-halfWidth, -halfHeight, -halfDepth, 1, 0, 0, 0, -1, 0],
    [-halfWidth, halfHeight, -halfDepth, 1, 1, 0, 0, -1, 0],
    [halfWidth, halfHeight, -halfDepth, 0, 1, 0, 0, -1, 0],
  ])

  const edgeSide = -1
  pushFace(vertices, [
    [-halfWidth, halfHeight, halfDepth, 0, 0, 0, 1, 0, edgeSide],
    [halfWidth, halfHeight, halfDepth, 1, 0, 0, 1, 0, edgeSide],
    [halfWidth, halfHeight, -halfDepth, 1, 1, 0, 1, 0, edgeSide],
    [-halfWidth, halfHeight, -halfDepth, 0, 1, 0, 1, 0, edgeSide],
  ])
  pushFace(vertices, [
    [-halfWidth, -halfHeight, -halfDepth, 0, 0, 0, -1, 0, edgeSide],
    [halfWidth, -halfHeight, -halfDepth, 1, 0, 0, -1, 0, edgeSide],
    [halfWidth, -halfHeight, halfDepth, 1, 1, 0, -1, 0, edgeSide],
    [-halfWidth, -halfHeight, halfDepth, 0, 1, 0, -1, 0, edgeSide],
  ])
  pushFace(vertices, [
    [halfWidth, -halfHeight, halfDepth, 0, 0, 1, 0, 0, edgeSide],
    [halfWidth, -halfHeight, -halfDepth, 1, 0, 1, 0, 0, edgeSide],
    [halfWidth, halfHeight, -halfDepth, 1, 1, 1, 0, 0, edgeSide],
    [halfWidth, halfHeight, halfDepth, 0, 1, 1, 0, 0, edgeSide],
  ])
  pushFace(vertices, [
    [-halfWidth, -halfHeight, -halfDepth, 0, 0, -1, 0, 0, edgeSide],
    [-halfWidth, -halfHeight, halfDepth, 1, 0, -1, 0, 0, edgeSide],
    [-halfWidth, halfHeight, halfDepth, 1, 1, -1, 0, 0, edgeSide],
    [-halfWidth, halfHeight, -halfDepth, 0, 1, -1, 0, 0, edgeSide],
  ])

  return new Float32Array(vertices)
}

export const buildCardIndices = (): Uint16Array => {
  const indices: number[] = []

  for (let face = 0; face < 6; face += 1) {
    const offset = face * 4
    indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3)
  }

  return new Uint16Array(indices)
}

const pushFace = (vertices: number[], faceVertices: number[][]): void => {
  for (const vertex of faceVertices) {
    vertices.push(...vertex)
  }
}
