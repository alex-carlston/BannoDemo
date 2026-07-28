import { Hono } from 'hono'
import { getSignedCookie } from 'hono/cookie'
import { SessionService } from '../services/session.service'
import { loadDashboardData } from '../services/banno.service'
import { handleOAuthCallback, requireSecrets } from '../utils/auth'
import { isEmbedRequest, parsePluginInitialHeight } from '../config/plugin'
import {
  DashboardView,
  AccountsView,
  TransactionsView,
  InsightsView,
  GoalsView,
  DocumentsView,
} from '../components/views'
import type { HonoEnv } from '../types'
import { SAFE_AUTH_ERROR, SAFE_CONFIG_ERROR, logSafeError } from '../utils/errors'

const VALID_TABS = new Set(['dashboard', 'accounts', 'transactions', 'insights', 'goals', 'documents'])

export function createPageRoutes(): Hono<HonoEnv> {
  const router = new Hono<HonoEnv>()

  router.get('/', (c) =>
    c.render(
      <div class="landing">
        <div class="landing-glow" />
        <div class="landing-content">
          <div class="landing-badge">Edge-Native · OAuth 2.0 + PKCE · Banno Consumer API</div>
          <h1 class="landing-title">
            Your financial life,
            <br />
            <em>pulsing with insight</em>
          </h1>
          <p class="landing-desc">
            Banno Pulse is a secure financial wellness hub — accounts, transactions, spending
            insights, savings goals, and documents — all rendered at the edge on Cloudflare Workers.
          </p>
          <div class="landing-features">
            <div class="feature">
              <span class="feature-icon">◈</span>
              <span>Real-time account aggregation</span>
            </div>
            <div class="feature">
              <span class="feature-icon">◎</span>
              <span>Transaction intelligence</span>
            </div>
            <div class="feature">
              <span class="feature-icon">★</span>
              <span>Personal savings goals</span>
            </div>
            <div class="feature">
              <span class="feature-icon">▣</span>
              <span>Document center</span>
            </div>
          </div>
          <a href="/auth/login" class="btn btn-primary btn-lg">
            Sign in with Banno
          </a>
          <p class="landing-note">
            Deployed on Cloudflare Workers · Encrypted KV sessions · Zero client-side secrets
          </p>
        </div>
      </div>,
      { landing: true }
    )
  )

  router.get('/login', (c) => c.redirect('/auth/login'))

  router.get('/callback/plugin', async (c) => {
    const code = c.req.query('code')
    const error = c.req.query('error')

    if (error) {
      logSafeError('page.plugin.oauth', error, {
        requestId: c.get('requestId'),
        description: c.req.query('error_description')?.slice(0, 100),
      })
      return c.text(SAFE_AUTH_ERROR, 400)
    }

    let sessionEnc: string
    let cookieSign: string
    try {
      if (!c.env.SESSIONS_KV) return c.text(SAFE_CONFIG_ERROR, 503)
      ;({ sessionEnc, cookieSign } = requireSecrets(c.env))
    } catch {
      return c.text(SAFE_CONFIG_ERROR, 503)
    }

    let sessionId: string | undefined
    if (code) {
      try {
        sessionId = await handleOAuthCallback(c)
      } catch (err) {
        logSafeError('page.plugin.callback', err, { requestId: c.get('requestId') })
        return c.text(SAFE_AUTH_ERROR, 500)
      }
    } else {
      const cookie = await getSignedCookie(c, cookieSign, '__Secure-session_id')
      sessionId = typeof cookie === 'string' ? cookie : undefined
    }

    if (!sessionId) return c.redirect('/auth/login')

    try {
      const sessionService = new SessionService(c.env.SESSIONS_KV, sessionEnc, c.env)
      const session = await sessionService.getSession(sessionId)
      if (!session) return c.redirect('/auth/login')

      const tab = c.req.query('tab') ?? 'dashboard'
      const activeTab = VALID_TABS.has(tab) ? tab : 'dashboard'

      const data = await loadDashboardData(c.env, session.userId, session.accessToken)
      const userName = data.user
        ? `${data.user.firstName ?? ''} ${data.user.lastName ?? ''}`.trim() || data.user.username
        : 'Member'

      return c.render(
        <div class="tab-panels">
          <section
            class={`tab-panel ${activeTab === 'dashboard' ? 'active' : ''}`}
            data-tab="dashboard"
            id="panel-dashboard"
          >
            <DashboardView data={data} />
          </section>
          <section
            class={`tab-panel ${activeTab === 'accounts' ? 'active' : ''}`}
            data-tab="accounts"
            id="panel-accounts"
          >
            <AccountsView data={data} />
          </section>
          <section
            class={`tab-panel ${activeTab === 'transactions' ? 'active' : ''}`}
            data-tab="transactions"
            id="panel-transactions"
          >
            <TransactionsView data={data} />
          </section>
          <section
            class={`tab-panel ${activeTab === 'insights' ? 'active' : ''}`}
            data-tab="insights"
            id="panel-insights"
          >
            <InsightsView data={data} />
          </section>
          <section
            class={`tab-panel ${activeTab === 'goals' ? 'active' : ''}`}
            data-tab="goals"
            id="panel-goals"
          >
            <GoalsView data={data} />
          </section>
          <section
            class={`tab-panel ${activeTab === 'documents' ? 'active' : ''}`}
            data-tab="documents"
            id="panel-documents"
          >
            <DocumentsView data={data} />
          </section>
        </div>,
        {
          title: `Banno Pulse — ${activeTab}`,
          activeTab,
          userName,
          embed: isEmbedRequest(c),
          pluginHeight: parsePluginInitialHeight(c.env.PLUGIN_INITIAL_HEIGHT),
        }
      )
    } catch (err) {
      logSafeError('page.plugin.render', err, { requestId: c.get('requestId') })
      return c.text(SAFE_CONFIG_ERROR, 503)
    }
  })

  router.get('/dashboard', (c) => c.redirect('/callback/plugin'))

  return router
}
