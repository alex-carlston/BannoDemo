import { createMiddleware } from 'hono/factory'
import { getSignedCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import { SessionService } from '../services/session.service'
import { requireSecrets } from '../utils/auth'
import { SAFE_CONFIG_ERROR } from '../utils/errors'
import type { HonoEnv } from '../types'

export const requireSession = createMiddleware<HonoEnv>(async (c, next) => {
  if (!c.env.SESSIONS_KV) {
    throw new HTTPException(503, { message: SAFE_CONFIG_ERROR })
  }

  let sessionEnc: string
  let cookieSign: string
  try {
    ;({ sessionEnc, cookieSign } = requireSecrets(c.env))
  } catch {
    throw new HTTPException(503, { message: SAFE_CONFIG_ERROR })
  }

  const sessionId = await getSignedCookie(c, cookieSign, '__Secure-session_id')
  if (!sessionId) {
    return c.redirect('/auth/login')
  }

  const sessionService = new SessionService(c.env.SESSIONS_KV, sessionEnc, c.env)
  const session = await sessionService.getSession(sessionId)
  if (!session) {
    return c.redirect('/auth/login')
  }

  c.set('sessionId', sessionId)
  c.set('userId', session.userId)
  c.set('accessToken', session.accessToken)
  await next()
})
