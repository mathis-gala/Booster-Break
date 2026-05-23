export interface AuthUser {
  id: string
  pseudo: string
  displayName?: string
  avatarUrl?: string
}

export interface AuthSession {
  id: string
  userId: string
  expiresAt: Date
}
