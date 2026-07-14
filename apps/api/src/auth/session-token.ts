const tokenByteLength = 32

export const createSessionToken = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(tokenByteLength))

  return toHex(bytes)
}

export const hashSessionToken = async (token: string): Promise<string> => {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))

  return toHex(new Uint8Array(hash))
}

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
