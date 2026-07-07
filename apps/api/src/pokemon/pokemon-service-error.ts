export type PokemonServiceErrorCode =
  | 'pack_cooldown'
  | 'pack_unavailable'
  | 'pokemon_sets_not_synced'
  | 'recycle_conflict'
  | 'recycle_invalid'
  | 'recycle_nothing'
  | 'unauthenticated'

export interface PokemonServiceError {
  error: PokemonServiceErrorCode
  message: string
}

export const isPokemonServiceError = <T>(
  result: T | PokemonServiceError,
): result is PokemonServiceError => {
  return typeof result === 'object' && result !== null && 'error' in result
}
