import { treaty } from '@elysiajs/eden'
import type { Treaty } from '@elysiajs/eden'
import type { App } from '../../../api/src/index'

import { toast } from '@/features/toast/toast-store'
import { m } from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'

const configuredApiOrigin = (import.meta.env.VITE_API_ORIGIN ?? '').replace(/\/$/, '')
const localApiOrigin = (import.meta.env.VITE_LOCAL_API_ORIGIN ?? '').replace(/\/$/, '')
let activeApiOrigin = configuredApiOrigin
let hasShownLocalFallbackToast = false

export const getApiUrl = (path: `/${string}`): string => {
  return activeApiOrigin ? `${activeApiOrigin}${path}` : `/api${path}`
}

export const api = treaty<App>(activeApiOrigin || '/api', {
  fetch: {
    credentials: 'include',
  },
  fetcher: fetchWithFallback as typeof fetch,
  headers: () => ({
    'x-locale': getLocale(),
  }),
})

export type Eden = Treaty.Create<App>

async function fetchWithFallback(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const requestPath = getRequestPath(input)
  const target = activeApiOrigin ? `${activeApiOrigin}${requestPath}` : `/api${requestPath}`

  try {
    return await fetch(target, init)
  } catch (error) {
    if (!shouldTryLocalApiFallback()) {
      throw error
    }

    const response = await fetch(`${localApiOrigin}${requestPath}`, init)
    activeApiOrigin = localApiOrigin

    if (!hasShownLocalFallbackToast) {
      toast.show(m.api_using_local_fallback({ origin: localApiOrigin }), 'success')
      hasShownLocalFallbackToast = true
    }

    return response
  }
}

const shouldTryLocalApiFallback = (): boolean => {
  return localApiOrigin.length > 0 && activeApiOrigin !== localApiOrigin
}

const getRequestPath = (input: RequestInfo | URL): `/${string}` => {
  if (input instanceof Request) {
    const url = new URL(input.url, window.location.origin)

    return normalizePath(`${url.pathname}${url.search}`)
  }

  const url = new URL(String(input), window.location.origin)

  return normalizePath(`${url.pathname}${url.search}`)
}

const normalizePath = (path: string): `/${string}` => {
  const routePath = path.startsWith('/api/') ? path.slice(4) : path

  return routePath.startsWith('/') ? (routePath as `/${string}`) : `/${routePath}`
}
