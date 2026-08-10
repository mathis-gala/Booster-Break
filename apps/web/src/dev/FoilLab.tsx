import { useEffect, useState } from 'react'
import type {
  CSSProperties,
  Dispatch,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  SetStateAction,
} from 'react'
import type { CardFinish } from '@tcg-collection/shared'
import { useMotionValue } from 'motion/react'

import { FoilCardImage } from '@/features/dashboard/components/FoilCardImage'
import { WebGlCardViewer } from '@/features/dashboard/components/WebGlCardViewer'
import {
  FOIL_PROFILES,
  EVOLUTION_BUBBLE_MASK,
  FOIL_LAYOUT_MASKS,
  SWSH_EVOLUTION_BUBBLE_MASK,
  SWSH_FOIL_LAYOUT_MASKS,
  getMainFoilRegions,
  isSwordShieldCardId,
  resolveCardLayout,
  resolveFoilProfile,
  type CardLayout,
  type FoilMask,
  type FoilTuningOverrides,
  type NormalizedCircle,
  type NormalizedRect,
} from '@/features/dashboard/lib/card-foil'

interface FoilSample {
  label: string
  cardId: string
  imageUrl: string
  rarity: string
  finish: CardFinish
  supertype: string
  isEvolved?: boolean
}

interface LabSettings {
  tiltX: number
  tiltY: number
  lightX: number
  lightY: number
  intensity: number
  glare: number
  textureScale: number
  motion: boolean
}

type ReverseCalibrationLayout = CardLayout

interface MaskRectSettings {
  x: number
  y: number
  width: number
  height: number
}

interface CircleMaskSettings {
  x: number
  y: number
  size: number
}

interface ReverseMaskSettings {
  artwork: MaskRectSettings
  stock: MaskRectSettings
  evolution?: CircleMaskSettings
}

