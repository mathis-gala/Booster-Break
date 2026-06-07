import type { HealthResponse, OpenPackResponse } from '@tcg-collection/shared'
import { api, getApiUrl } from '@/lib/api-client'
import type { EdenError } from '@/lib/queries/eden-query-option'
import { m } from '@/paraglide/messages'

export { getApiUrl }

export async function fetchHealth(): Promise<HealthResponse> {
  const { data, error } = await api.health.get()

  if (error || !data) {
    throw new Error(m.api_unable_reach())
  }

  return data
}

export async function logout(): Promise<void> {
  const { error, status } = await api.auth.logout.post()

  if (error && status !== 204) {
    throw new Error(m.api_unable_logout())
  }
}

export async function openPokemonPack(setId?: string): Promise<OpenPackResponse> {
  const { data, error } = await api.pokemon.packs.open.post({
    setId,
  })

  if (error || !data) {
    throw new Error(toApiErrorMessage(toApiErrorPayload(error), m.api_unable_open_pack()))
  }

  return data
}

export async function openPokemonPackSandbox(setId?: string): Promise<OpenPackResponse> {
  const { data, error } = await api.pokemon.packs.sandbox.open.post({
    setId,
  })

  if (error || !data) {
    throw new Error(toApiErrorMessage(toApiErrorPayload(error), m.api_unable_open_sandbox_pack()))
  }

  return data
}

const toApiErrorMessage = (
  payload: { message?: string; error?: string } | undefined,
  fallback: string,
): string => {
  if (payload?.message) {
    return payload.message
  }

  switch (payload?.error) {
    case 'unauthenticated':
      return m.api_sign_in_open_pack()
    case 'pack_cooldown':
      return payload.message ?? m.api_pack_cooldown()
    default:
      return payload?.error ?? fallback
  }
}

const toApiErrorPayload = (
  error: EdenError | null,
): { message?: string; error?: string } | undefined => {
  return error?.value
}
