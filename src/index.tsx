import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { logger } from 'hono/logger'
import { jsxRenderer } from 'hono/jsx-renderer'
import { secureHeaders } from 'hono/secure-headers'
import type { ContentSecurityPolicyOptionHandler } from 'hono/secure-headers'
import { cors } from 'hono/cors'
import { csrf } from 'hono/csrf'
import { bodyLimit } from 'hono/body-limit'
import { requestId } from 'hono/request-id'
import { timeout } from 'hono/timeout'
import { Layout } from './layout'
import { createAuthRoutes } from './routes/auth.routes'
import { createPageRoutes } from './routes/page.routes.tsx'
import { createApiRoutes } from './routes/api.routes'
import { isAllowedCsrfOrigin, isAllowedExternalOrigin } from './utils/origins'
import { SAFE_CONFIG_ERROR, SAFE_RATE_LIMIT, SAFE_SERVER_ERROR, logSafeError } from './utils/errors'
import type { HonoEnv } from './types'

const app = new Hono<HonoEnv>()

/** Longest prefix first — `/callback/plugin` must win over `/callback`. */
const RATE_LIMITS: Array<{ prefix: string; max: number; windowSec: number }> = [
  { prefix: '/callback/plugin', max: 20, windowSec: 60 },
  { prefix: '/auth/', max: 20, windowSec: 60 },
  { prefix: '/callback', max: 30, windowSec: 60 },
  { prefix: '/api/', max: 40, windowSec: 60 },
]

const envUriSource: ContentSecurityPolicyOptionHandler = (c) =>
  ((c.env as HonoEnv['Bindings']).ENV_URI || 'https://digital.garden-fi.com').replace(/\/$/, '')

function buildAssetCsp(envUri: string): string {
  const frame = envUri.replace(/\/$/, '')
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "script-src 'self'",
    "style-src 'self' https://fonts.googleapis.com",
    "img-src 'self' https: data:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self'",
    `frame-ancestors 'self' ${frame}`,
    `form-action 'self' ${frame}`,
    `frame-src 'self' ${frame}`,
    'upgrade-insecure-requests',
  ].join('; ')
}

app.use('*', logger())
app.use('*', requestId())

app.use(
  '*',
  secureHeaders({
    xFrameOptions: false,
    xContentTypeOptions: true,
    xXssProtection: true,
    strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
    referrerPolicy: 'strict-origin-when-cross-origin',
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'https:', 'data:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      formAction: ["'self'", envUriSource],
      frameAncestors: ["'self'", envUriSource],
      frameSrc: ["'self'", envUriSource],
      upgradeInsecureRequests: [],
    },
  })
)

app.use(
  '*',
  bodyLimit({
    maxSize: 50 * 1024,
    onError: (c) => c.text('Request body too large', 413),
  })
)

app.use('*', async (c, next) => {
  const allowLocal =
    (c.env.ENVIRONMENT ?? '').toLowerCase() === 'development' ||
    new URL(c.req.url).hostname === 'localhost' ||
    new URL(c.req.url).hostname === '127.0.0.1'

  const corsMiddleware = cors({
    origin: (origin) => {
      if (
        origin &&
        isAllowedExternalOrigin(origin, c.env.ENV_URI, { allowLocalhost: allowLocal })
      ) {
        return origin
      }
      return null
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  })
  return corsMiddleware(c, next)
})

app.use('*', async (c, next) => {
  const path = c.req.path
  const rule = RATE_LIMITS.find((r) => path.startsWith(r.prefix))
  if (!rule) {
    await next()
    return
  }

  if (!c.env.SESSIONS_KV) {
    return c.text(SAFE_RATE_LIMIT, 503, { 'Retry-After': '60' })
  }

  const clientIP = c.req.header('CF-Connecting-IP') || 'unknown'
  const nowSec = Math.floor(Date.now() / 1000)
  const windowId = Math.floor(nowSec / rule.windowSec)
  const key = `ratelimit:${rule.prefix}:${clientIP}:${windowId}`

  try {
    const current = await c.env.SESSIONS_KV.get(key)
    let count = 0
    if (current !== null) {
      count = parseInt(current, 10)
      if (!Number.isFinite(count) || count < 0) {
        // Corrupt counter — fail closed
        return c.text(SAFE_RATE_LIMIT, 503, { 'Retry-After': '60' })
      }
    }
    if (count >= rule.max) {
      return c.text(SAFE_RATE_LIMIT, 429, { 'Retry-After': String(rule.windowSec) })
    }
    await c.env.SESSIONS_KV.put(key, String(count + 1), {
      expirationTtl: rule.windowSec + 5,
    })
  } catch (err) {
    logSafeError('rate_limit', err, { requestId: c.get('requestId') })
    return c.text(SAFE_RATE_LIMIT, 503, { 'Retry-After': '60' })
  }

  await next()
})

app.use('*', async (c, next) => {
  if (c.req.path.startsWith('/auth') || c.req.path.startsWith('/callback')) {
    return next()
  }
  const allowLocal =
    (c.env.ENVIRONMENT ?? '').toLowerCase() === 'development' ||
    new URL(c.req.url).hostname === 'localhost' ||
    new URL(c.req.url).hostname === '127.0.0.1'

  const csrfMiddleware = csrf({
    origin: (origin) => {
      const requestOrigin = new URL(c.req.url).origin
      return isAllowedCsrfOrigin(origin, requestOrigin, c.env.ENV_URI, {
        allowLocalhost: allowLocal,
      })
    },
  })
  return csrfMiddleware(c, next)
})

app.use(
  '*',
  jsxRenderer(({ children, title, activeTab, userName, landing, embed, pluginHeight }) => (
    <Layout
      title={title}
      activeTab={activeTab}
      userName={userName}
      landing={landing}
      embed={embed}
      pluginHeight={pluginHeight}
    >
      {children}
    </Layout>
  ))
)

app.use(
  '/callback/plugin',
  timeout(
    25_000,
    () =>
      new HTTPException(408, {
        message: SAFE_CONFIG_ERROR,
      })
  )
)

app.route('/', createAuthRoutes())
app.route('/', createPageRoutes())
app.route('/', createApiRoutes())

app.notFound(async (c) => {
  if (c.env.ASSETS) {
    const assetResponse = await c.env.ASSETS.fetch(c.req.raw)
    if (assetResponse.status !== 404) {
      const envUri = (c.env.ENV_URI || 'https://digital.garden-fi.com').replace(/\/$/, '')
      const headers = new Headers(assetResponse.headers)
      headers.set('X-Content-Type-Options', 'nosniff')
      headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
      headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      )
      headers.set('Content-Security-Policy', buildAssetCsp(envUri))
      return new Response(assetResponse.body, {
        status: assetResponse.status,
        statusText: assetResponse.statusText,
        headers,
      })
    }
  }
  return c.text('Not Found', 404)
})

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse()
  }
  logSafeError('Application error', err, {
    requestId: c.get('requestId'),
    path: c.req.path,
  })
  return c.text(SAFE_SERVER_ERROR, 500)
})

export default app
