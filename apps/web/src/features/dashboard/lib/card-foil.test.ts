import { describe, expect, test } from 'bun:test'

import {
  FOIL_LAYOUT_MASKS,
  FOIL_PROFILES,
  EVOLUTION_BUBBLE_MASK,
  getBorderFoilRegions,
  getCardFoilSeed,
  getMainFoilRegions,
  resolveCardLayout,
  resolveFoilAssetUrl,
  resolveFoilMask,
  resolveFoilProfile,
  toCssCircleClipPath,
  webGlUvToMaskUv,
} from './card-foil'

describe('foil profile resolution', () => {
  test('finish takes precedence over rarity', () => {
    expect(resolveFoilProfile('normal', 'Méga Hyper Rare').name).toBe('none')
    expect(resolveFoilProfile(undefined, 'Double Rare').name).toBe('none')
    expect(resolveFoilProfile('reverse_holo', 'Méga Hyper Rare').name).toBe('reverse-holo')
  })

  test.each([
    ['Rare', 'rare-holo'],
    ['unknown future rarity', 'rare-holo'],
    ['Double Rare', 'double-rare'],
    ['RR', 'double-rare'],
    ['Illustration Rare', 'illustration-rare'],
    ['Rare illustration', 'illustration-rare'],
    ['IR', 'illustration-rare'],
    ['Ultra Rare', 'ultra-rare'],
    ['SR', 'ultra-rare'],
    ['ACE SPEC Rare', 'ace-spec'],
    ['HIGH-TECG rare', 'ace-spec'],
    ['Illustration spéciale rare', 'special-illustration'],
    ['Rare illustration spéciale', 'special-illustration'],
    ['Special Illustration Rare', 'special-illustration'],
    ['SIR', 'special-illustration'],
    ['SAR', 'special-illustration'],
    ['Hyper Rare', 'special-illustration'],
    ['HR', 'special-illustration'],
    ['Méga Hyper Rare', 'mega-hyper-rare'],
    ['MHR', 'mega-hyper-rare'],
  ] as const)('maps %s to %s', (rarity, expected) => {
    expect(resolveFoilProfile('holo', rarity).name).toBe(expected)
  })

  test('SIR and HR resolve to exactly the same recipe', () => {
    expect(resolveFoilProfile('holo', 'Hyper Rare')).toBe(
      resolveFoilProfile('holo', 'Special Illustration Rare'),
    )
    expect(FOIL_PROFILES['ultra-rare'].textureScale).toBe(1.2)
    expect(FOIL_PROFILES['special-illustration'].textureScale).toBe(1.2)
  })

  test('single-purpose recipes do not gain unrelated layers', () => {
    const illustrationRare = FOIL_PROFILES['illustration-rare']
    const aceSpec = FOIL_PROFILES['ace-spec']

    for (const profile of [illustrationRare, aceSpec]) {
      expect(profile.hasEtching).toBeFalse()
      expect(profile.hasGlitter).toBeFalse()
      expect(profile.hasStars).toBeFalse()
      expect(profile.hasMetal).toBeFalse()
      expect(profile.bandAngle).toBe(128)
    }

    expect(illustrationRare.bandFrequency).toBe(7)
    expect(illustrationRare.motionSpeed).toBe(0.022)
  })

  test('assigns only the texture roles required by each material', () => {
    expect(FOIL_PROFILES.none.textureRoles).toEqual([])
    expect(FOIL_PROFILES['rare-holo'].textureRoles).toEqual(['noise-base'])
    expect(FOIL_PROFILES['rare-holo'].hasMetal).toBeFalse()
    expect(FOIL_PROFILES['double-rare'].uniform).toBe(3)
    expect(FOIL_PROFILES['double-rare'].textureRoles).toEqual(['birthday-a', 'birthday-b'])
    expect(FOIL_PROFILES['illustration-rare'].textureRoles).toEqual(['noise-top'])
    expect(FOIL_PROFILES['ultra-rare'].textureRoles).toEqual(['noise-top', 'illusion'])
    expect(FOIL_PROFILES['ultra-rare'].uniform).toBe(5)
    expect(FOIL_PROFILES['ace-spec'].textureRoles).toEqual(['noise-top'])
    expect(FOIL_PROFILES['special-illustration'].textureRoles).toEqual([
      'noise-base',
      'illusion',
      'glitter',
    ])
    expect(FOIL_PROFILES['special-illustration'].uniform).toBe(7)
    expect(FOIL_PROFILES['mega-hyper-rare'].textureRoles).toEqual(['grain'])
  })
})

