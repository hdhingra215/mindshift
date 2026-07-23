import { redirect } from '@tanstack/react-router'
import type { AuthContextValue } from '../types'

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

/** Keep signed-in players out of the public auth pages. */
export function redirectIfAuthenticated(auth: AuthContextValue): void {
  if (auth.status === 'authenticated') {
    throw redirect({ to: '/dashboard' })
  }
}
