import { Context } from 'hono'
import { setSignedCookie } from 'hono/cookie'
import { processAuthCallback } from '../services/auth.service'
import { SessionService } from '../services/session.service'
import { verifyIdToken } from './crypto'
import type { CloudflareBindings, Variables } from '../types'

export function requireSecrets(env: CloudflareBindings): {
  sessionEnc: string
  cookieSign: string
} {
  if (!env.SESSION_ENC_SECRET) throw new Error('SESSION_ENC_SECRET required')
  if (!env.COOKIE_SIGNING_SECRET) throw new Error('COOKIE_SIGNING_SECRET required')
  if (env.SESSION_ENC_SECRET === env.COOKIE_SIGNING_SECRET) {
    throw new Error('COOKIE_SIGNING_SECRET must differ from SESSION_ENC_SECRET')
  }
  return { sessionEnc: env.SESSION_ENC_SECRET, cookieSign: env.COOKIE_SIGNING_SECRET }
}

export async function handleOAuthCallback(
  c: Context<{ Bindings: CloudflareBindings; Variables: Variables }>
): Promise<string> {
  const { tokens, nonce } = await processAuthCallback(c)
  if (!tokens.access_token || !tokens.id_token) throw new Error('token_exchange_failed')

  const idTokenPayload = await verifyIdToken(tokens.id_token, {
    env: c.env,
    nonce,
  })
  const userId = idTokenPayload.sub as string

  if (!c.env.SESSIONS_KV) throw new Error('SESSIONS_KV required')
  const { sessionEnc, cookieSign } = requireSecrets(c.env)

  const sessionService = new SessionService(c.env.SESSIONS_KV, sessionEnc, c.env)
  const existingSessionId = await sessionService.getUserSessionId(userId)
  const now = Math.floor(Date.now() / 1000)

  let sessionId: string
  if (existingSessionId) {
    sessionId = existingSessionId
    await sessionService.updateSession(sessionId, {
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: now + tokens.expires_in,
      lastActivityAt: now,
    })
  } else {
    sessionId = crypto.randomUUID()
    await sessionService.createUserSession(sessionId, userId, {
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: now + tokens.expires_in,
      lastActivityAt: now,
    })
  }

  await setSignedCookie(c, '__Secure-session_id', sessionId, cookieSign, {
    httpOnly: true,
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'None',
    partitioned: true,
  })

  return sessionId
}
