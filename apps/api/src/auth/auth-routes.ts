import type { ApiConfig } from '../config'
import type { AuthStore } from './session-store'
import { createAuthController } from './auth-controller'

interface AuthRoutesOptions {
  config: ApiConfig
  store: AuthStore
}

export const createAuthRoutes = (options: AuthRoutesOptions) => createAuthController(options)
