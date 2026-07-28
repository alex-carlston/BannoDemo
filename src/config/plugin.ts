/** Default iframe card-face height — must match Banno People plugin configuration. */
export const DEFAULT_PLUGIN_INITIAL_HEIGHT = 600

/** Parse PLUGIN_INITIAL_HEIGHT from Wrangler vars (Banno dashboard "Initial height"). */
export function parsePluginInitialHeight(value?: string): number {
  const parsed = parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed) || parsed < 200 || parsed > 1200) {
    return DEFAULT_PLUGIN_INITIAL_HEIGHT
  }
  // Snap to 50px steps so CSS embed-h-* classes apply (no inline styles).
  return Math.round(parsed / 50) * 50
}

/** True when the request is loading inside an iframe (Banno card face or expanded view). */
export function isEmbedRequest(c: {
  req: { header: (name: string) => string | undefined }
}): boolean {
  const secFetchDest = c.req.header('Sec-Fetch-Dest')?.toLowerCase()
  if (secFetchDest === 'iframe') return true

  const referer = c.req.header('Referer') ?? ''
  const origin = c.req.header('Origin') ?? ''
  const source = `${referer} ${origin}`.toLowerCase()
  return (
    source.includes('banno.com') ||
    source.includes('garden-fi.com') ||
    source.includes('jackhenry.com')
  )
}
