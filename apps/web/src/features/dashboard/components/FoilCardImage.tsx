import { useEffect, useRef } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import type { CardFinish } from '@tcg-collection/shared'
import type { MotionValue } from 'motion/react'

import { cn } from '@/lib/utils'
import {
  computeFoilLighting,
  getBorderFoilRegions,
  getCardFoilSeed,
  getMainFoilRegions,
  resolveFoilMask,
  resolveFoilProfile,
  resolveFoilTuning,
  toCssCircleClipPath,
  type FoilProfile,
  type FoilMask,
  type FoilTuning,
  type FoilTuningOverrides,
  type NormalizedRect,
} from '../lib/card-foil'

interface FoilCardImageProps {
  src: string
  alt: string
  cardId: string
  finish?: CardFinish
  rarity?: string
  supertype?: string
  isEvolved?: boolean
  className: string
  containerClassName?: string
  foilTuning?: FoilTuningOverrides
  foilMask?: FoilMask
  rotationX?: MotionValue<number>
  rotationY?: MotionValue<number>
  tiltX?: number
  tiltY?: number
  interactive?: boolean
  renderTilt?: boolean
}

type FoilCssProperties = CSSProperties & Record<`--foil-${string}`, string | number>

export function FoilCardImage({
  src,
  alt,
  cardId,
  finish,
  rarity,
  supertype,
  isEvolved,
  className,
  containerClassName,
  foilTuning: tuningOverrides,
  foilMask,
  rotationX,
  rotationY,
  tiltX = 0,
  tiltY = 0,
  interactive = true,
  renderTilt = false,
}: FoilCardImageProps) {
  const rootRef = useRef<HTMLSpanElement>(null)
  const profile = resolveFoilProfile(finish, rarity)
  const mask = foilMask ?? resolveFoilMask(supertype, profile.name, isEvolved)
  const tuning = resolveFoilTuning(profile, tuningOverrides)
  const seed = getCardFoilSeed(cardId)
  const mainRegions = getMainFoilRegions(profile, mask)
  const borderRegions = getBorderFoilRegions(profile, mask)
  const evolutionExclusion =
    profile.name === 'rare-holo' || profile.name === 'reverse-holo' ? mask.evolution : undefined
  const materialMaskStyle = createMaterialMaskStyle([...mainRegions, ...borderRegions])
  const initialRotationX = rotationX?.get() ?? tiltX
  const initialRotationY = rotationY?.get() ?? tiltY
  const style = createFoilStyle(
    profile,
    tuning,
    seed,
    initialRotationX,
    initialRotationY,
    renderTilt,
  )

  useEffect(() => {
    const applyExternalState = () => {
      const element = rootRef.current
      if (!element) return

      applyFoilCssVariables(
        element,
        profile,
        tuning,
        rotationX?.get() ?? tiltX,
        rotationY?.get() ?? tiltY,
        tuning.lightX,
        tuning.lightY,
        renderTilt,
      )
    }

    applyExternalState()
    const unsubscribeX = rotationX?.on('change', applyExternalState)
    const unsubscribeY = rotationY?.on('change', applyExternalState)

    return () => {
      unsubscribeX?.()
      unsubscribeY?.()
    }
  }, [profile, renderTilt, rotationX, rotationY, seed, tiltX, tiltY, tuning])

  const handlePointerMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!interactive || profile.name === 'none' || rotationX || rotationY) return

    const bounds = event.currentTarget.getBoundingClientRect()
    const pointerX = ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * 2 - 1
    const pointerY = ((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * 2 - 1
    const pointerTiltX = renderTilt ? -pointerY * 0.16 : -pointerY * 0.08
    const pointerTiltY = renderTilt ? pointerX * 0.2 : pointerX * 0.1

    applyFoilCssVariables(
      event.currentTarget,
      profile,
      tuning,
      pointerTiltX,
      pointerTiltY,
      pointerX,
      pointerY,
      renderTilt,
    )
  }

  const handlePointerLeave = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!interactive || profile.name === 'none') return

    applyFoilCssVariables(
      event.currentTarget,
      profile,
      tuning,
      rotationX?.get() ?? tiltX,
      rotationY?.get() ?? tiltY,
      tuning.lightX,
      tuning.lightY,
      renderTilt,
    )
  }

  return (
    <span
      ref={rootRef}
      className={cn(
        'foil-card relative block overflow-hidden rounded-[3.6%/2.6%]',
        renderTilt && 'will-change-transform',
        containerClassName,
      )}
      data-foil-profile={profile.name}
      data-foil-motion={profile.name !== 'none' && tuning.motion ? 'true' : 'false'}
      style={style}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <img src={src} alt={alt} className={className} />
      {profile.name !== 'none' ? (
        <span
          className="foil-material pointer-events-none absolute inset-0"
          style={materialMaskStyle}
          aria-hidden="true"
        >
          <span className="foil-spectrum absolute inset-0" />
          <span className="foil-bands absolute inset-0" />
          <span className="foil-reflection absolute inset-0" />
        </span>
      ) : null}
      {evolutionExclusion ? (
        <img
          src={src}
          alt=""
          aria-hidden="true"
          className={cn(className, 'pointer-events-none absolute inset-0 z-[2]')}
          style={{ clipPath: toCssCircleClipPath(evolutionExclusion) }}
        />
      ) : null}
    </span>
  )
}

