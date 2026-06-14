import {
  BOOSTER_ASPECT,
  BOOSTER_HEIGHT,
  BOOSTER_TEAR_BASELINE,
  BOOSTER_VERTEX_STRIDE_FLOATS,
  BOOSTER_WIDTH,
  buildBoosterMesh,
} from './booster-geometry'
import {
  BOOSTER_FRAGMENT_SHADER_SOURCE,
  BOOSTER_VERTEX_SHADER_SOURCE,
} from './booster-tear-shaders'
import { createProgram, setAttribute, setUniform1f, setUniformMatrix } from './gl-program'
import {
  createModelMatrix,
  createModelViewProjectionMatrix,
  createProjectionMatrix,
  createViewMatrix,
} from './mat4'
import { clamp, lerp } from './number-utils'
import { loadImageTexture } from './texture-loader'

interface BoosterTearRendererOptions {
  imageUrl: string
  onProgress?: (progress: number) => void
  onComplete?: () => void
  // Returns whether a tear may currently be started (e.g. authenticated, off
  // cooldown, not already opening). Read live so prop changes don't remount.
  canTear?: () => boolean
}

const TILT_LIMIT = 0.34
const TILT_EASING = 0.08
const FRONT_EASING = 0.24
const COMPLETE_THRESHOLD = 0.97
const CUT_START_DELTA = 0.018
// The pack is cut along its top seam. Keep the interactive zone generous enough
// for thumbs, but avoid middle-of-pack drags opening it by accident.
const GRAB_ZONE_TOP = -0.08
const GRAB_ZONE_BOTTOM = 0.45
// After the rip completes, the strip detaches and hangs above the pack briefly,
// then we hand off to the card reveal.
const LAUNCH_MS = 920
const AFTER_LAUNCH_HOLD_MS = 260

// Camera/projection constants mirrored from mat4.ts so we can map pointer
// coordinates onto the booster's actual on-screen footprint.
const BOOSTER_CAMERA_DISTANCE = 8.4
const FIELD_OF_VIEW = Math.PI / 4
const BOOSTER_FILL = BOOSTER_HEIGHT / (2 * Math.tan(FIELD_OF_VIEW / 2) * BOOSTER_CAMERA_DISTANCE)

