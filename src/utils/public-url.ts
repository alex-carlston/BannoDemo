/** True when REDIRECT_URI points at a loopback / .local host (local Garden testing). */
export function isLocalRedirectUri(redirectUri: string): boolean {
  try {
    const host = new URL(redirectUri).hostname
    return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')
  } catch {
    return false
  }
}

/** True when the incoming request appears to come from Banno Online / Garden. */
export function isBannoEmbedRequest(c: { req: { header: (name: string) => string | undefined } }): boolean {
  const referer = c.req.header('Referer') ?? ''
  const origin = c.req.header('Origin') ?? ''
  const source = `${referer} ${origin}`.toLowerCase()
  return (
    source.includes('banno.com') ||
    source.includes('garden-fi.com') ||
    source.includes('jackhenry.com')
  )
}

export function isPublicHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && !isLocalRedirectUri(url)
  } catch {
    return false
  }
}
