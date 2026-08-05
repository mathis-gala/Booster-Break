import type { CardFinish } from '@tcg-collection/shared'

import {
  getCardFoilSeed,
  getFoilBandDirection,
  getFoilTextureUrls,
  resolveFoilMask,
  resolveFoilProfile,
  resolveFoilTuning,
  type FoilProfile,
  type FoilMask,
  type FoilTuning,
  type FoilTuningOverrides,
} from '../lib/card-foil'
import { CARD_INDEX_COUNT, buildCardIndices, buildCardVertices } from './card-geometry'
import { bindCardAttributes } from './card-program'
import { CARD_FRAGMENT_SHADER_SOURCE, CARD_VERTEX_SHADER_SOURCE } from './card-shaders'
import { createProgram } from './gl-program'
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
  cardId: string
  finish?: CardFinish
  rarity?: string
  supertype?: string
  isEvolved?: boolean
  foilTuning?: FoilTuningOverrides
  foilMask?: FoilMask
  reduceMotion?: boolean
  interactive?: boolean
  cameraDistance?: number
  rotationLimit?: number
  onContextFailure?: (reason: string) => void
}

const ROTATION_LIMIT = 0.72
const ROTATION_DRAG_SENSITIVITY = 0.012
const ROTATION_EASING_PER_SECOND = 12
const CONTEXT_RESTORE_TIMEOUT_MS = 2500

