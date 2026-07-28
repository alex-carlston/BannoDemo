import { Hono } from 'hono'
import { getSignedCookie, deleteCookie } from 'hono/cookie'
import { SessionService } from '../services/session.service'
import { handleOAuthCallback, requireSecrets } from '../utils/auth'
import { initiateAuth } from '../services/auth.service'
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

  /** GET must not log out (CSRF). */
  router.get('/logout', (c) => c.redirect('/'))

  router.post('/logout', async (c) => {
    try {
      const { sessionEnc, cookieSign } = requireSecrets(c.env)
      if (!c.env.SESSIONS_KV) {
        return c.redirect('/')
      }
      const sessionId = await getSignedCookie(c, cookieSign, '__Secure-session_id')
      if (sessionId) {
        const sessionService = new SessionService(c.env.SESSIONS_KV, sessionEnc, c.env)
        await sessionService.destroySession(sessionId)
      }
    } catch (err) {
      logSafeError('auth.logout', err, { requestId: c.get('requestId') })
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
