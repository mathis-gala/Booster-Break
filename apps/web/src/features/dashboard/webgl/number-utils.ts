export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

export const lerp = (from: number, to: number, amount: number): number =>
  from + (to - from) * amount
