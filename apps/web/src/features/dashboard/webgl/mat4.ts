import { mat4, type mat4 as GlMatrixMat4, vec3 } from 'gl-matrix'

export type Mat4 = Float32Array

export const createProjectionMatrix = (
  fieldOfView: number,
  aspect: number,
  near: number,
  far: number,
): Mat4 => toMat4(mat4.perspective(mat4.create(), fieldOfView, aspect, near, far))

export const createViewMatrix = (cameraDistance = 7.2): Mat4 =>
  toMat4(
    mat4.lookAt(
      mat4.create(),
      vec3.fromValues(0, 0, cameraDistance),
      vec3.fromValues(0, 0, 0),
      vec3.fromValues(0, 1, 0),
    ),
  )

export const createModelMatrix = (rotationX: number, rotationY: number): Mat4 => {
  const model = mat4.create()
  mat4.rotateY(model, model, rotationY)
  mat4.rotateX(model, model, rotationX)
  return toMat4(model)
}

export const createModelViewProjectionMatrix = (
  projection: Mat4,
  view: Mat4,
  model: Mat4,
): Mat4 => {
  const modelView = mat4.multiply(mat4.create(), view, model)
  return toMat4(mat4.multiply(mat4.create(), projection, modelView))
}

const toMat4 = (matrix: GlMatrixMat4): Mat4 => matrix as unknown as Mat4
