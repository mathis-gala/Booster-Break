import type { CardFinish } from '@tcg-collection/shared'

import { getFinishUniform } from './card-finish-uniform'
import { CARD_INDEX_COUNT, buildCardIndices, buildCardVertices } from './card-geometry'
import { bindCardAttributes } from './card-program'
import { CARD_FRAGMENT_SHADER_SOURCE, CARD_VERTEX_SHADER_SOURCE } from './card-shaders'
import { createProgram, setUniform1f, setUniform1i, setUniformMatrix } from './gl-program'
import {
  createModelMatrix,
  createModelViewProjectionMatrix,
  createProjectionMatrix,
  createViewMatrix,
} from './mat4'
import { clamp, lerp } from './number-utils'
import { loadImageTexture } from './texture-loader'

interface CardViewerRendererOptions {
  frontImageUrl: string
  finish?: CardFinish
}

const ROTATION_LIMIT = 0.72
const ROTATION_DRAG_SENSITIVITY = 0.012
const ROTATION_EASING = 0.18

export class CardViewerRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly options: CardViewerRendererOptions
  private readonly gl: WebGLRenderingContext
  private readonly resizeObserver: ResizeObserver
  private animationFrame = 0
  private program?: WebGLProgram
  private frontTexture?: WebGLTexture
  private vertexBuffer?: WebGLBuffer
  private indexBuffer?: WebGLBuffer
  private isDragging = false
  private previousPointer?: { x: number; y: number }
  private rotation = { x: 0, y: 0 }
  private targetRotation = { x: 0, y: 0 }
  private readonly startedAt = performance.now()

  constructor(canvas: HTMLCanvasElement, options: CardViewerRendererOptions) {
    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
    })

    if (!gl) {
      throw new Error('WebGL is not supported')
    }

    this.canvas = canvas
    this.options = options
    this.gl = gl
    this.resizeObserver = new ResizeObserver(() => {
      this.resize()
    })
  }

  async initialize(): Promise<void> {
    const gl = this.gl
    this.program = createProgram(gl, CARD_VERTEX_SHADER_SOURCE, CARD_FRAGMENT_SHADER_SOURCE)
    this.vertexBuffer = gl.createBuffer() ?? undefined
    this.indexBuffer = gl.createBuffer() ?? undefined

    if (!this.vertexBuffer || !this.indexBuffer) {
      throw new Error('Unable to create WebGL buffers')
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, buildCardVertices(), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, buildCardIndices(), gl.STATIC_DRAW)

    this.frontTexture = await loadImageTexture(gl, this.options.frontImageUrl)
  }

  start(): void {
    this.resizeObserver.observe(this.canvas)
    this.canvas.addEventListener('pointerdown', this.handlePointerDown)
    this.canvas.addEventListener('pointermove', this.handlePointerMove)
    this.canvas.addEventListener('pointerup', this.handlePointerUp)
    this.canvas.addEventListener('pointercancel', this.handlePointerUp)
    this.resize()
    this.render()
  }

  dispose(): void {
    const gl = this.gl
    cancelAnimationFrame(this.animationFrame)
    this.resizeObserver.disconnect()
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown)
    this.canvas.removeEventListener('pointermove', this.handlePointerMove)
    this.canvas.removeEventListener('pointerup', this.handlePointerUp)
    this.canvas.removeEventListener('pointercancel', this.handlePointerUp)

    if (this.frontTexture) gl.deleteTexture(this.frontTexture)
    if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer)
    if (this.indexBuffer) gl.deleteBuffer(this.indexBuffer)
    if (this.program) gl.deleteProgram(this.program)
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.isDragging = true
    this.previousPointer = { x: event.clientX, y: event.clientY }
    this.canvas.setPointerCapture(event.pointerId)
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (!this.isDragging || !this.previousPointer) {
      return
    }

    const dx = event.clientX - this.previousPointer.x
    const dy = event.clientY - this.previousPointer.y
    this.targetRotation.y = clamp(
      this.targetRotation.y + dx * ROTATION_DRAG_SENSITIVITY,
      -ROTATION_LIMIT,
      ROTATION_LIMIT,
    )
    this.targetRotation.x = clamp(
      this.targetRotation.x + dy * ROTATION_DRAG_SENSITIVITY,
      -ROTATION_LIMIT,
      ROTATION_LIMIT,
    )
    this.previousPointer = { x: event.clientX, y: event.clientY }
  }

  private readonly handlePointerUp = (event: PointerEvent): void => {
    this.isDragging = false
    this.previousPointer = undefined

    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId)
    }
  }

  private resize(): void {
    // Measure the layout box, not getBoundingClientRect() — the latter reflects CSS
    // transforms, so sizing during the card's scale-in reveal would lock the buffer low-res.
    const width = this.canvas.clientWidth
    const height = this.canvas.clientHeight
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    const displayWidth = Math.max(1, Math.floor(width * pixelRatio))
    const displayHeight = Math.max(1, Math.floor(height * pixelRatio))

    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      this.canvas.width = displayWidth
      this.canvas.height = displayHeight
    }

    this.gl.viewport(0, 0, displayWidth, displayHeight)
  }

  private render = (): void => {
    const gl = this.gl

    if (!this.program || !this.frontTexture) {
      return
    }

    this.rotation.x = lerp(this.rotation.x, this.targetRotation.x, ROTATION_EASING)
    this.rotation.y = lerp(this.rotation.y, this.targetRotation.y, ROTATION_EASING)

    gl.clearColor(0, 0, 0, 0)
    gl.clearDepth(1)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.CULL_FACE)
    gl.cullFace(gl.BACK)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.useProgram(this.program)

    const aspect = this.canvas.width / this.canvas.height
    const projection = createProjectionMatrix(Math.PI / 4, aspect, 0.1, 100)
    const view = createViewMatrix()
    const model = createModelMatrix(this.rotation.x, this.rotation.y)
    const mvp = createModelViewProjectionMatrix(projection, view, model)

    bindCardAttributes(gl, this.program)
    setUniformMatrix(gl, this.program, 'uMvp', mvp)
    setUniformMatrix(gl, this.program, 'uModel', model)
    setUniform1f(gl, this.program, 'uTime', (performance.now() - this.startedAt) / 1000)
    setUniform1i(gl, this.program, 'uFinish', getFinishUniform(this.options.finish))

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.frontTexture)
    setUniform1i(gl, this.program, 'uFrontTexture', 0)
    gl.drawElements(gl.TRIANGLES, CARD_INDEX_COUNT, gl.UNSIGNED_SHORT, 0)
    this.animationFrame = requestAnimationFrame(this.render)
  }
}