const samples: readonly FoilSample[] = [
  {
    label: 'Normal',
    cardId: 'sv10-034',
    imageUrl: 'https://assets.tcgdex.net/en/sv/sv10/034/high.png',
    rarity: 'Rare',
    finish: 'normal',
    supertype: 'Pokémon',
    isEvolved: true,
  },
  {
    label: 'Rare Holo',
    cardId: 'sv10-034',
    imageUrl: 'https://assets.tcgdex.net/en/sv/sv10/034/high.png',
    rarity: 'Rare',
    finish: 'holo',
    supertype: 'Pokémon',
    isEvolved: true,
  },
  {
    label: 'Reverse Holo',
    cardId: 'me02-033',
    imageUrl: 'https://assets.tcgdex.net/fr/me/me02/033/high.png',
    rarity: 'Rare',
    finish: 'reverse_holo',
    supertype: 'Pokémon',
    isEvolved: true,
  },
  {
    label: 'CRI Holo Special Energy',
    cardId: 'me04-086',
    imageUrl: 'https://assets.tcgdex.net/fr/me/me04/086/high.png',
    rarity: 'Rare',
    finish: 'holo',
    supertype: 'Énergie',
  },
  {
    label: 'Double Rare / RR',
    cardId: 'me01-003',
    imageUrl: 'https://assets.tcgdex.net/en/me/me01/003/high.png',
    rarity: 'Double Rare',
    finish: 'holo',
    supertype: 'Pokémon',
  },
  {
    label: 'Illustration Rare / IR',
    cardId: 'me01-133',
    imageUrl: 'https://assets.tcgdex.net/en/me/me01/133/high.png',
    rarity: 'Illustration Rare',
    finish: 'holo',
    supertype: 'Pokémon',
  },
  {
    label: 'Ultra Rare / SR',
    cardId: 'me01-155',
    imageUrl: 'https://assets.tcgdex.net/en/me/me01/155/high.png',
    rarity: 'Ultra Rare',
    finish: 'holo',
    supertype: 'Pokémon',
  },
  {
    label: 'ACE SPEC',
    cardId: 'sv08.5-116',
    imageUrl: 'https://assets.tcgdex.net/en/sv/sv08.5/116/high.png',
    rarity: 'ACE SPEC Rare',
    finish: 'holo',
    supertype: 'Dresseur',
  },
  {
    label: 'SIR / SAR',
    cardId: 'me01-177',
    imageUrl: 'https://assets.tcgdex.net/en/me/me01/177/high.png',
    rarity: 'Special Illustration Rare',
    finish: 'holo',
    supertype: 'Pokémon',
  },
  {
    label: 'Hyper Rare / HR',
    cardId: 'sv10-243',
    imageUrl: 'https://assets.tcgdex.net/en/sv/sv10/243/high.png',
    rarity: 'Hyper Rare',
    finish: 'holo',
    supertype: 'Pokémon',
  },
  {
    label: 'Mega Hyper Rare / MHR',
    cardId: 'me01-187',
    imageUrl: 'https://assets.tcgdex.net/en/me/me01/187/high.png',
    rarity: 'Méga Hyper Rare',
    finish: 'holo',
    supertype: 'Pokémon',
  },
  {
    label: 'SWSH Holo Rare',
    cardId: 'swsh12-036',
    imageUrl: 'https://assets.tcgdex.net/en/swsh/swsh12/036/high.png',
    rarity: 'Holo Rare',
    finish: 'holo',
    supertype: 'Pokémon',
  },
  {
    label: 'SWSH Reverse Holo',
    cardId: 'swsh12-002',
    imageUrl: 'https://assets.tcgdex.net/en/swsh/swsh12/002/high.png',
    rarity: 'Uncommon',
    finish: 'reverse_holo',
    supertype: 'Pokémon',
    isEvolved: true,
  },
  {
    label: 'SWSH Holo Trainer',
    cardId: 'swsh12-152',
    imageUrl: 'https://assets.tcgdex.net/en/swsh/swsh12/152/high.png',
    rarity: 'Holo Rare',
    finish: 'holo',
    supertype: 'Trainer',
  },
  {
    label: 'SWSH Pokémon V',
    cardId: 'swsh12-007',
    imageUrl: 'https://assets.tcgdex.net/en/swsh/swsh12/007/high.png',
    rarity: 'Holo Rare V',
    finish: 'holo',
    supertype: 'Pokémon',
  },
  {
    label: 'SWSH Pokémon VSTAR',
    cardId: 'swsh12-008',
    imageUrl: 'https://assets.tcgdex.net/en/swsh/swsh12/008/high.png',
    rarity: 'Holo Rare VSTAR',
    finish: 'holo',
    supertype: 'Pokémon',
  },
  {
    label: 'SWSH Amazing Rare',
    cardId: 'swsh4-102',
    imageUrl: 'https://assets.tcgdex.net/en/swsh/swsh4/102/high.png',
    rarity: 'Amazing Rare',
    finish: 'holo',
    supertype: 'Pokémon',
  },
  {
    label: 'SWSH Radiant Rare',
    cardId: 'swsh12-016',
    imageUrl: 'https://assets.tcgdex.net/en/swsh/swsh12/016/high.png',
    rarity: 'Radiant Rare',
    finish: 'holo',
    supertype: 'Pokémon',
  },
  {
    label: 'TG VMAX hybrid',
    cardId: 'swsh9.5tg-TG15',
    imageUrl: 'https://assets.tcgdex.net/en/swsh/swsh9/TG15/high.png',
    rarity: 'Ultra Rare',
    finish: 'holo',
    supertype: 'Pokémon',
  },
  {
    label: 'GG VSTAR / SIR',
    cardId: 'swsh12.5gg-GG35',
    imageUrl: 'https://assets.tcgdex.net/en/swsh/swsh12.5/GG35/high.png',
    rarity: 'Ultra Rare',
    finish: 'holo',
    supertype: 'Pokémon',
  },
  {
    label: 'GG Gold / HR',
    cardId: 'swsh12.5gg-GG67',
    imageUrl: 'https://assets.tcgdex.net/en/swsh/swsh12.5/GG67/high.png',
    rarity: 'Secret Rare',
    finish: 'holo',
    supertype: 'Pokémon',
  },
] as const

const reverseCalibrationSamples: Readonly<Record<ReverseCalibrationLayout, FoilSample>> = {
  pokemon: {
    label: 'Pokémon frame',
    cardId: 'me02-033',
    imageUrl: 'https://assets.tcgdex.net/fr/me/me02/033/high.png',
    rarity: 'Rare',
    finish: 'reverse_holo',
    supertype: 'Pokémon',
    isEvolved: true,
  },
  trainer: {
    label: 'Trainer frame',
    cardId: 'me02-085',
    imageUrl: 'https://assets.tcgdex.net/fr/me/me02/085/high.png',
    rarity: 'Uncommon',
    finish: 'reverse_holo',
    supertype: 'Dresseur',
  },
  energy: {
    label: 'Special Energy frame',
    cardId: 'me04-086',
    imageUrl: 'https://assets.tcgdex.net/fr/me/me04/086/high.png',
    rarity: 'Rare',
    finish: 'holo',
    supertype: 'Énergie',
  },
}

