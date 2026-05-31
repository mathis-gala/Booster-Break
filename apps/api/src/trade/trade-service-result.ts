import type { TradeServiceError } from './trade-types'

export const isTradeServiceError = (result: unknown): result is TradeServiceError => {
  return typeof result === 'object' && result !== null && 'error' in result
}
