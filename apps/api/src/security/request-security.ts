import { Elysia } from 'elysia'

interface RequestSecurityOptions {
  apiOrigin: string
  webOrigin: string
  sessionCookieName: string
}

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS'])

export const createRequestSecurityPlugin = ({
  apiOrigin,
  webOrigin,
  sessionCookieName,
}: RequestSecurityOptions) => {
  const allowedOrigins = new Set([new URL(apiOrigin).origin, new URL(webOrigin).origin])

  return new Elysia({ name: 'request-security' })
    .onBeforeHandle(({ headers, request, status }) => {
      if (safeMethods.has(request.method)) {
        return
      }

      const requestOrigin = getRequestOrigin(headers.origin, headers.referer)
      const hasSessionCookie = headers.cookie
        ?.split(';')
        .some((part) => part.trim().startsWith(`${sessionCookieName}=`))

      if (requestOrigin && allowedOrigins.has(requestOrigin)) {
        return
      }

      if (!requestOrigin && !hasSessionCookie) {
        return
      }

      return status(403, {
        error: 'invalid_request_origin',
        message: 'Request origin is not allowed.',
      })
    })
    .as('global')
}

const getRequestOrigin = (
  originHeader: string | undefined,
  refererHeader: string | undefined,
): string | undefined => {
  const value = originHeader ?? refererHeader

  if (!value) {
    return undefined
  }

  try {
    return new URL(value).origin
  } catch {
    return 'invalid'
  }
}
