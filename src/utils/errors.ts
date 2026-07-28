/** Safe, user-facing messages — never echo upstream or internal details. */

export const SAFE_AUTH_ERROR = 'Authentication failed. Please try signing in again.'
export const SAFE_SERVER_ERROR = 'Something went wrong. Please try again.'
export const SAFE_RATE_LIMIT = 'Too many requests. Please wait a minute and try again.'
export const SAFE_CONFIG_ERROR = 'Service temporarily unavailable.'
export const SAFE_VALIDATION_ERROR = 'Invalid request.'

export function logSafeError(
  context: string,
  err: unknown,
  meta?: Record<string, string | undefined>
): void {
  const message = err instanceof Error ? err.message : String(err)
  console.error(context, {
    message: message.slice(0, 300),
    ...meta,
  })
}
