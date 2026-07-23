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
