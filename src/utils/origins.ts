/** Hostname / origin allowlist helpers for CORS and CSRF. */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

export function parseOriginHostname(origin: string): string | null {
  try {
    const url = new URL(origin)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.hostname.toLowerCase()
  } catch {
    return null
  }
}

/** True for exact localhost loopback hosts only (not *.localhost.evil.com). */
export function isLocalDevOrigin(origin: string): boolean {
  const hostname = parseOriginHostname(origin)
  if (!hostname) return false
  return LOCAL_HOSTS.has(hostname)
}

/**
 * Credentialed CORS allowlist — exact ENV_URI origin only (+ localhost in dev).
 * Wildcards for *.banno.com / *.jackhenry.com are intentionally NOT allowed.
 */
export function isAllowedExternalOrigin(
  origin: string | undefined,
  envUri: string,
  options?: { allowLocalhost?: boolean }
): boolean {
  if (!origin) return false

  let envOrigin: string
  try {
    envOrigin = new URL(envUri).origin
  } catch {
    return false
  }

  if (origin === envOrigin) return true

  if (options?.allowLocalhost && isLocalDevOrigin(origin)) return true

  return false
}

/**
 * CSRF: require Origin; allow same-origin, ENV_URI, or localhost in development.
 * Missing Origin is rejected.
 */
export function isAllowedCsrfOrigin(
  origin: string | undefined,
  requestOrigin: string,
  envUri: string,
  options?: { allowLocalhost?: boolean }
): boolean {
  if (!origin) return false
  if (origin === requestOrigin) return true
  return isAllowedExternalOrigin(origin, envUri, options)
}

export function assertValidRedirectUri(
  redirectUri: string,
  environment?: string
): void {
  let parsed: URL
  try {
    parsed = new URL(redirectUri)
  } catch {
    throw new Error('REDIRECT_URI is not a valid URL')
  }

  const isProd = (environment ?? 'production').toLowerCase() === 'production'
  const host = parsed.hostname.toLowerCase()
  const isLocal = LOCAL_HOSTS.has(host) || host.endsWith('.local')

  if (isProd) {
    if (parsed.protocol !== 'https:') {
      throw new Error('REDIRECT_URI must use HTTPS in production')
    }
    if (isLocal) {
      throw new Error('REDIRECT_URI must not be localhost in production')
    }
  }

  if (!parsed.pathname.includes('/callback')) {
    throw new Error('REDIRECT_URI must point to an OAuth callback path')
  }
}
