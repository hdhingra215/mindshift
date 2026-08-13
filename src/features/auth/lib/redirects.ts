/** Absolute callback URL for a given app path (used by Supabase email links). */
export function callbackUrl(path: string): string {
  return `${window.location.origin}${path}`
}

/**
 * Only allow internal, same-origin redirect targets. Prevents an open-redirect
 * via a crafted `?redirect=` value; anything not a local path falls back to the
 * dashboard.
 */
export function safeInternalPath(
  candidate: string | undefined,
  fallback = '/dashboard',
): string {
  if (!candidate) return fallback
  // Must be a root-relative path and not a protocol-relative "//host".
  if (candidate.startsWith('/') && !candidate.startsWith('//')) {
    return candidate
  }
  return fallback
}

/**
 * Absolute URL Supabase sends the browser back to after a Google round trip.
 *
 * Always the login route: it is public, so a cancelled or failed consent lands
 * somewhere that can *explain* itself instead of bouncing off a route guard,
 * and a successful one is forwarded on by `redirectIfAuthenticated` using the
 * preserved `redirect` intent. Built from `window.location.origin`, so the same
 * code produces the production and the localhost callback — nothing hardcoded.
 * The resulting origin must be allow-listed in Supabase → Auth → URL config.
 */
export function oauthCallbackUrl(intendedPath?: string): string {
  const next = encodeURIComponent(safeInternalPath(intendedPath))
  return callbackUrl(`/auth/login?redirect=${next}`)
}
