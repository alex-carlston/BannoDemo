/**
 * Banno Plugin Starter Kit — reusable edge auth & security primitives.
 *
 * This module is the intentional public boundary between:
 *   - Reusable plugin infrastructure (OAuth, sessions, origins, errors)
 *   - App-specific product UI (Pulse dashboard, goals, insights)
 *
 * When building your own Banno plugin, copy or depend on these exports
 * and replace the Pulse-specific routes/views under `src/routes`,
 * `src/components`, and `src/services/banno.service.ts` / `goals.service.ts`.
 *
 * See docs/plugin-starter.md for the full walkthrough.
 */

// OAuth / OIDC
export {
  initiateAuth,
  processAuthCallback,
  exchangeCodeForToken,
  refreshAccessToken,
  revokeRefreshToken,
  generateAuthUrl,
  type AuthInitResult,
  type AuthStateRecord,
  type TokenResponse,
  type Bindings as AuthBindings,
} from '../services/auth.service'

export { handleOAuthCallback } from '../utils/auth'
export {
  verifyIdToken,
  fetchOidcDiscovery,
  decodeJwtPayload,
  type VerifyIdTokenOptions,
} from '../utils/crypto'

// Sessions
export {
  SessionService,
  SESSION_TTL_SECONDS,
  SESSION_IDLE_SECONDS,
  type SessionData,
} from '../services/session.service'
export { default as KVService } from '../services/kv.service'

// Middleware
export { requestId } from 'hono/request-id'
export { requireSession } from '../middleware/auth.middleware'

// Origin / redirect hardening
export {
  isAllowedExternalOrigin,
  isAllowedCsrfOrigin,
  isLocalDevOrigin,
  assertValidRedirectUri,
  parseOriginHostname,
} from '../utils/origins'

// Safe errors
export {
  SAFE_AUTH_ERROR,
  SAFE_SERVER_ERROR,
  SAFE_RATE_LIMIT,
  SAFE_CONFIG_ERROR,
  SAFE_VALIDATION_ERROR,
  logSafeError,
} from '../utils/errors'

// Embed / localhost helpers
export {
  isLocalRedirectUri,
  isBannoEmbedRequest,
  isPublicHttpsUrl,
} from '../utils/public-url'
export {
  DEFAULT_PLUGIN_INITIAL_HEIGHT,
  parsePluginInitialHeight,
  isEmbedRequest,
} from '../config/plugin'