export class BoosterTearRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly options: BoosterTearRendererOptions
  private readonly gl: WebGLRenderingContext
  private readonly resizeObserver: ResizeObserver
  private readonly prefersReducedMotion: boolean
  private animationFrame = 0
  private program?: WebGLProgram
  private texture?: WebGLTexture
  private vertexBuffer?: WebGLBuffer
  private indexBuffer?: WebGLBuffer
  private indexCount = 0
  private readonly startedAt = performance.now()

  // Tear state
  private isTearing = false
  private hasStartedCut = false
  private cutEngaged = false
  private startX = 0
  private direction = 1
  private targetFront = 0
  private currentFront = 0
  private progress = 0
  private isComplete = false
  private completedAt = 0
  private launch = 0
  private flash = 0

  // Idle tilt
  private targetTilt = { x: 0, y: 0 }
  private tilt = { x: 0, y: 0 }

  constructor(canvas: HTMLCanvasElement, options: BoosterTearRendererOptions) {
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
    this.prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
    this.resizeObserver = new ResizeObserver(() => this.resize())
  }

  async initialize(): Promise<void> {
    const gl = this.gl
    this.program = createProgram(gl, BOOSTER_VERTEX_SHADER_SOURCE, BOOSTER_FRAGMENT_SHADER_SOURCE)

    const mesh = buildBoosterMesh()
    this.indexCount = mesh.indexCount
    this.vertexBuffer = gl.createBuffer() ?? undefined
    this.indexBuffer = gl.createBuffer() ?? undefined

    if (!this.vertexBuffer || !this.indexBuffer) {
      throw new Error('Unable to create WebGL buffers')
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW)

    this.texture = await loadImageTexture(gl, this.options.imageUrl)
  }

  start(): void {
    this.resizeObserver.observe(this.canvas)
    this.canvas.addEventListener('pointerdown', this.handlePointerDown)
    this.canvas.addEventListener('pointermove', this.handlePointerMove)
    this.canvas.addEventListener('pointerup', this.handlePointerUp)
    this.canvas.addEventListener('pointercancel', this.handlePointerUp)
    this.canvas.addEventListener('pointerleave', this.handlePointerLeave)
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
    this.canvas.removeEventListener('pointerleave', this.handlePointerLeave)

    if (this.texture) gl.deleteTexture(this.texture)
    if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer)
    if (this.indexBuffer) gl.deleteBuffer(this.indexBuffer)
    if (this.program) gl.deleteProgram(this.program)
  }

  // Raw 0..1 pointer position over the canvas.
  private canvasPointer(event: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect()
    return {
      x: clamp((event.clientX - rect.left) / Math.max(rect.width, 1), 0, 1),
      y: clamp((event.clientY - rect.top) / Math.max(rect.height, 1), 0, 1),
    }
  }

  // Pointer position in the booster's own space: bx 0..1 left→right (= uv.x),
  // by 0 at the booster's top edge, 1 at its bottom.
  private boosterPointer(event: PointerEvent): { bx: number; by: number } {
    const { x, y } = this.canvasPointer(event)
    const aspect = Math.max(this.canvas.clientWidth / Math.max(this.canvas.clientHeight, 1), 0.1)
    const fillX = Math.min(1, BOOSTER_FILL * (BOOSTER_ASPECT / aspect))
    const fillY = BOOSTER_FILL
    const marginX = (1 - fillX) / 2
    const marginY = (1 - fillY) / 2

    return {
      bx: clamp((x - marginX) / fillX, 0, 1),
      by: (y - marginY) / fillY,
    }
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (this.isComplete) return
    if (this.options.canTear && !this.options.canTear()) return
    event.preventDefault()
    const { bx, by } = this.boosterPointer(event)
    this.canvas.setPointerCapture(event.pointerId)

    if (by >= GRAB_ZONE_TOP && by <= GRAB_ZONE_BOTTOM) {
      this.isTearing = true
      this.hasStartedCut = false
      this.cutEngaged = false
      this.startX = bx
      this.targetFront = bx
      this.currentFront = bx
      this.progress = 0
      this.options.onProgress?.(0)
    }
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const { x, y } = this.canvasPointer(event)
    this.targetTilt = {
      y: (x - 0.5) * 2 * TILT_LIMIT,
      x: -(y - 0.5) * 2 * (TILT_LIMIT * 0.6),
    }

    if (!this.isTearing || this.isComplete) return

    const aspect = Math.max(this.canvas.clientWidth / Math.max(this.canvas.clientHeight, 1), 0.1)
    const fillX = Math.min(1, BOOSTER_FILL * (BOOSTER_ASPECT / aspect))
    const marginX = (1 - fillX) / 2
    const bx = clamp((x - marginX) / fillX, 0, 1)
    if (!this.hasStartedCut) {
      const delta = bx - this.startX
      if (Math.abs(delta) > CUT_START_DELTA) {
        this.hasStartedCut = true
        this.cutEngaged = true
        this.direction = delta >= 0 ? 1 : -1
        const closedEdge = this.direction > 0 ? 0 : 1
        this.currentFront = closedEdge
        this.targetFront = closedEdge
      }
    }

    if (this.hasStartedCut) {
      this.targetFront = bx
      const targetProgress = this.direction > 0 ? this.targetFront : 1 - this.targetFront
      if (targetProgress >= COMPLETE_THRESHOLD) {
        this.completeCut()
      }
    }
  }

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId)
    }

    if (this.isComplete) return

    // Released before fully cut -> recoil the strip closed.
    this.isTearing = false
    this.hasStartedCut = false
    this.targetFront = this.direction > 0 ? 0 : 1
  }

  private readonly handlePointerLeave = (): void => {
    this.targetTilt = { x: 0, y: 0 }
  }

  private resize(): void {
    const { width, height } = this.canvas.getBoundingClientRect()
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    const displayWidth = Math.max(1, Math.floor(width * pixelRatio))
    const displayHeight = Math.max(1, Math.floor(height * pixelRatio))

    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      this.canvas.width = displayWidth
      this.canvas.height = displayHeight
    }

    this.gl.viewport(0, 0, displayWidth, displayHeight)
  }

  private updateState(): void {
    this.currentFront = lerp(this.currentFront, this.targetFront, FRONT_EASING)

    if (this.hasStartedCut && this.isTearing) {
      this.progress = this.direction > 0 ? this.currentFront : 1 - this.currentFront
      this.progress = clamp(this.progress, 0, 1)
      this.options.onProgress?.(this.progress)

      if (!this.isComplete && this.progress >= COMPLETE_THRESHOLD) {
        this.completeCut()
      }
    } else if (!this.isComplete && !this.isTearing && this.cutEngaged) {
      // Released before fully torn: ease the strip back closed, then disengage.
      this.progress = lerp(this.progress, 0, FRONT_EASING)
      this.options.onProgress?.(this.progress)
      const closedEdge = this.direction > 0 ? 0 : 1
      if (Math.abs(this.currentFront - closedEdge) < 0.01) {
        this.cutEngaged = false
        this.progress = 0
        this.options.onProgress?.(0)
      }
    }

    this.flash = lerp(this.flash, 0, 0.12)

    if (this.isComplete) {
      const elapsed = performance.now() - this.completedAt
      this.launch = clamp(elapsed / LAUNCH_MS, 0, 1)

      if (elapsed >= LAUNCH_MS + AFTER_LAUNCH_HOLD_MS) {
        const complete = this.options.onComplete
        this.options.onComplete = undefined
        complete?.()
      }
    }
  }

  private completeCut(): void {
    if (this.isComplete) return

    this.isComplete = true
    this.completedAt = performance.now()
    this.isTearing = false
    this.hasStartedCut = false
    // Snap the cut fully across so the whole rim reads as open as it launches.
    this.targetFront = this.direction > 0 ? 1 : 0
    this.currentFront = this.targetFront
    this.progress = 1
    this.flash = 1
    this.options.onProgress?.(1)
  }

  private render = (): void => {
    const gl = this.gl

    if (!this.program || !this.texture || !this.vertexBuffer || !this.indexBuffer) {
      return
    }

    this.updateState()

    this.tilt.x = lerp(this.tilt.x, this.targetTilt.x, TILT_EASING)
    this.tilt.y = lerp(this.tilt.y, this.targetTilt.y, TILT_EASING)

    const time = (performance.now() - this.startedAt) / 1000
    const sway = this.prefersReducedMotion ? 0 : Math.sin(time * 0.7) * 0.04
    const breathe = this.prefersReducedMotion ? 0 : Math.sin(time * 1.1) * 0.02

    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.CULL_FACE)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.useProgram(this.program)

    const aspect = this.canvas.width / this.canvas.height
    const projection = createProjectionMatrix(FIELD_OF_VIEW, aspect, 0.1, 100)
    const view = createViewMatrix(BOOSTER_CAMERA_DISTANCE)
    const model = createModelMatrix(this.tilt.x + breathe, this.tilt.y + sway)
    const mvp = createModelViewProjectionMatrix(projection, view, model)

    const stride = BOOSTER_VERTEX_STRIDE_FLOATS * Float32Array.BYTES_PER_ELEMENT
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
    setAttribute(gl, this.program, 'aPos', 2, stride, 0)
    setAttribute(gl, this.program, 'aUv', 2, stride, 2 * Float32Array.BYTES_PER_ELEMENT)

    setUniformMatrix(gl, this.program, 'uMvp', mvp)
    const visualProgress =
      this.isTearing && this.hasStartedCut
        ? clamp(this.direction > 0 ? this.targetFront : 1 - this.targetFront, 0, 1)
        : this.progress
    setUniform1f(gl, this.program, 'uFrontX', this.currentFront)
    setUniform1f(gl, this.program, 'uDir', this.direction)
    setUniform1f(gl, this.program, 'uActive', this.cutEngaged || this.isComplete ? 1 : 0)
    setUniform1f(gl, this.program, 'uProgress', visualProgress)
    setUniform1f(gl, this.program, 'uBaseline', BOOSTER_TEAR_BASELINE)
    setUniform1f(gl, this.program, 'uBaselineY', (BOOSTER_TEAR_BASELINE - 0.5) * BOOSTER_HEIGHT)
    setUniform1f(gl, this.program, 'uHalfWidth', BOOSTER_WIDTH / 2)
    setUniform1f(gl, this.program, 'uLaunch', this.launch)
    setUniform1f(gl, this.program, 'uTime', time)
    setUniform1f(gl, this.program, 'uFlash', this.flash)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    const textureLocation = gl.getUniformLocation(this.program, 'uTex')
    if (textureLocation) gl.uniform1i(textureLocation, 0)

    // Body pass, then the launching strip on top (painter's order, no depth test).
    setUniform1f(gl, this.program, 'uMode', 0)
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0)
    setUniform1f(gl, this.program, 'uMode', 1)
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0)

    this.animationFrame = requestAnimationFrame(this.render)
  }
}
