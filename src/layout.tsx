import type { LayoutProps } from './types'

const TABS = [
  { id: 'dashboard', label: 'Overview', icon: '◈' },
  { id: 'accounts', label: 'Accounts', icon: '◇' },
  { id: 'transactions', label: 'Activity', icon: '◎' },
  { id: 'insights', label: 'Insights', icon: '◉' },
  { id: 'goals', label: 'Goals', icon: '★' },
  { id: 'documents', label: 'Documents', icon: '▣' },
]

const VIEWPORT =
  'width=device-width, initial-scale=1.0, viewport-fit=cover'

function LogoutForm({ className, label }: { className?: string; label: string }) {
  return (
    <form method="post" action="/logout" class={className ?? 'inline-form'}>
      <button type="submit" class="logout-link" title="Sign out">
        {label}
      </button>
    </form>
  )
}

export const Layout = ({
  children,
  title = 'Banno Pulse',
  activeTab,
  userName,
  landing,
  embed,
  pluginHeight = 600,
}: LayoutProps) => {
  if (landing) {
    return (
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content={VIEWPORT} />
          <title>{title}</title>
          <link
            href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap"
            rel="stylesheet"
          />
          <link href="/styles.css" rel="stylesheet" />
        </head>
        <body class="landing-body">{children}</body>
      </html>
    )
  }

  const heightClass = `embed-h-${pluginHeight}`
  const htmlClass = embed ? `embed-mode ${heightClass}` : undefined

  return (
    <html lang="en" class={htmlClass}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content={VIEWPORT} />
        <meta name="color-scheme" content="light dark" />
        <title>{title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link href="/styles.css" rel="stylesheet" />
        <script src="/tabs.js" defer />
      </head>
      <body class={embed ? 'embed-body' : undefined}>
        <div class="app-shell">
          <header class="app-header">
            <div class="brand">
              <div class="brand-mark">P</div>
              <div>
                <h1 class="brand-title">Banno Pulse</h1>
                <p class="brand-sub">Financial Wellness Command Center</p>
              </div>
            </div>
            {userName && (
              <div class="user-chip">
                <span class="user-avatar">{userName.charAt(0).toUpperCase()}</span>
                <span class="user-name">{userName}</span>
                {embed && (
                  <LogoutForm className="inline-form embed-logout" label="↗" />
                )}
              </div>
            )}
          </header>

          {activeTab && (
            <nav class="tab-nav" aria-label="Dashboard sections">
              {TABS.map((tab) => (
                <a
                  key={tab.id}
                  href={`/callback/plugin?tab=${tab.id}`}
                  class={`tab-link ${activeTab === tab.id ? 'active' : ''}`}
                  data-tab={tab.id}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                  title={tab.label}
                >
                  <span class="tab-icon" aria-hidden="true">
                    {tab.icon}
                  </span>
                  <span class="tab-label">{tab.label}</span>
                </a>
              ))}
            </nav>
          )}

          <main class="app-main">{children}</main>

          {!embed && (
            <footer class="app-footer">
              <span>Edge-deployed on Cloudflare Workers</span>
              <span class="sep">·</span>
              <span>Secured with OAuth 2.0 + PKCE</span>
              <span class="sep">·</span>
              <LogoutForm label="Sign out" />
            </footer>
          )}
        </div>
      </body>
    </html>
  )
}

export const LandingLayout = ({ children, title = 'Banno Pulse' }: LayoutProps) => (
  <Layout landing title={title}>
    {children}
  </Layout>
)
