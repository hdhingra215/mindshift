import { useEffect } from 'react'
import { RouterProvider } from '@tanstack/react-router'
import { AuthLoadingScreen, useAuth } from '@/features/auth'
import { router } from './router'

/**
 * Binds live auth state into the router.
 *
 * - While the session is being restored (`initializing`), the router is held
 *   back and the auth loading screen is shown — so guards only ever run once
 *   auth has resolved.
 * - The current auth value is injected as router context, so `beforeLoad`
 *   guards read a fresh session.
 * - On any auth change (login, logout, cross-tab sign-out), we invalidate the
 *   router so matched routes re-run their guards against the new state.
 */
export function AppRouter() {
  const auth = useAuth()

  useEffect(() => {
    if (auth.status === 'initializing') return
    void router.invalidate()
  }, [auth.status, auth.user?.id])

  if (auth.status === 'initializing') {
    return <AuthLoadingScreen />
  }

  return <RouterProvider router={router} context={{ auth }} />
}