export class CardViewerRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly options: CardViewerRendererOptions
  private readonly gl: WebGLRenderingContext
  private readonly resizeObserver: ResizeObserver
  private readonly profile: FoilProfile
  private mask: FoilMask
  private readonly seed: number
  private animationFrame = 0
  private contextRestoreTimer = 0
  private initializationGeneration = 0
  private loadController?: AbortController
  private program?: WebGLProgram
  private frontTexture?: WebGLTexture
  private neutralTexture?: WebGLTexture
  private materialTextures: WebGLTexture[] = []
  private vertexBuffer?: WebGLBuffer
  private indexBuffer?: WebGLBuffer
  private readonly uniformLocations = new Map<string, WebGLUniformLocation | null>()
  private tuning: FoilTuning
  private interactive = false
  private rendering = false
  private framePending = false
  private disposed = false
  private contextLost = false
  private observingResize = false
  private isDragging = false
  private activePointerId?: number
  private previousPointer?: { x: number; y: number }
  private rotation = { x: 0, y: 0 }
  private targetRotation = { x: 0, y: 0 }
  private readonly startedAt = performance.now()
  private lastFrameAt = performance.now()

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
    this.profile = resolveFoilProfile(options.finish, options.rarity, {
      cardId: options.cardId,
      supertype: options.supertype,
    })
    this.mask = resolveFoilMask(
      options.supertype,
      this.profile.name,
      options.isEvolved,
      options.cardId,
      options.foilMask,
    )
    this.seed = getCardFoilSeed(options.cardId)
    this.tuning = resolveFoilTuning(this.profile, options.foilTuning)
    this.resizeObserver = new ResizeObserver(() => {
      if (this.rendering) {
        this.resize()
        this.requestFrame()
      }
    })
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost)
    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored)
  }

  async initialize(): Promise<void> {
    const generation = ++this.initializationGeneration
    this.loadController?.abort()
    this.loadController = new AbortController()

    try {
      await this.createGpuResources(this.loadController.signal, generation)
      if (this.disposed || generation !== this.initializationGeneration) {
        if (this.disposed) this.deleteGpuResources()
        throw new DOMException('Renderer initialization aborted', 'AbortError')
      }
    } catch (error) {
      if (this.disposed || generation === this.initializationGeneration) {
        this.deleteGpuResources()
      }
      throw error
    }
  }

  start(interactive = this.options.interactive !== false, rendering = true): void {
    if (this.disposed) return

    if (!this.observingResize) {
      this.resizeObserver.observe(this.canvas)
      this.observingResize = true
    }
    this.setInteractive(interactive)
    this.resize()
    this.rendering = false
    this.setRendering(rendering)
  }

  setInteractive(interactive: boolean): void {
    if (this.disposed || this.interactive === interactive) return
    this.interactive = interactive

    if (interactive) {
      this.canvas.addEventListener('pointerdown', this.handlePointerDown)
      this.canvas.addEventListener('pointermove', this.handlePointerMove)
      this.canvas.addEventListener('pointerup', this.handlePointerUp)
      this.canvas.addEventListener('pointercancel', this.handlePointerUp)
      this.canvas.addEventListener('lostpointercapture', this.handleLostPointerCapture)
      return
    }

    this.removePointerListeners()
    this.releaseActivePointerCapture()
    this.isDragging = false
    this.previousPointer = undefined
  }

  setTargetRotation(rotationX: number, rotationY: number): void {
    const rotationLimit = this.options.rotationLimit ?? ROTATION_LIMIT
    this.targetRotation.x = clamp(rotationX, -rotationLimit, rotationLimit)
    this.targetRotation.y = clamp(rotationY, -rotationLimit, rotationLimit)
    this.requestFrame()
  }

  setFoilTuning(overrides: FoilTuningOverrides | undefined): void {
    this.tuning = resolveFoilTuning(this.profile, overrides)
    this.requestFrame()
  }

  setFoilMask(mask: FoilMask | undefined): void {
    this.mask = resolveFoilMask(
      this.options.supertype,
      this.profile.name,
      this.options.isEvolved,
      this.options.cardId,
      mask,
    )
    this.requestFrame()
  }

  setRendering(rendering: boolean): void {
    if (this.disposed || this.rendering === rendering) return
    this.rendering = rendering

    if (!rendering) {
      cancelAnimationFrame(this.animationFrame)
      this.framePending = false
      return
    }

    this.resize()
    this.lastFrameAt = performance.now()
    this.requestFrame()
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.rendering = false
    this.initializationGeneration += 1
    this.loadController?.abort()
    this.loadController = undefined
    cancelAnimationFrame(this.animationFrame)
    this.framePending = false
    window.clearTimeout(this.contextRestoreTimer)
    this.resizeObserver.disconnect()
    this.removePointerListeners()
    this.releaseActivePointerCapture()
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost)
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored)
    this.deleteGpuResources()
  }

  private async createGpuResources(signal: AbortSignal, generation: number): Promise<void> {
    const gl = this.gl
    if (gl.isContextLost()) {
      throw new Error('WebGL context is unavailable')
    }

    this.deleteGpuResources()
    this.program = createProgram(gl, CARD_VERTEX_SHADER_SOURCE, CARD_FRAGMENT_SHADER_SOURCE)
    this.vertexBuffer = gl.createBuffer() ?? undefined
    this.indexBuffer = gl.createBuffer() ?? undefined
    this.neutralTexture = createNeutralTexture(gl)

    if (!this.vertexBuffer || !this.indexBuffer || !this.neutralTexture) {
      throw new Error('Unable to create WebGL card resources')
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, buildCardVertices(), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, buildCardIndices(), gl.STATIC_DRAW)
    gl.useProgram(this.program)
    bindCardAttributes(gl, this.program)

    const frontTexture = await loadImageTexture(gl, this.options.frontImageUrl, { signal })
    if (this.disposed || generation !== this.initializationGeneration) {
      gl.deleteTexture(frontTexture)
      throw new DOMException('Renderer initialization superseded', 'AbortError')
    }
    this.frontTexture = frontTexture

    for (const textureUrl of getFoilTextureUrls(this.profile)) {
      const texture = await loadImageTexture(gl, textureUrl, { signal })
      if (this.disposed || generation !== this.initializationGeneration) {
        gl.deleteTexture(texture)
        throw new DOMException('Renderer initialization superseded', 'AbortError')
      }
      this.materialTextures.push(texture)
    }
  }

  private deleteGpuResources(): void {
    const gl = this.gl

    if (this.frontTexture) gl.deleteTexture(this.frontTexture)
    if (this.neutralTexture) gl.deleteTexture(this.neutralTexture)
    for (const texture of this.materialTextures) gl.deleteTexture(texture)
    if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer)
    if (this.indexBuffer) gl.deleteBuffer(this.indexBuffer)
    if (this.program) gl.deleteProgram(this.program)

    this.frontTexture = undefined
    this.neutralTexture = undefined
    this.materialTextures = []
    this.vertexBuffer = undefined
    this.indexBuffer = undefined
    this.program = undefined
    this.uniformLocations.clear()
  }

  private clearLostResourceReferences(): void {
    this.frontTexture = undefined
    this.neutralTexture = undefined
    this.materialTextures = []
    this.vertexBuffer = undefined
    this.indexBuffer = undefined
    this.program = undefined
    this.uniformLocations.clear()
  }

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault()
    if (this.disposed) return

    this.contextLost = true
    this.loadController?.abort()
    cancelAnimationFrame(this.animationFrame)
    this.framePending = false
    window.clearTimeout(this.contextRestoreTimer)
    this.contextRestoreTimer = window.setTimeout(() => {
      this.failContext('WebGL context could not be restored')
    }, CONTEXT_RESTORE_TIMEOUT_MS)
  }

  private readonly handleContextRestored = (): void => {
    if (this.disposed) return

    window.clearTimeout(this.contextRestoreTimer)
    this.contextLost = false
    this.clearLostResourceReferences()

    void this.initialize()
      .then(() => {
        if (this.disposed) return
        this.resize()
        this.lastFrameAt = performance.now()
        this.requestFrame()
      })
      .catch((error: unknown) => {
        if (!this.disposed) {
          this.failContext(error instanceof Error ? error.message : 'WebGL restoration failed')
        }
      })
  }

  private failContext(reason: string): void {
    if (this.disposed) return
    this.rendering = false
    cancelAnimationFrame(this.animationFrame)
    this.framePending = false
    this.options.onContextFailure?.(reason)
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (!event.isPrimary) return
    this.isDragging = true
    this.activePointerId = event.pointerId
    this.previousPointer = { x: event.clientX, y: event.clientY }
    this.canvas.setPointerCapture(event.pointerId)
    this.requestFrame()
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (!this.isDragging || !this.previousPointer || event.pointerId !== this.activePointerId) {
      return
    }

    const dx = event.clientX - this.previousPointer.x
    const dy = event.clientY - this.previousPointer.y
    const rotationLimit = this.options.rotationLimit ?? ROTATION_LIMIT
    this.targetRotation.y = clamp(
      this.targetRotation.y + dx * ROTATION_DRAG_SENSITIVITY,
      -rotationLimit,
      rotationLimit,
    )
    this.targetRotation.x = clamp(
      this.targetRotation.x + dy * ROTATION_DRAG_SENSITIVITY,
      -rotationLimit,
      rotationLimit,
    )
    this.previousPointer = { x: event.clientX, y: event.clientY }
    this.requestFrame()
  }

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) return
    this.isDragging = false
    this.previousPointer = undefined
    this.releaseActivePointerCapture()
  }

  private readonly handleLostPointerCapture = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) return
    this.isDragging = false
    this.previousPointer = undefined
    this.activePointerId = undefined
  }

  private removePointerListeners(): void {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown)
    this.canvas.removeEventListener('pointermove', this.handlePointerMove)
    this.canvas.removeEventListener('pointerup', this.handlePointerUp)
    this.canvas.removeEventListener('pointercancel', this.handlePointerUp)
    this.canvas.removeEventListener('lostpointercapture', this.handleLostPointerCapture)
  }

  private releaseActivePointerCapture(): void {
    if (this.activePointerId !== undefined && this.canvas.hasPointerCapture(this.activePointerId)) {
      this.canvas.releasePointerCapture(this.activePointerId)
    }
    this.activePointerId = undefined
  }

  private resize(): void {
    if (this.contextLost || this.disposed) return

    // CSS transforms are used while cards leave the booster. clientWidth keeps
    // the backing buffer at final layout size instead of stretching a small frame.
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

  private requestFrame(): void {
    if (
      this.disposed ||
      this.contextLost ||
      !this.rendering ||
      this.framePending ||
      !this.program ||
      !this.frontTexture
    ) {
      return
    }

    this.framePending = true
    this.animationFrame = requestAnimationFrame(this.render)
  }

  private readonly render = (frameTime: number): void => {
    this.framePending = false
    if (!this.rendering || this.contextLost || this.disposed) return

    const gl = this.gl
    if (!this.program || !this.frontTexture || !this.neutralTexture) return

    const deltaSeconds = clamp((frameTime - this.lastFrameAt) / 1000, 1 / 240, 0.05)
    this.lastFrameAt = frameTime
    const easing = this.options.reduceMotion
      ? 1
      : 1 - Math.exp(-ROTATION_EASING_PER_SECOND * deltaSeconds)
    this.rotation.x = lerp(this.rotation.x, this.targetRotation.x, easing)
    this.rotation.y = lerp(this.rotation.y, this.targetRotation.y, easing)

    gl.clearColor(0, 0, 0, 0)
    gl.clearDepth(1)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.CULL_FACE)
    gl.cullFace(gl.BACK)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.useProgram(this.program)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer ?? null)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer ?? null)

    const aspect = this.canvas.width / this.canvas.height
    const projection = createProjectionMatrix(Math.PI / 4, aspect, 0.1, 100)
    const view = createViewMatrix(this.options.cameraDistance)
    const model = createModelMatrix(this.rotation.x, this.rotation.y)
    const mvp = createModelViewProjectionMatrix(projection, view, model)
    const bandDirection = getFoilBandDirection(this.profile.bandAngle)
    const motionPhase = (((frameTime - this.startedAt) / 1000) * this.profile.motionSpeed * 4) % 1

    this.setUniformMatrix('uMvp', mvp)
    this.setUniformMatrix('uModel', model)
    this.setUniform1f('uMotionPhase', motionPhase)
    this.setUniform1f('uMotion', this.tuning.motion ? 1 : 0)
    this.setUniform1f('uIntensity', this.tuning.intensity)
    this.setUniform1f('uGlare', this.tuning.glare)
    this.setUniform1f('uTextureScale', this.tuning.textureScale)
    this.setUniform1f('uSeed', this.seed)
    this.setUniform1f('uBandFrequency', this.profile.bandFrequency)
    this.setUniform2f('uBandDirection', bandDirection[0], bandDirection[1])
    this.setUniform2f('uLight', this.tuning.lightX, this.tuning.lightY)
    this.setUniform4f('uArtworkRect', ...this.mask.artwork)
    this.setUniform4f('uStockRect', ...this.mask.stock)
    this.setUniform3f('uEvolutionCircle', ...(this.mask.evolution ?? ([0, 0, 0] as const)))
    this.setUniform1f('uHasEvolutionCircle', this.mask.evolution ? 1 : 0)
    this.setUniform1i('uProfile', this.profile.uniform)

    this.bindTexture(0, this.frontTexture, 'uFrontTexture')
    this.bindTexture(1, this.materialTextures[0] ?? this.neutralTexture, 'uMaterialTextureA')
    this.bindTexture(2, this.materialTextures[1] ?? this.neutralTexture, 'uMaterialTextureB')
    this.bindTexture(3, this.materialTextures[2] ?? this.neutralTexture, 'uMaterialTextureC')
    gl.drawElements(gl.TRIANGLES, CARD_INDEX_COUNT, gl.UNSIGNED_SHORT, 0)

    const rotationSettled =
      Math.abs(this.rotation.x - this.targetRotation.x) < 0.0005 &&
      Math.abs(this.rotation.y - this.targetRotation.y) < 0.0005
    const materialMoves = this.profile.name !== 'none' && this.tuning.motion
    if (materialMoves || !rotationSettled) this.requestFrame()
  }

  private bindTexture(unit: number, texture: WebGLTexture, samplerName: string): void {
    this.gl.activeTexture(this.gl.TEXTURE0 + unit)
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
    this.setUniform1i(samplerName, unit)
  }

  private getUniformLocation(name: string): WebGLUniformLocation | null {
    if (!this.program) return null
    if (!this.uniformLocations.has(name)) {
      this.uniformLocations.set(name, this.gl.getUniformLocation(this.program, name))
    }
    return this.uniformLocations.get(name) ?? null
  }

  private setUniformMatrix(name: string, value: Float32List): void {
    const location = this.getUniformLocation(name)
    if (location) this.gl.uniformMatrix4fv(location, false, value)
  }

  private setUniform1f(name: string, value: number): void {
    const location = this.getUniformLocation(name)
    if (location) this.gl.uniform1f(location, value)
  }

  private setUniform1i(name: string, value: number): void {
    const location = this.getUniformLocation(name)
    if (location) this.gl.uniform1i(location, value)
  }

  private setUniform2f(name: string, x: number, y: number): void {
    const location = this.getUniformLocation(name)
    if (location) this.gl.uniform2f(location, x, y)
  }

  private setUniform3f(name: string, x: number, y: number, z: number): void {
    const location = this.getUniformLocation(name)
    if (location) this.gl.uniform3f(location, x, y, z)
  }

  private setUniform4f(name: string, x: number, y: number, z: number, w: number): void {
    const location = this.getUniformLocation(name)
    if (location) this.gl.uniform4f(location, x, y, z, w)
  }
}

const createNeutralTexture = (gl: WebGLRenderingContext): WebGLTexture | undefined => {
  const texture = gl.createTexture() ?? undefined
  if (!texture) return undefined

  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0, 0]),
  )
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  return texture
}
