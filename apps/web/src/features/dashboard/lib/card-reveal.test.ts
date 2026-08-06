import { describe, expect, test } from 'bun:test'

import { createRevealParticles, resolveCardRevealTier } from './card-reveal'

const card = (input: {
  id?: string
  number?: string
  rarity?: string
  finish?: 'normal' | 'holo' | 'reverse_holo'
}) => ({
  id: input.id ?? 'sv10-001',
  number: input.number ?? '001',
  rarity: input.rarity,
  finish: input.finish ?? 'normal',
})

describe('card reveal tiers', () => {
  test.each([
    ['standard', card({ rarity: 'Common' })],
    ['holo', card({ rarity: 'Rare', finish: 'holo' })],
    ['holo', card({ rarity: 'Uncommon', finish: 'reverse_holo' })],
    ['rr', card({ rarity: 'Double Rare', finish: 'holo' })],
    ['ir', card({ rarity: 'Illustration Rare', finish: 'holo' })],
    ['sr', card({ rarity: 'Ultra Rare', finish: 'holo' })],
    ['sr', card({ rarity: 'Hyper Rare', finish: 'holo' })],
    ['sr', card({ rarity: 'Secret Rare', finish: 'holo' })],
    ['ace-spec', card({ rarity: 'ACE SPEC Rare', finish: 'holo' })],
    ['ace-spec', card({ rarity: 'HIGH-TECH Rare', finish: 'holo' })],
    ['jackpot', card({ rarity: 'Special Illustration Rare', finish: 'holo' })],
    ['jackpot', card({ rarity: 'SIR', finish: 'holo' })],
    ['jackpot', card({ rarity: 'Méga Hyper Rare', finish: 'holo' })],
  ] as const)('resolves %s cards', (expected, input) => {
    expect(resolveCardRevealTier(input)).toBe(expected)
  })

  test('uses the requested Galarian Gallery split', () => {
    expect(
      resolveCardRevealTier(
        card({ id: 'swsh12.5gg-GG34', number: 'GG34', rarity: 'Rare', finish: 'holo' }),
      ),
    ).toBe('ir')
    expect(
      resolveCardRevealTier(
        card({ id: 'swsh12.5gg-GG35', number: 'GG35', rarity: 'Ultra Rare', finish: 'holo' }),
      ),
    ).toBe('jackpot')
    expect(
      resolveCardRevealTier(
        card({ id: 'swsh12.5gg-GG67', number: 'GG67', rarity: 'Secret Rare', finish: 'holo' }),
      ),
    ).toBe('jackpot')
  })
})

describe('reveal particles', () => {
  test('generates deterministic tier-specific layouts', () => {
    const first = createRevealParticles('me01-003', 'rr')
    const second = createRevealParticles('me01-003', 'rr')

    expect(first).toEqual(second)
    expect(first).toHaveLength(28)
    expect(createRevealParticles('me01-133', 'ir')).toHaveLength(14)
    expect(createRevealParticles('me01-155', 'sr')).toHaveLength(64)
    expect(createRevealParticles('sv08.5-116', 'ace-spec')).toHaveLength(25)
    expect(createRevealParticles('me01-177', 'jackpot')).toHaveLength(48)
    expect(createRevealParticles('me01-004', 'rr')).not.toEqual(first)
  })

  test('keeps particle origins within the card stage', () => {
    for (const particle of createRevealParticles('me01-177', 'jackpot')) {
      expect(particle.left).toBeGreaterThanOrEqual(1)
      expect(particle.left).toBeLessThanOrEqual(99)
      expect(particle.top).toBeGreaterThanOrEqual(1)
      expect(particle.top).toBeLessThanOrEqual(99)
    }
  })

  test('scatters RR particles around every side of the card perimeter', () => {
    const particles = createRevealParticles('me01-003', 'rr')

    expect(
      particles.every(
        (particle) =>
          particle.top <= 18 || particle.left >= 82 || particle.top >= 82 || particle.left <= 18,
      ),
    ).toBeTrue()
    expect(particles.some((particle) => particle.top <= 18)).toBeTrue()
    expect(particles.some((particle) => particle.left >= 82)).toBeTrue()
    expect(particles.some((particle) => particle.top >= 82)).toBeTrue()
    expect(particles.some((particle) => particle.left <= 18)).toBeTrue()
  })
})
