import { Context } from 'hono'
import KVService from './kv.service'
import { fetchOidcDiscovery } from '../utils/crypto'
import { assertValidRedirectUri } from '../utils/origins'
import type { CloudflareBindings, Variables } from '../types'

export type Bindings = CloudflareBindings

const SCOPES = [
  'openid',
  'offline_access',
  'profile',
  'https://api.banno.com/consumer/auth/accounts.readonly',
  'https://api.banno.com/consumer/auth/user.readonly',
  'https://api.banno.com/consumer/auth/user.profile.readonly',
  'https://api.banno.com/consumer/auth/documents.readonly',
  'https://api.banno.com/consumer/auth/transactions.detail.readonly',
  'https://api.banno.com/consumer/claim/customer_identifier.readonly',
  'https://api.banno.com/consumer/claim/phone_numbers.readonly',
  'https://api.banno.com/consumer/claim/user_type.readonly',
]

export interface AuthInitResult {
  url: string
  codeVerifier: string
  state: string
  nonce: string
}

export interface TokenResponse {
  access_token: string
  id_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

export interface AuthStateRecord {
  codeVerifier: string
  nonce: string
}

function base64UrlEncode(array: Uint8Array): string {
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function generateRandomString(length = 32): Promise<string> {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

async function generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const codeVerifier = await generateRandomString()
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier))
  return { codeVerifier, codeChallenge: base64UrlEncode(new Uint8Array(hash)) }
}

export async function generateAuthUrl(env: Bindings): Promise<AuthInitResult> {
  assertValidRedirectUri(env.REDIRECT_URI, env.ENVIRONMENT)
  const { codeVerifier, codeChallenge } = await generatePKCE()
  const state = await generateRandomString(16)
  const nonce = await generateRandomString(16)
  const params = new URLSearchParams({
    client_id: env.CLIENT_ID,
    response_type: 'code',
    scope: SCOPES.join(' '),
    redirect_uri: env.REDIRECT_URI,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    nonce,
  })
  const base = env.ENV_URI.replace(/\/$/, '')
  return {
    url: `${base}/a/consumer/api/v0/oidc/auth?${params.toString()}`,
    codeVerifier,
    state,
    nonce,
  }
}

export async function initiateAuth(
  c: Context<{ Bindings: Bindings; Variables: Variables }>
): Promise<string> {
  const { url, codeVerifier, state, nonce } = await generateAuthUrl(c.env)
  if (c.env.SESSIONS_KV && c.env.SESSION_ENC_SECRET) {
    const kv = new KVService(c.env.SESSIONS_KV, c.env.SESSION_ENC_SECRET, { requireSecret: true })
    const expiresAt = Math.floor(Date.now() / 1000) + 600
    await kv.put(`auth_state:${state}`, { codeVerifier, nonce } satisfies AuthStateRecord, expiresAt)
  }
  return url
}

export async function processAuthCallback(
  c: Context<{ Bindings: Bindings; Variables: Variables }>
): Promise<{ tokens: TokenResponse; nonce: string }> {
  const code = c.req.query('code')
  const error = c.req.query('error')
  const state = c.req.query('state')

  if (error) throw new Error('oauth_error')
  if (!code) throw new Error('missing_code')
  if (!state) throw new Error('missing_state')
  if (!c.env.SESSIONS_KV || !c.env.SESSION_ENC_SECRET) {
    throw new Error('kv_unavailable')
  }

  assertValidRedirectUri(c.env.REDIRECT_URI, c.env.ENVIRONMENT)

  const kv = new KVService(c.env.SESSIONS_KV, c.env.SESSION_ENC_SECRET, { requireSecret: true })
  const authState = await kv.get<AuthStateRecord>(`auth_state:${state}`)
  if (!authState?.codeVerifier || !authState?.nonce) throw new Error('invalid_state')
  await kv.delete(`auth_state:${state}`)

  const tokens = await exchangeCodeForToken(code, authState.codeVerifier, c.env)
  return { tokens, nonce: authState.nonce }
}

export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  env: Bindings
): Promise<TokenResponse> {
  const base = env.ENV_URI.replace(/\/$/, '')
  const response = await fetch(`${base}/a/consumer/api/v0/oidc/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.CLIENT_ID,
      client_secret: env.CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: env.REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  })
  if (!response.ok) {
    throw new Error(`token_exchange_failed:${response.status}`)
  }
  return response.json()
}

export async function refreshAccessToken(
  refreshToken: string,
  env: Bindings
): Promise<TokenResponse> {
  const base = env.ENV_URI.replace(/\/$/, '')
  const response = await fetch(`${base}/a/consumer/api/v0/oidc/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.CLIENT_ID,
      client_secret: env.CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  if (!response.ok) throw new Error(`token_refresh_failed:${response.status}`)
  return response.json()
}

export async function revokeRefreshToken(refreshToken: string, env: Bindings): Promise<void> {
  try {
    const discovery = await fetchOidcDiscovery(env.ENV_URI)
    const revokeUrl =
      discovery.revocation_endpoint ||
      `${env.ENV_URI.replace(/\/$/, '')}/a/consumer/api/v0/oidc/token/revocation`

    await fetch(revokeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.CLIENT_ID,
        client_secret: env.CLIENT_SECRET,
        token: refreshToken,
        token_type_hint: 'refresh_token',
      }),
    })
  } catch {
    // Best-effort revocation — still clear local session
  }
}
