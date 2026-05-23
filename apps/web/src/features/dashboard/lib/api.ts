import type { AuthMeResponse, HealthResponse } from '@tcg-collection/shared'
import type {
  CollectionSort,
  OpenPackResponse,
  PackOpenStatusResponse,
  PokemonCardSummary,
  PokemonSetSummary,
  SupportedLocale,
  UserCollectionResponse,
} from '@tcg-collection/shared'
import { toast } from '@/features/toast/toast-store'
import { m } from '@/paraglide/messages'

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await apiFetch('/health')

  if (!response.ok) {
    throw new Error(m.api_unable_reach())
  }

  return response.json()
}

export async function fetchCurrentUser(): Promise<AuthMeResponse> {
  const response = await apiFetch('/auth/me', {
    credentials: 'include',
  })

  if (response.status === 401) {
    return { authenticated: false }
  }

  if (!response.ok) {
    throw new Error(m.api_unable_auth_session())
  }

  return response.json()
}

export async function logout(): Promise<void> {
  const response = await apiFetch('/auth/logout', {
    method: 'POST',
    credentials: 'include',
  })

  if (!response.ok && response.status !== 204) {
    throw new Error(m.api_unable_logout())
  }
}

export async function fetchPokemonSets(
  locale: SupportedLocale = 'fr',
): Promise<PokemonSetSummary[]> {
  const response = await apiFetch(`/pokemon/sets?locale=${encodeURIComponent(locale)}`)

  if (!response.ok) {
    throw new Error(m.api_unable_load_sets())
  }

  const payload = (await response.json()) as { sets: PokemonSetSummary[] }

  return payload.sets
}

export async function fetchPokemonCards(
  setId: string,
  locale: SupportedLocale = 'fr',
): Promise<PokemonCardSummary[]> {
  const searchParams = new URLSearchParams({
    setId,
    locale,
  })
  const response = await apiFetch(`/pokemon/cards?${searchParams.toString()}`)

  if (!response.ok) {
    throw new Error(m.api_unable_load_cards())
  }

  const payload = (await response.json()) as { cards: PokemonCardSummary[] }

  return payload.cards
}

export async function fetchPackOpenStatus(): Promise<PackOpenStatusResponse> {
  const response = await apiFetch('/pokemon/packs/status', {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(m.api_unable_load_pack_status())
  }

  return response.json()
}

export async function openPokemonPack(
  setId?: string,
  locale: SupportedLocale = 'fr',
): Promise<OpenPackResponse> {
  const response = await apiFetch('/pokemon/packs/open', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      setId,
      locale,
    }),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => undefined)) as
      | { message?: string; error?: string }
      | undefined

    throw new Error(toApiErrorMessage(payload, m.api_unable_open_pack()))
  }

  return response.json()
}

export interface FetchUserCollectionOptions {
  page: number
  pageSize: number
  sort: CollectionSort
  locale: SupportedLocale
}

export async function fetchUserCollection(
  options: FetchUserCollectionOptions = {
    page: 1,
    pageSize: 24,
    sort: 'recent',
    locale: 'fr',
  },
): Promise<UserCollectionResponse> {
  const searchParams = new URLSearchParams({
    page: String(options.page),
    pageSize: String(options.pageSize),
    sort: options.sort,
    locale: options.locale,
  })
  const response = await apiFetch(`/pokemon/collection?${searchParams.toString()}`, {
    credentials: 'include',
  })

  if (response.status === 401) {
    return {
      cards: [],
      pagination: {
        page: options.page,
        pageSize: options.pageSize,
        total: 0,
        totalCards: 0,
        pageCount: 1,
      },
      sort: options.sort,
    }
  }

  if (!response.ok) {
    throw new Error(m.api_unable_load_collection())
  }

  return response.json()
}

const configuredApiOrigin = (import.meta.env.VITE_API_ORIGIN ?? '').replace(/\/$/, '')
const localApiOrigin = (import.meta.env.VITE_LOCAL_API_ORIGIN ?? 'http://127.0.0.1:3100').replace(
  /\/$/,
  '',
)
let activeApiOrigin = configuredApiOrigin
let hasShownLocalFallbackToast = false

export const getApiUrl = (path: `/${string}`): string => {
  return activeApiOrigin ? `${activeApiOrigin}${path}` : `/api${path}`
}

const apiFetch = async (path: `/${string}`, init?: RequestInit): Promise<Response> => {
  try {
    return await fetch(getApiUrl(path), init)
  } catch (error) {
    if (!shouldTryLocalApiFallback()) {
      throw error
    }

    const response = await fetch(`${localApiOrigin}${path}`, init)
    activeApiOrigin = localApiOrigin

    if (!hasShownLocalFallbackToast) {
      toast.show(`Configured API is unreachable. Using local API at ${localApiOrigin}.`, 'success')
      hasShownLocalFallbackToast = true
    }

    return response
  }
}

const shouldTryLocalApiFallback = (): boolean => {
  return localApiOrigin.length > 0 && activeApiOrigin !== localApiOrigin
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
