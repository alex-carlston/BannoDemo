import { decode, verifyWithJwks } from 'hono/jwt'
import type { JWTPayload } from 'hono/utils/jwt/types'
import type { CloudflareBindings } from '../types'

interface OidcDiscovery {
  issuer: string
  jwks_uri: string
  revocation_endpoint?: string
}

interface JwkKey {
  kid?: string
  kty: string
  alg?: string
  use?: string
  n?: string
  e?: string
  crv?: string
  x?: string
  y?: string
}

const discoveryCache = new Map<string, { data: OidcDiscovery; expiresAt: number }>()
const jwksCache = new Map<string, { keys: JwkKey[]; expiresAt: number }>()
const CACHE_TTL_MS = 60 * 60 * 1000

export async function fetchOidcDiscovery(envUri: string): Promise<OidcDiscovery> {
  const base = envUri.replace(/\/$/, '')
  const cached = discoveryCache.get(base)
  if (cached && cached.expiresAt > Date.now()) return cached.data

  const url = `${base}/a/consumer/api/v0/oidc/.well-known/openid-configuration`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`OIDC discovery failed: ${response.status}`)
  }
  const data = (await response.json()) as OidcDiscovery
  if (!data.issuer || !data.jwks_uri) {
    throw new Error('OIDC discovery missing issuer or jwks_uri')
  }
  discoveryCache.set(base, { data, expiresAt: Date.now() + CACHE_TTL_MS })
  return data
}

async function fetchJwks(jwksUri: string): Promise<JwkKey[]> {
  const cached = jwksCache.get(jwksUri)
  if (cached && cached.expiresAt > Date.now()) return cached.keys

  const response = await fetch(jwksUri)
  if (!response.ok) {
    throw new Error(`JWKS fetch failed: ${response.status}`)
  }
  const data = (await response.json()) as { keys?: JwkKey[] }
  const keys = (data.keys ?? []).filter((k) => !k.use || k.use === 'sig')
  jwksCache.set(jwksUri, { keys, expiresAt: Date.now() + CACHE_TTL_MS })
  return keys
}

/** Decode JWT payload without verifying the signature. */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  return decode(token).payload as Record<string, unknown>
}

export interface VerifyIdTokenOptions {
  env: CloudflareBindings
  nonce?: string
}

/**
 * Cryptographically verifies a Banno ID token (signature + iss + aud + exp + nonce).
 *
 * Uses Hono `verifyWithJwks` for signature/claims, but:
 * - fetches/caches JWKS ourselves (Banno keys often omit `alg`; avoid CF cache on JWKS)
 * - disables `iat` (Hono default; Banno clocks can trip it)
 * - keeps app-specific nonce + sub checks
 */
export async function verifyIdToken(
  token: string,
  options: VerifyIdTokenOptions
): Promise<Record<string, unknown>> {
  const discovery = await fetchOidcDiscovery(options.env.ENV_URI)
  const keys = await fetchJwks(discovery.jwks_uri)

  let payload: JWTPayload
  try {
    payload = await verifyWithJwks(token, {
      keys,
      allowedAlgorithms: ['RS256', 'PS256', 'ES256'],
      verification: {
        iss: discovery.issuer,
        aud: options.env.CLIENT_ID,
        exp: true,
        // Match prior behavior: do not enforce iat/nbf clock skew (Hono has no leeway).
        iat: false,
        nbf: false,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`ID token verification failed: ${message}`)
  }

  if (options.nonce && payload.nonce !== options.nonce) {
    throw new Error('ID token nonce mismatch')
  }

  if (typeof payload.sub !== 'string' || !payload.sub) {
    throw new Error('ID token missing subject')
  }

  return payload as Record<string, unknown>
}
