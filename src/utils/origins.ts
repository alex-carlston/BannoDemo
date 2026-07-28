/** Hostname / origin allowlist helpers for CORS and CSRF. */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

function hostnameMatchesSuffix(hostname: string, suffix: string): boolean {
  return hostname === suffix || hostname.endsWith(`.${suffix}`)
}

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
 * Allowed embed / FI origins:
 * - Exact ENV_URI origin
 * - *.banno.com
 * - *.jackhenry.com
 * - localhost / 127.0.0.1 in development
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

  const hostname = parseOriginHostname(origin)
  if (!hostname) return false

  if (hostnameMatchesSuffix(hostname, 'banno.com')) return true
  if (hostnameMatchesSuffix(hostname, 'jackhenry.com')) return true

  if (options?.allowLocalhost && isLocalDevOrigin(origin)) return true

  return false
}

/** CSRF: same-origin, allowed FI/Banno origins, or missing Origin (same-site navigations). */
export function isAllowedCsrfOrigin(
  origin: string | undefined,
  requestOrigin: string,
  envUri: string,
  options?: { allowLocalhost?: boolean }
): boolean {
  if (!origin) return true
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
