import { Hono } from 'hono'
import { getSignedCookie, deleteCookie } from 'hono/cookie'
import { initiateAuth, revokeRefreshToken } from '../services/auth.service'
import { SessionService } from '../services/session.service'
import { handleOAuthCallback } from '../utils/auth'
import { SAFE_AUTH_ERROR, logSafeError } from '../utils/errors'
import type { HonoEnv } from '../types'

export function createAuthRoutes(): Hono<HonoEnv> {
  const router = new Hono<HonoEnv>()

  router.get('/auth/login', async (c) => {
    try {
      const url = await initiateAuth(c)
      return c.redirect(url)
    } catch (err) {
      logSafeError('auth.login', err, { requestId: c.get('requestId') })
      return c.text(SAFE_AUTH_ERROR, 500)
    }
  })

  router.get('/logout', async (c) => {
    const cookieSecret = c.env.COOKIE_SIGNING_SECRET
    if (cookieSecret && c.env.SESSIONS_KV && c.env.SESSION_ENC_SECRET) {
      const sessionId = await getSignedCookie(c, cookieSecret, '__Secure-session_id')
      if (sessionId) {
        const sessionService = new SessionService(
          c.env.SESSIONS_KV,
          c.env.SESSION_ENC_SECRET,
          c.env
        )
        const session = await sessionService.getSession(sessionId)
        if (session) {
          await revokeRefreshToken(session.refreshToken, c.env)
          await sessionService.deleteUserSession(session.userId)
        }
        await sessionService.deleteSession(sessionId)
      }
    }
    deleteCookie(c, '__Secure-session_id', {
      secure: true,
      path: '/',
      sameSite: 'None',
      partitioned: true,
    })
    return c.redirect('/')
  })

  router.get('/callback', async (c) => {
    const code = c.req.query('code')
    const error = c.req.query('error')
    if (error) {
      logSafeError('auth.callback.oauth', error, {
        requestId: c.get('requestId'),
        description: c.req.query('error_description')?.slice(0, 100),
      })
      return c.text(SAFE_AUTH_ERROR, 400)
    }
    if (!code) return c.redirect('/auth/login')
    try {
      await handleOAuthCallback(c)
      return c.redirect('/callback/plugin')
    } catch (err) {
      logSafeError('auth.callback', err, { requestId: c.get('requestId') })
      return c.text(SAFE_AUTH_ERROR, 500)
    }
  })

  return router
}
