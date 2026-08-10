import { describe, expect, test } from 'bun:test'

import { getCardIsEvolved, resolveCardIsEvolved } from '../../src/pokemon/pokemon-mappers'

describe('Pokemon evolution metadata', () => {
  test('recognizes English and French evolved stages', () => {
    expect(resolveCardIsEvolved('Stage1', undefined)).toBeTrue()
    expect(resolveCardIsEvolved('Stage 2', undefined)).toBeTrue()
    expect(resolveCardIsEvolved('Niveau 1', undefined)).toBeTrue()
    expect(resolveCardIsEvolved('Niveau 2', undefined)).toBeTrue()
  })

  test('keeps basic and unknown stages distinct', () => {
    expect(resolveCardIsEvolved('Basic', undefined)).toBeFalse()
    expect(resolveCardIsEvolved('De base', undefined)).toBeFalse()
    expect(resolveCardIsEvolved('VMAX', undefined)).toBeUndefined()
    expect(resolveCardIsEvolved(undefined, undefined)).toBeUndefined()
  })

  test('uses evolveFrom as a positive fallback and tolerates invalid JSON', () => {
    expect(resolveCardIsEvolved(undefined, 'Pohm')).toBeTrue()
    expect(getCardIsEvolved(JSON.stringify({ evolveFrom: 'Pohm' }))).toBeTrue()
    expect(getCardIsEvolved('{')).toBeUndefined()
  })
})
