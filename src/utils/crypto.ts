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
/** Short TTL so IdP key rotation is picked up quickly. */
const CACHE_TTL_MS = 5 * 60 * 1000
/** Clock skew leeway for iat/nbf checks (seconds). */
const JWT_TIME_LEEWAY_SEC = 120

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

async function fetchJwks(jwksUri: string, bypassCache = false): Promise<JwkKey[]> {
  if (!bypassCache) {
    const cached = jwksCache.get(jwksUri)
    if (cached && cached.expiresAt > Date.now()) return cached.keys
  }

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

function assertJwtTimeClaims(payload: JWTPayload): void {
  const now = Math.floor(Date.now() / 1000)
  const nbf = payload.nbf
  if (typeof nbf === 'number' && nbf > now + JWT_TIME_LEEWAY_SEC) {
    throw new Error('ID token not valid yet (nbf)')
  }
  const iat = payload.iat
  if (typeof iat === 'number' && iat > now + JWT_TIME_LEEWAY_SEC) {
    throw new Error('ID token issued in the future (iat)')
  }
}

/**
 * Cryptographically verifies a Banno ID token (signature + iss + aud + exp + iat/nbf + nonce).
 */
export async function verifyIdToken(
  token: string,
  options: VerifyIdTokenOptions
): Promise<Record<string, unknown>> {
  const discovery = await fetchOidcDiscovery(options.env.ENV_URI)

  const verifyOnce = async (keys: JwkKey[]) =>
    verifyWithJwks(token, {
      keys,
      allowedAlgorithms: ['RS256', 'PS256', 'ES256'],
      verification: {
        iss: discovery.issuer,
        aud: options.env.CLIENT_ID,
        exp: true,
        // Manual iat/nbf with leeway below (Hono has no skew option).
        iat: false,
        nbf: false,
      },
    })

  let payload: JWTPayload
  try {
    const keys = await fetchJwks(discovery.jwks_uri)
    payload = await verifyOnce(keys)
  } catch (err) {
    // Bust JWKS cache and retry once (key rotation).
    try {
      const keys = await fetchJwks(discovery.jwks_uri, true)
      payload = await verifyOnce(keys)
    } catch (retryErr) {
      const message = retryErr instanceof Error ? retryErr.message : String(retryErr)
      throw new Error(`ID token verification failed: ${message}`)
    }
  }

  assertJwtTimeClaims(payload)

  if (options.nonce && payload.nonce !== options.nonce) {
    throw new Error('ID token nonce mismatch')
  }

  if (typeof payload.sub !== 'string' || !payload.sub) {
    throw new Error('ID token missing subject')
  }

  return payload as Record<string, unknown>
}