const swshCalibrationSamples: Readonly<Partial<Record<ReverseCalibrationLayout, FoilSample>>> = {
  pokemon: {
    label: 'SWSH Pokémon frame',
    cardId: 'swsh12-002',
    imageUrl: 'https://assets.tcgdex.net/en/swsh/swsh12/002/high.png',
    rarity: 'Uncommon',
    finish: 'reverse_holo',
    supertype: 'Pokémon',
    isEvolved: true,
  },
  trainer: {
    label: 'SWSH Trainer frame',
    cardId: 'swsh12-152',
    imageUrl: 'https://assets.tcgdex.net/en/swsh/swsh12/152/high.png',
    rarity: 'Uncommon',
    finish: 'reverse_holo',
    supertype: 'Trainer',
  },
}

const reverseCalibrationLayouts: readonly ReverseCalibrationLayout[] = [
  'pokemon',
  'trainer',
  'energy',
]
const swshCalibrationLayouts: readonly ReverseCalibrationLayout[] = ['pokemon', 'trainer']

const defaultReverseMaskSettings: Readonly<Record<ReverseCalibrationLayout, ReverseMaskSettings>> =
  {
    pokemon: {
      artwork: rectToSettings(FOIL_LAYOUT_MASKS.pokemon.artwork),
      stock: rectToSettings(FOIL_LAYOUT_MASKS.pokemon.stock),
      evolution: circleToSettings(EVOLUTION_BUBBLE_MASK),
    },
    trainer: {
      artwork: rectToSettings(FOIL_LAYOUT_MASKS.trainer.artwork),
      stock: rectToSettings(FOIL_LAYOUT_MASKS.trainer.stock),
    },
    energy: {
      artwork: rectToSettings(FOIL_LAYOUT_MASKS.energy.artwork),
      stock: rectToSettings(FOIL_LAYOUT_MASKS.energy.stock),
    },
  }

const defaultSwshMaskSettings: Readonly<Record<ReverseCalibrationLayout, ReverseMaskSettings>> = {
  pokemon: {
    artwork: rectToSettings(SWSH_FOIL_LAYOUT_MASKS.pokemon.artwork),
    stock: rectToSettings(SWSH_FOIL_LAYOUT_MASKS.pokemon.stock),
    evolution: circleToSettings(SWSH_EVOLUTION_BUBBLE_MASK),
  },
  trainer: {
    artwork: rectToSettings(SWSH_FOIL_LAYOUT_MASKS.trainer.artwork),
    stock: rectToSettings(SWSH_FOIL_LAYOUT_MASKS.trainer.stock),
  },
  energy: {
    artwork: rectToSettings(SWSH_FOIL_LAYOUT_MASKS.energy.artwork),
    stock: rectToSettings(SWSH_FOIL_LAYOUT_MASKS.energy.stock),
  },
}

const searchParams = new URLSearchParams(window.location.search)
const requestedSample = Number(searchParams.get('sample') ?? 1)
const initialSampleIndex = Number.isInteger(requestedSample)
  ? Math.min(samples.length - 1, Math.max(0, requestedSample))
  : 1
const initialSample = samples[initialSampleIndex]
const initialProfile = resolveFoilProfile(initialSample.finish, initialSample.rarity, initialSample)

