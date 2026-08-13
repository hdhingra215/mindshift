import { redirect } from '@tanstack/react-router'
import type { AuthContextValue } from '../types'
import { safeInternalPath } from './redirects'

/**
 * Route guards, consumed from `beforeLoad` via the router's auth context.
 *
 * Guards only run once auth has resolved (the app shows the auth loading
 * screen while `initializing`), so status here is always authenticated or
 * unauthenticated.
 */

/** Protect a route: bounce unauthenticated visitors to login, preserving intent. */
export function requireAuth(auth: AuthContextValue, href: string): void {
  if (auth.status !== 'authenticated') {
    throw redirect({ to: '/auth/login', search: { redirect: href } })
  }
}

/**
 * Keep signed-in players out of the public auth pages.
 *
 * `intendedPath` carries the destination a visitor was originally bounced from
 * (`?redirect=`), so an OAuth round trip that lands back on login forwards to
 * where the player was headed. Validated as internal to avoid open redirects.
 */
export function redirectIfAuthenticated(
  auth: AuthContextValue,
  intendedPath?: string,
): void {
  if (auth.status === 'authenticated') {
    throw redirect({ href: safeInternalPath(intendedPath) })
  }
}