const createMaterialMaskStyle = (regions: readonly NormalizedRect[]): CSSProperties | undefined => {
  if (regions.length === 0) return undefined

  if (
    regions.length === 1 &&
    regions[0][0] === 0 &&
    regions[0][1] === 0 &&
    regions[0][2] === 1 &&
    regions[0][3] === 1
  ) {
    return undefined
  }

  const image = regions.map(() => 'linear-gradient(#000 0 0)').join(', ')
  const position = regions
    .map(([left, top, right, bottom]) => {
      const width = right - left
      const height = bottom - top
      return `${toMaskPosition(left, width)} ${toMaskPosition(top, height)}`
    })
    .join(', ')
  const size = regions
    .map(([left, top, right, bottom]) => `${(right - left) * 100}% ${(bottom - top) * 100}%`)
    .join(', ')

  return {
    maskImage: image,
    maskPosition: position,
    maskRepeat: 'no-repeat',
    maskSize: size,
    WebkitMaskImage: image,
    WebkitMaskPosition: position,
    WebkitMaskRepeat: 'no-repeat',
    WebkitMaskSize: size,
  }
}

const toMaskPosition = (start: number, size: number): string =>
  size >= 1 ? '0%' : `${(start / (1 - size)) * 100}%`

const createFoilStyle = (
  profile: FoilProfile,
  tuning: FoilTuning,
  seed: number,
  rotationX: number,
  rotationY: number,
  renderTilt: boolean,
): FoilCssProperties => {
  const lighting = computeFoilLighting(rotationX, rotationY, tuning.lightX, tuning.lightY)
  const motionDuration = clamp(1 / Math.max(profile.motionSpeed * 4, 0.01), 9, 18)
  const style: FoilCssProperties = {
    '--foil-band-angle': `${profile.bandAngle}deg`,
    '--foil-band-size': `${Math.max(55, 520 / Math.max(profile.bandFrequency, 0.1))}%`,
    '--foil-motion-duration': `${motionDuration}s`,
    '--foil-motion-delay': `${-seed * motionDuration}s`,
    transformStyle: 'preserve-3d',
  }

  assignLightingVariables(style, profile, tuning, lighting)

  if (renderTilt) {
    style.transform = `perspective(1200px) rotateX(${rotationX}rad) rotateY(${rotationY}rad)`
  }

  return style
}

const applyFoilCssVariables = (
  element: HTMLSpanElement,
  profile: FoilProfile,
  tuning: FoilTuning,
  rotationX: number,
  rotationY: number,
  lightX: number,
  lightY: number,
  renderTilt: boolean,
) => {
  const lighting = computeFoilLighting(rotationX, rotationY, lightX, lightY)
  const values: FoilCssProperties = {}
  assignLightingVariables(values, profile, tuning, lighting)

  for (const [property, value] of Object.entries(values)) {
    element.style.setProperty(property, String(value))
  }

  if (renderTilt) {
    element.style.transform = `perspective(1200px) rotateX(${rotationX}rad) rotateY(${rotationY}rad)`
  }
}

const assignLightingVariables = (
  style: FoilCssProperties,
  profile: FoilProfile,
  tuning: FoilTuning,
  lighting: ReturnType<typeof computeFoilLighting>,
) => {
  const materialResponse = lighting.response * tuning.intensity
  const glareResponse = lighting.glare * tuning.glare
  const isMegaRainbow = profile.name === 'mega-hyper-rare'
  const isRareHolo = profile.name === 'rare-holo'
  const isReverseHolo = profile.name === 'reverse-holo'
  const isClassicHolo = isRareHolo || isReverseHolo

  style['--foil-reflection-x'] = `${lighting.reflectionX}%`
  style['--foil-reflection-y'] = `${lighting.reflectionY}%`
  style['--foil-spectrum-opacity'] = clamp(
    materialResponse * (isMegaRainbow ? 0.34 : isReverseHolo ? 0.34 : isClassicHolo ? 0.28 : 0.24),
    0,
    isMegaRainbow ? 0.24 : isReverseHolo ? 0.23 : isClassicHolo ? 0.2 : 0.16,
  )
  style['--foil-band-opacity'] = clamp(
    materialResponse * (isMegaRainbow ? 0.24 : isReverseHolo ? 0.3 : isClassicHolo ? 0.25 : 0.22),
    0,
    isMegaRainbow ? 0.16 : isReverseHolo ? 0.2 : isClassicHolo ? 0.18 : 0.13,
  )
  style['--foil-reflection-opacity'] = clamp(
    glareResponse * (isReverseHolo ? 0.32 : isClassicHolo ? 0.28 : 0.22),
    0,
    isReverseHolo ? 0.2 : isClassicHolo ? 0.18 : 0.14,
  )
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value))