export function FoilLab() {
  const [selectedIndex, setSelectedIndex] = useState(initialSampleIndex)
  const [webGlReady, setWebGlReady] = useState(false)
  const [settings, setSettings] = useState<LabSettings>({
    tiltX: readNumericSetting('tiltX', 0),
    tiltY: readNumericSetting('tiltY', 0),
    lightX: readNumericSetting('lightX', 0),
    lightY: readNumericSetting('lightY', 0),
    intensity: readNumericSetting('intensity', initialProfile.intensity),
    glare: readNumericSetting('glare', initialProfile.glare),
    textureScale: readNumericSetting('textureScale', initialProfile.textureScale),
    motion: searchParams.get('motion') !== 'false',
  })
  const [reverseMaskSettings, setReverseMaskSettings] = useState<
    Record<ReverseCalibrationLayout, ReverseMaskSettings>
  >(() => cloneMaskSettings(defaultReverseMaskSettings))
  const [swshMaskSettings, setSwshMaskSettings] = useState<
    Record<ReverseCalibrationLayout, ReverseMaskSettings>
  >(() => cloneMaskSettings(defaultSwshMaskSettings))
  const sample = samples[selectedIndex]
  const reverseMasks: Record<ReverseCalibrationLayout, FoilMask> = {
    pokemon: settingsToMask('pokemon', reverseMaskSettings.pokemon),
    trainer: settingsToMask('trainer', reverseMaskSettings.trainer),
    energy: settingsToMask('energy', reverseMaskSettings.energy),
  }
  const swshMasks: Record<ReverseCalibrationLayout, FoilMask> = {
    pokemon: settingsToMask('pokemon', swshMaskSettings.pokemon),
    trainer: settingsToMask('trainer', swshMaskSettings.trainer),
    energy: settingsToMask('energy', swshMaskSettings.energy),
  }
  const sampleLayout = resolveCardLayout(sample.supertype)
  const sampleProfile = resolveFoilProfile(sample.finish, sample.rarity, sample)
  const isSwshSample = isSwordShieldCardId(sample.cardId)
  const usesFrameMask =
    sampleProfile.name === 'rare-holo' ||
    sampleProfile.name === 'swsh-holo-rare' ||
    sampleProfile.name === 'reverse-holo'
  const activeCalibrationMask = usesFrameMask
    ? isSwshSample
      ? swshMasks[sampleLayout]
      : reverseMasks[sampleLayout]
    : undefined
  const rotationX = useMotionValue(toRadians(settings.tiltX))
  const rotationY = useMotionValue(toRadians(settings.tiltY))

  useEffect(() => {
    rotationX.set(toRadians(settings.tiltX))
    rotationY.set(toRadians(settings.tiltY))
  }, [rotationX, rotationY, settings.tiltX, settings.tiltY])

  const tuning: FoilTuningOverrides = {
    lightX: settings.lightX,
    lightY: settings.lightY,
    intensity: settings.intensity,
    glare: settings.glare,
    textureScale: settings.textureScale,
    motion: settings.motion,
  }

  const selectSample = (index: number) => {
    const nextSample = samples[index]
    const profile = resolveFoilProfile(nextSample.finish, nextSample.rarity, nextSample)
    setSelectedIndex(index)
    setWebGlReady(false)
    setSettings((current) => ({
      ...current,
      intensity: profile.intensity,
      glare: profile.glare,
      textureScale: profile.textureScale,
    }))
  }

  const updateReverseRect = (
    layout: ReverseCalibrationLayout,
    region: 'artwork' | 'stock',
    property: keyof MaskRectSettings,
    value: number,
  ) => {
    updateMaskRect(setReverseMaskSettings, layout, region, property, value)
  }

  const updateEvolutionMask = (property: keyof CircleMaskSettings, value: number) => {
    updateEvolutionMaskSettings(setReverseMaskSettings, property, value)
  }

  const resetReverseMasks = () => {
    setReverseMaskSettings(cloneMaskSettings(defaultReverseMaskSettings))
  }

  const updateSwshRect = (
    layout: ReverseCalibrationLayout,
    region: 'artwork' | 'stock',
    property: keyof MaskRectSettings,
    value: number,
  ) => {
    updateMaskRect(setSwshMaskSettings, layout, region, property, value)
  }

  const updateSwshEvolutionMask = (property: keyof CircleMaskSettings, value: number) => {
    updateEvolutionMaskSettings(setSwshMaskSettings, property, value)
  }

  const resetSwshMasks = () => {
    setSwshMaskSettings(cloneMaskSettings(defaultSwshMaskSettings))
  }

  const updateTiltFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const horizontal = clamp(((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * 2 - 1)
    const vertical = clamp(((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * 2 - 1)

    setSettings((current) => ({
      ...current,
      tiltX: Math.round(-vertical * 26),
      tiltY: Math.round(horizontal * 30),
    }))
  }

  const handleTiltPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    updateTiltFromPointer(event)
  }

  const handleTiltPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      updateTiltFromPointer(event)
    }
  }

  const handleTiltPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <main className="foil-lab-shell" data-foil-lab-ready={webGlReady ? 'true' : 'false'}>
      <header className="foil-lab-header">
        <div>
          <p className="foil-lab-kicker">Booster Break / optical materials</p>
          <h1>Foil response bench</h1>
        </div>
        <div className="foil-lab-status" data-ready={webGlReady ? 'true' : 'false'}>
          <span />
          {webGlReady ? 'WebGL ready' : 'Loading WebGL textures'}
        </div>
      </header>

      <nav className="foil-lab-samples" aria-label="Foil samples">
        {samples.map((entry, index) => (
          <button
            key={`${entry.cardId}-${entry.finish}`}
            type="button"
            aria-pressed={selectedIndex === index}
            onClick={() => selectSample(index)}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            {entry.label}
          </button>
        ))}
      </nav>

      <section className="foil-lab-workspace">
        <aside className="foil-lab-controls">
          <div className="foil-lab-sample-meta">
            <p>{sample.cardId}</p>
            <h2>{sample.label}</h2>
            <span>{sample.rarity}</span>
          </div>

          <RangeControl
            label="Tilt X"
            value={settings.tiltX}
            minimum={-30}
            maximum={30}
            step={1}
            suffix="°"
            onChange={(tiltX) => setSettings((current) => ({ ...current, tiltX }))}
          />
          <RangeControl
            label="Tilt Y"
            value={settings.tiltY}
            minimum={-30}
            maximum={30}
            step={1}
            suffix="°"
            onChange={(tiltY) => setSettings((current) => ({ ...current, tiltY }))}
          />
          <RangeControl
            label="Light X"
            value={settings.lightX}
            minimum={-1}
            maximum={1}
            step={0.05}
            onChange={(lightX) => setSettings((current) => ({ ...current, lightX }))}
          />
          <RangeControl
            label="Light Y"
            value={settings.lightY}
            minimum={-1}
            maximum={1}
            step={0.05}
            onChange={(lightY) => setSettings((current) => ({ ...current, lightY }))}
          />
          <RangeControl
            label="Intensity"
            value={settings.intensity}
            minimum={0}
            maximum={1}
            step={0.01}
            onChange={(intensity) => setSettings((current) => ({ ...current, intensity }))}
          />
          <RangeControl
            label="Glare"
            value={settings.glare}
            minimum={0}
            maximum={1}
            step={0.01}
            onChange={(glare) => setSettings((current) => ({ ...current, glare }))}
          />
          <RangeControl
            label="Texture scale"
            value={settings.textureScale}
            minimum={0.25}
            maximum={2}
            step={0.05}
            suffix="×"
            onChange={(textureScale) => setSettings((current) => ({ ...current, textureScale }))}
          />

          <label className="foil-lab-toggle">
            <span>
              <strong>Idle motion</strong>
              <small>Slow material drift</small>
            </span>
            <input
              type="checkbox"
              checked={settings.motion}
              onChange={(event) =>
                setSettings((current) => ({ ...current, motion: event.target.checked }))
              }
            />
          </label>
        </aside>

        <div className="foil-lab-comparison" key={`${sample.cardId}-${sample.finish}`}>
          <RendererPanel label="CSS material" detail="Static / collection">
            <FoilCardImage
              src={sample.imageUrl}
              alt={`${sample.label} CSS rendering`}
              cardId={sample.cardId}
              finish={sample.finish}
              rarity={sample.rarity}
              supertype={sample.supertype}
              isEvolved={sample.isEvolved}
              foilTuning={tuning}
              foilMask={activeCalibrationMask}
              className="size-full rounded-[inherit] object-contain"
              containerClassName="foil-lab-card"
            />
          </RendererPanel>

          <RendererPanel
            label="WebGL material"
            detail="Interactive / dialog"
            onPointerDown={handleTiltPointerDown}
            onPointerMove={handleTiltPointerMove}
            onPointerEnd={handleTiltPointerEnd}
            tiltable
          >
            <WebGlCardViewer
              frontImageUrl={sample.imageUrl}
              alt={`${sample.label} WebGL rendering`}
              cardId={sample.cardId}
              finish={sample.finish}
              rarity={sample.rarity}
              supertype={sample.supertype}
              isEvolved={sample.isEvolved}
              foilTuning={tuning}
              foilMask={activeCalibrationMask}
              rotationX={rotationX}
              rotationY={rotationY}
              interactive={false}
              cameraDistance={5.15}
              rotationLimit={0.6}
              className="foil-lab-card max-h-none"
              onReady={() => setWebGlReady(true)}
            />
          </RendererPanel>
        </div>
      </section>

      {usesFrameMask && !isSwshSample ? (
        <ReverseMaskCalibration
          kicker="Scarlet & Violet / mask calibration"
          title="Current-frame foil boundaries"
          description="Tune each printed frame, stock edge, and evolution bubble independently. The guide uses solid regions so optical movement cannot hide a boundary error."
          layouts={reverseCalibrationLayouts}
          samples={reverseCalibrationSamples}
          settings={reverseMaskSettings}
          masks={reverseMasks}
          tuning={tuning}
          onRectChange={updateReverseRect}
          onEvolutionChange={updateEvolutionMask}
          onReset={resetReverseMasks}
        />
      ) : null}
      {isSwshSample ? (
        <ReverseMaskCalibration
          kicker="Sword & Shield / mask calibration"
          title="SWSH foil boundaries"
          description="These controls are isolated from the current-frame masks. They drive both SWSH Reverse Holo coverage and the illustration-only Holo Rare window."
          layouts={swshCalibrationLayouts}
          samples={swshCalibrationSamples}
          settings={swshMaskSettings}
          masks={swshMasks}
          tuning={tuning}
          onRectChange={updateSwshRect}
          onEvolutionChange={updateSwshEvolutionMask}
          onReset={resetSwshMasks}
        />
      ) : null}
    </main>
  )
}

