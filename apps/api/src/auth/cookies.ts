interface CookieOptions {
  httpOnly?: boolean
  maxAge?: number
  path?: string
  sameSite?: 'Lax' | 'Strict' | 'None'
  secure?: boolean
}

export const parseCookies = (cookieHeader?: string): Map<string, string> => {
  const cookies = new Map<string, string>()

  if (!cookieHeader) {
    return cookies
  }

  for (const part of cookieHeader.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=')

    if (!rawName) {
      continue
    }

    try {
      cookies.set(rawName, decodeURIComponent(rawValue.join('=')))
    } catch {
      continue
    }
  }

  return cookies
}

export const serializeCookie = (
  name: string,
  value: string,
  options: CookieOptions = {},
): string => {
  const parts = [`${name}=${encodeURIComponent(value)}`]

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`)
  }

  parts.push(`Path=${options.path ?? '/'}`)
  parts.push(`SameSite=${options.sameSite ?? 'Lax'}`)

  if (options.httpOnly ?? true) {
    parts.push('HttpOnly')
  }

  if (options.secure) {
    parts.push('Secure')
  }

  return parts.join('; ')
}
