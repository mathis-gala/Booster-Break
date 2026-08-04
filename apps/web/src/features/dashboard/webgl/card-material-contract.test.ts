import { describe, expect, test } from 'bun:test'

import { webGlUvToMaskUv } from '../lib/card-foil'
import { CARD_VERTEX_STRIDE_FLOATS, buildCardVertices } from './card-geometry'
import { CARD_FRAGMENT_SHADER_SOURCE } from './card-shaders'

describe('WebGL card material contract', () => {
  test('front geometry and mask conversion agree on top and bottom orientation', () => {
    const vertices = buildCardVertices()
    const bottomLeftUv = [vertices[3], vertices[4]] as const
    const topLeftOffset = CARD_VERTEX_STRIDE_FLOATS * 3
    const topLeftUv = [vertices[topLeftOffset + 3], vertices[topLeftOffset + 4]] as const

    expect(bottomLeftUv).toEqual([0, 0])
    expect(topLeftUv).toEqual([0, 1])
    expect(webGlUvToMaskUv(...bottomLeftUv)).toEqual([0, 1])
    expect(webGlUvToMaskUv(...topLeftUv)).toEqual([0, 0])
  })

  test('shader converts UVs before applying shared top-origin rectangles', () => {
    expect(CARD_FRAGMENT_SHADER_SOURCE).toContain('vec2 cardUv = vec2(vUv.x, 1.0 - vUv.y);')
    expect(CARD_FRAGMENT_SHADER_SOURCE).toContain(
      'materialMask = stockMask * (1.0 - artworkMask) * (1.0 - evolutionMask);',
    )
    expect(CARD_FRAGMENT_SHADER_SOURCE).toContain(
      'materialMask = max(artworkMask, borderMask) * (1.0 - evolutionMask);',
    )
    expect(CARD_FRAGMENT_SHADER_SOURCE).toContain('evolutionDelta.y *= 88.0 / 63.0;')
  })

  test('normal cards return the source texel before material texture sampling', () => {
    const normalReturn = CARD_FRAGMENT_SHADER_SOURCE.indexOf('gl_FragColor = texel;')
    const materialSample = CARD_FRAGMENT_SHADER_SOURCE.indexOf('vec3 textureA = texture2D')

    expect(normalReturn).toBeGreaterThan(0)
    expect(materialSample).toBeGreaterThan(normalReturn)
  })

  test('Rare Holo does not enter the metal material path', () => {
    expect(CARD_FRAGMENT_SHADER_SOURCE).toContain('if (uProfile == 2) {\n    float metalTexture')
    expect(CARD_FRAGMENT_SHADER_SOURCE).not.toContain(
      'if (uProfile == 1 || uProfile == 2) {\n    float metalTexture',
    )
  })

  test('RR idle motion moves stripes without moving its stars or light', () => {
    expect(CARD_FRAGMENT_SHADER_SOURCE).toContain(
      'float idleLightGate = uProfile == 3 ? 0.0 : motionGate;',
    )
    expect(CARD_FRAGMENT_SHADER_SOURCE).toContain(
      'float textureMotionGate = uProfile == 3 || uProfile == 5 || uProfile == 7',
    )
    expect(CARD_FRAGMENT_SHADER_SOURCE).toContain('vec2 idleLight = idleLightGate * vec2(')
    expect(CARD_FRAGMENT_SHADER_SOURCE).toContain('vec2 textureDrift = textureMotionGate * (')
    expect(CARD_FRAGMENT_SHADER_SOURCE).toContain('float drift = time +')
  })

  test('SR and SIR material textures stay fixed during idle motion', () => {
    expect(CARD_FRAGMENT_SHADER_SOURCE).toContain(
      'float textureMotionGate = uProfile == 3 || uProfile == 5 || uProfile == 7',
    )
    expect(CARD_FRAGMENT_SHADER_SOURCE).toContain('vec2 textureDrift = textureMotionGate * (')
    expect(CARD_FRAGMENT_SHADER_SOURCE).toContain(
      'materialUv(cardUv, uTextureScale * 2.05, offsetC + vec2(0.37, 0.61))',
    )
  })

  test('stripe response is full-surface rather than reflection-spot masked', () => {
    const responseStart = CARD_FRAGMENT_SHADER_SOURCE.indexOf('float materialResponse =')
    const responseEnd = CARD_FRAGMENT_SHADER_SOURCE.indexOf('float chromaStrength =')
    const stripeResponse = CARD_FRAGMENT_SHADER_SOURCE.slice(responseStart, responseEnd)

    expect(CARD_FRAGMENT_SHADER_SOURCE).toContain(
      'float bandResponse = materialResponse * stripeProfileBoost',
    )
    expect(stripeResponse).not.toContain('reflectionSpot')
  })

  test('material motion uses a bounded normalized phase', () => {
    expect(CARD_FRAGMENT_SHADER_SOURCE).toContain('uniform float uMotionPhase;')
    expect(CARD_FRAGMENT_SHADER_SOURCE).not.toContain('uniform float uTime;')
    expect(CARD_FRAGMENT_SHADER_SOURCE).not.toContain('uniform float uMotionSpeed;')
  })
})