function ReverseMaskCalibration({
  kicker,
  title,
  description,
  layouts,
  samples: calibrationSamples,
  settings,
  masks,
  tuning,
  onRectChange,
  onEvolutionChange,
  onReset,
}: {
  kicker: string
  title: string
  description: string
  layouts: readonly ReverseCalibrationLayout[]
  samples: Readonly<Partial<Record<ReverseCalibrationLayout, FoilSample>>>
  settings: Record<ReverseCalibrationLayout, ReverseMaskSettings>
  masks: Record<ReverseCalibrationLayout, FoilMask>
  tuning: FoilTuningOverrides
  onRectChange: (
    layout: ReverseCalibrationLayout,
    region: 'artwork' | 'stock',
    property: keyof MaskRectSettings,
    value: number,
  ) => void
  onEvolutionChange: (property: keyof CircleMaskSettings, value: number) => void
  onReset: () => void
}) {
  return (
    <section className="foil-reverse-calibration">
      <header className="foil-reverse-calibration-header">
        <div>
          <p className="foil-lab-kicker">{kicker}</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <button type="button" onClick={onReset}>
          Reset masks
        </button>
      </header>

      <div className="foil-reverse-calibration-legend" aria-label="Boundary legend">
        <span data-region="foil">Foil stock</span>
        <span data-region="artwork">Non-foil artwork</span>
        <span data-region="evolution">Non-foil evolution bubble</span>
        <span data-region="border">Non-foil outer border</span>
      </div>

      <div className="foil-reverse-calibration-grid">
        {layouts.map((layout) => {
          const sample = calibrationSamples[layout]
          if (!sample) return null

          const values = settings[layout]
          const mask = masks[layout]

          return (
            <article key={layout} className="foil-reverse-mask-editor">
              <header>
                <div>
                  <p>{sample.cardId}</p>
                  <h3>{sample.label}</h3>
                </div>
                <div className="foil-reverse-mask-values">
                  <code>art {formatMaskRect(mask.artwork)}</code>
                  <code>stock {formatMaskRect(mask.stock)}</code>
                  {mask.evolution ? <code>bubble {formatCircle(mask.evolution)}</code> : null}
                </div>
              </header>

              <div className="foil-reverse-mask-control-groups">
                <div>
                  <h4>Illustration window</h4>
                  <MaskRectControls
                    layout={layout}
                    region="artwork"
                    values={values.artwork}
                    onChange={onRectChange}
                  />
                </div>
                <div>
                  <h4>Outer stock / border limits</h4>
                  <MaskRectControls
                    layout={layout}
                    region="stock"
                    values={values.stock}
                    onChange={onRectChange}
                  />
                </div>
                {layout === 'pokemon' && values.evolution ? (
                  <div className="foil-reverse-evolution-controls">
                    <h4>Evolution bubble exclusion</h4>
                    <div className="foil-reverse-mask-controls">
                      <RangeControl
                        label="Center X"
                        value={values.evolution.x}
                        minimum={values.evolution.size / 2}
                        maximum={100 - values.evolution.size / 2}
                        step={0.1}
                        suffix="%"
                        onChange={(value) => onEvolutionChange('x', value)}
                      />
                      <RangeControl
                        label="Center Y"
                        value={values.evolution.y}
                        minimum={(values.evolution.size / 2) * (63 / 88)}
                        maximum={100 - (values.evolution.size / 2) * (63 / 88)}
                        step={0.1}
                        suffix="%"
                        onChange={(value) => onEvolutionChange('y', value)}
                      />
                      <RangeControl
                        label="Diameter"
                        value={values.evolution.size}
                        minimum={2}
                        maximum={30}
                        step={0.1}
                        suffix="%"
                        onChange={(value) => onEvolutionChange('size', value)}
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="foil-reverse-mask-previews">
                <figure>
                  <figcaption>Solid boundary map</figcaption>
                  <ReverseMaskGuide sample={sample} mask={mask} />
                </figure>
                <figure>
                  <figcaption>Live WebGL result</figcaption>
                  <WebGlCardViewer
                    frontImageUrl={sample.imageUrl}
                    alt={`${sample.label} reverse holo calibration`}
                    cardId={sample.cardId}
                    finish="reverse_holo"
                    rarity={sample.rarity}
                    supertype={sample.supertype}
                    isEvolved={sample.isEvolved}
                    foilTuning={tuning}
                    foilMask={mask}
                    interactive={false}
                    cameraDistance={5.15}
                    className="foil-reverse-calibration-card max-h-none"
                  />
                </figure>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function MaskRectControls({
  layout,
  region,
  values,
  onChange,
}: {
  layout: ReverseCalibrationLayout
  region: 'artwork' | 'stock'
  values: MaskRectSettings
  onChange: (
    layout: ReverseCalibrationLayout,
    region: 'artwork' | 'stock',
    property: keyof MaskRectSettings,
    value: number,
  ) => void
}) {
  return (
    <div className="foil-reverse-mask-controls">
      <RangeControl
        label="Position X"
        value={values.x}
        minimum={0}
        maximum={100 - values.width}
        step={0.1}
        suffix="%"
        onChange={(value) => onChange(layout, region, 'x', value)}
      />
      <RangeControl
        label="Position Y"
        value={values.y}
        minimum={0}
        maximum={100 - values.height}
        step={0.1}
        suffix="%"
        onChange={(value) => onChange(layout, region, 'y', value)}
      />
      <RangeControl
        label="Width"
        value={values.width}
        minimum={40}
        maximum={100 - values.x}
        step={0.1}
        suffix="%"
        onChange={(value) => onChange(layout, region, 'width', value)}
      />
      <RangeControl
        label="Height"
        value={values.height}
        minimum={15}
        maximum={100 - values.y}
        step={0.1}
        suffix="%"
        onChange={(value) => onChange(layout, region, 'height', value)}
      />
    </div>
  )
}

function ReverseMaskGuide({ sample, mask }: { sample: FoilSample; mask: FoilMask }) {
  const activeRegions = getMainFoilRegions(FOIL_PROFILES['reverse-holo'], mask)

  return (
    <div className="foil-reverse-mask-guide">
      <img src={sample.imageUrl} alt={`${sample.label} boundary guide`} />
      {activeRegions.map((region, index) => (
        <span
          key={`${region.join('-')}-${index}`}
          className="foil-reverse-mask-guide-active"
          style={rectToAbsoluteStyle(region)}
        />
      ))}
      <span className="foil-reverse-mask-guide-stock" style={rectToAbsoluteStyle(mask.stock)} />
      <span className="foil-reverse-mask-guide-artwork" style={rectToAbsoluteStyle(mask.artwork)}>
        <b>NO FOIL</b>
      </span>
      {mask.evolution ? (
        <span
          className="foil-reverse-mask-guide-evolution"
          style={circleToAbsoluteStyle(mask.evolution)}
        >
          <b>NO FOIL</b>
        </span>
      ) : null}
    </div>
  )
}

function RangeControl({
  label,
  value,
  minimum,
  maximum,
  step,
  suffix = '',
  onChange,
}: {
  label: string
  value: number
  minimum: number
  maximum: number
  step: number
  suffix?: string
  onChange: (value: number) => void
}) {
  return (
    <label className="foil-lab-range">
      <span>
        {label}
        <output>
          {value.toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0)}
          {suffix}
        </output>
      </span>
      <input
        type="range"
        min={minimum}
        max={maximum}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.valueAsNumber)}
      />
    </label>
  )
}

function RendererPanel({
  label,
  detail,
  children,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
  tiltable = false,
}: {
  label: string
  detail: string
  children: ReactNode
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerMove?: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerEnd?: (event: ReactPointerEvent<HTMLDivElement>) => void
  tiltable?: boolean
}) {
  return (
    <article className="foil-lab-renderer">
      <header>
        <h3>{label}</h3>
        <span>{detail}</span>
      </header>
      <div
        className="foil-lab-stage"
        data-tiltable={tiltable ? 'true' : 'false'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        {tiltable ? <span className="foil-lab-drag-hint">Drag to tilt WebGL card</span> : null}
        {children}
      </div>
    </article>
  )
}

function cloneMaskSettings(
  settings: Readonly<Record<ReverseCalibrationLayout, ReverseMaskSettings>>,
): Record<ReverseCalibrationLayout, ReverseMaskSettings> {
  return {
    pokemon: {
      artwork: { ...settings.pokemon.artwork },
      stock: { ...settings.pokemon.stock },
      ...(settings.pokemon.evolution ? { evolution: { ...settings.pokemon.evolution } } : {}),
    },
    trainer: {
      artwork: { ...settings.trainer.artwork },
      stock: { ...settings.trainer.stock },
    },
    energy: {
      artwork: { ...settings.energy.artwork },
      stock: { ...settings.energy.stock },
    },
  }
}

function updateMaskRect(
  setSettings: Dispatch<SetStateAction<Record<ReverseCalibrationLayout, ReverseMaskSettings>>>,
  layout: ReverseCalibrationLayout,
  region: 'artwork' | 'stock',
  property: keyof MaskRectSettings,
  value: number,
): void {
  setSettings((current) => {
    const next = { ...current[layout][region], [property]: value }
    next.x = clampRange(next.x, 0, 100 - next.width)
    next.y = clampRange(next.y, 0, 100 - next.height)
    next.width = clampRange(next.width, 10, 100 - next.x)
    next.height = clampRange(next.height, 10, 100 - next.y)

    return { ...current, [layout]: { ...current[layout], [region]: next } }
  })
}

function updateEvolutionMaskSettings(
  setSettings: Dispatch<SetStateAction<Record<ReverseCalibrationLayout, ReverseMaskSettings>>>,
  property: keyof CircleMaskSettings,
  value: number,
): void {
  setSettings((current) => {
    const evolution = current.pokemon.evolution ?? { x: 10.5, y: 16, size: 16.4 }
    const next = { ...evolution, [property]: value }
    const radius = next.size / 2
    next.x = clampRange(next.x, radius, 100 - radius)
    next.y = clampRange(next.y, radius * (63 / 88), 100 - radius * (63 / 88))
    next.size = clampRange(next.size, 2, 30)

    return {
      ...current,
      pokemon: { ...current.pokemon, evolution: next },
    }
  })
}

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180

const clamp = (value: number): number => Math.min(1, Math.max(-1, value))

const clampRange = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value))

function rectToSettings([left, top, right, bottom]: NormalizedRect): MaskRectSettings {
  return {
    x: left * 100,
    y: top * 100,
    width: (right - left) * 100,
    height: (bottom - top) * 100,
  }
}

function settingsToMask(layout: ReverseCalibrationLayout, settings: ReverseMaskSettings): FoilMask {
  return {
    artwork: settingsToRect(settings.artwork),
    stock: settingsToRect(settings.stock),
    ...(layout === 'pokemon' && settings.evolution
      ? { evolution: settingsToCircle(settings.evolution) }
      : {}),
  }
}

const settingsToRect = (settings: MaskRectSettings): NormalizedRect => [
  settings.x / 100,
  settings.y / 100,
  (settings.x + settings.width) / 100,
  (settings.y + settings.height) / 100,
]

function circleToSettings([centerX, centerY, radius]: NormalizedCircle): CircleMaskSettings {
  return { x: centerX * 100, y: centerY * 100, size: radius * 200 }
}

const settingsToCircle = (settings: CircleMaskSettings): NormalizedCircle => [
  settings.x / 100,
  settings.y / 100,
  settings.size / 200,
]

const rectToAbsoluteStyle = ([left, top, right, bottom]: NormalizedRect): CSSProperties => ({
  left: `${left * 100}%`,
  top: `${top * 100}%`,
  width: `${(right - left) * 100}%`,
  height: `${(bottom - top) * 100}%`,
})

const circleToAbsoluteStyle = ([centerX, centerY, radius]: NormalizedCircle): CSSProperties => ({
  left: `${(centerX - radius) * 100}%`,
  top: `${(centerY - radius * (63 / 88)) * 100}%`,
  width: `${radius * 200}%`,
  height: `${radius * 2 * (63 / 88) * 100}%`,
})

const formatMaskRect = (rect: NormalizedRect): string =>
  `[${rect.map((value) => value.toFixed(3)).join(', ')}]`

const formatCircle = (circle: NormalizedCircle): string =>
  `[${circle.map((value) => value.toFixed(3)).join(', ')}]`

function readNumericSetting(name: string, fallback: number): number {
  const rawValue = searchParams.get(name)
  if (rawValue === null) return fallback

  const value = Number(rawValue)
  return Number.isFinite(value) ? value : fallback
}
