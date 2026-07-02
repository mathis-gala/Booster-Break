import type { PackRotationResponse, SupportedLocale } from '@tcg-collection/shared'

export type BoosterRotationCadenceUnit = 'day' | 'month'

export interface BoosterRotationScheduleConfig {
  cadenceUnit: BoosterRotationCadenceUnit
  cadenceValue: number
  timeZone: string
  anchorLocalDate: string
}

export interface BoosterRotationConfig extends BoosterRotationScheduleConfig {
  availableCount: number
  proposalCount: number
}

export interface BoosterRotationPeriod {
  startsAt: Date
  endsAt: Date
  startLocalDate: string
  endLocalDate: string
}

export interface BoosterRotationGetInput {
  locale: SupportedLocale
  now?: Date
  userId?: string
}

export interface BoosterRotationVoteInput {
  locale: SupportedLocale
  now?: Date
  proposalId: string
  userId: string
}

export type BoosterRotationServiceErrorCode =
  | 'pokemon_sets_not_synced'
  | 'pack_rotation_proposal_not_found'
  | 'pack_rotation_vote_closed'

export interface BoosterRotationServiceError {
  error: BoosterRotationServiceErrorCode
  message: string
}

export type BoosterRotationResult = PackRotationResponse | BoosterRotationServiceError

export const isBoosterRotationServiceError = (
  result: BoosterRotationResult,
): result is BoosterRotationServiceError => {
  return 'error' in result
}