describe('foil masks', () => {
  test.each([
    ['Pokémon', 'pokemon'],
    ['Pokemon', 'pokemon'],
    ['Trainer', 'trainer'],
    ['Dresseur', 'trainer'],
    ['Energy', 'energy'],
    ['Énergie', 'energy'],
  ] as const)('maps %s to the %s layout', (supertype, expected) => {
    expect(resolveCardLayout(supertype)).toBe(expected)
  })

  test('rare holo only uses the artwork and outer border', () => {
    const mask = FOIL_LAYOUT_MASKS.pokemon
    const profile = FOIL_PROFILES['rare-holo']

    expect(getMainFoilRegions(profile, mask)).toEqual([mask.artwork])
    expect(getBorderFoilRegions(profile, mask)).toHaveLength(4)
  })

  test('reverse holo divides stock around the artwork without entering it', () => {
    const mask = FOIL_LAYOUT_MASKS.trainer
    const profile = FOIL_PROFILES['reverse-holo']
    const regions = getMainFoilRegions(profile, mask)

    expect(regions).toHaveLength(4)
    expect(getBorderFoilRegions(profile, mask)).toEqual([])
    for (const [left, top, right, bottom] of regions) {
      const [artLeft, artTop, artRight, artBottom] = mask.artwork
      const overlapsArtwork =
        left < artRight && right > artLeft && top < artBottom && bottom > artTop
      expect(overlapsArtwork).toBeFalse()
    }
  })

  test('shares calibrated Pokemon and Trainer frames across classic holo profiles', () => {
    expect(FOIL_LAYOUT_MASKS.pokemon).toEqual({
      artwork: [0.08, 0.092, 0.927, 0.473],
      stock: [0.04, 0.027, 0.961, 0.973],
    })
    expect(FOIL_LAYOUT_MASKS.trainer).toEqual({
      artwork: [0.075, 0.139, 0.925, 0.519],
      stock: [0.038, 0.07, 0.958, 0.97],
    })
    expect(resolveFoilMask('Pokémon', 'reverse-holo')).toBe(FOIL_LAYOUT_MASKS.pokemon)
    expect(resolveFoilMask('Dresseur', 'reverse-holo')).toBe(FOIL_LAYOUT_MASKS.trainer)
    expect(resolveFoilMask('Pokémon', 'rare-holo')).toBe(FOIL_LAYOUT_MASKS.pokemon)
  })

  test('adds a physically round evolution exclusion only to evolved classic holo Pokemon', () => {
    expect(EVOLUTION_BUBBLE_MASK).toEqual([0.111, 0.131, 0.092])
    expect(resolveFoilMask('Pokémon', 'rare-holo', true).evolution).toBe(EVOLUTION_BUBBLE_MASK)
    expect(resolveFoilMask('Pokémon', 'reverse-holo', true).evolution).toBe(EVOLUTION_BUBBLE_MASK)
    expect(resolveFoilMask('Pokémon', 'reverse-holo', false).evolution).toBeUndefined()
    expect(resolveFoilMask('Dresseur', 'reverse-holo', true).evolution).toBeUndefined()
    expect(resolveFoilMask('Pokémon', 'illustration-rare', true).evolution).toBeUndefined()
    expect(toCssCircleClipPath(EVOLUTION_BUBBLE_MASK)).toContain('ellipse(')
  })

  test('converts bottom-origin WebGL UVs to the CSS mask orientation', () => {
    expect(webGlUvToMaskUv(0, 0)).toEqual([0, 1])
    expect(webGlUvToMaskUv(1, 1)).toEqual([1, 0])
  })
})

describe('foil variation and assets', () => {
  test('uses stable per-card variation', () => {
    expect(getCardFoilSeed('sv10-034')).toBe(getCardFoilSeed('sv10-034'))
    expect(getCardFoilSeed('sv10-034')).not.toBe(getCardFoilSeed('me01-003'))
  })

  test('prefixes runtime texture paths with the configured base URL', () => {
    expect(resolveFoilAssetUrl('illusion', '/Booster-Break/')).toBe(
      '/Booster-Break/foil-textures/illusion.png',
    )
    expect(resolveFoilAssetUrl('metal', '/nested')).toBe('/nested/foil-textures/metal.png')
    expect(resolveFoilAssetUrl('glitter', '/nested')).toBe('/nested/foil-textures/151/iri-8.webp')
  })
})
