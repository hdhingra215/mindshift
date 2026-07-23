import { createRouter } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'
import { RootLoading } from '@/app/layout/root-loading'
import type { AuthContextValue } from '@/features/auth'
import { NotFound } from './not-found'
import { RouteError } from './route-error'

/**
 * Router instance + global route boundaries.
 *
 * - defaultPendingComponent  → route loading boundary (Suspense/pending)
 * - defaultErrorComponent    → route error boundary
 * - defaultNotFoundComponent → 404
 *
 * `context.auth` is a placeholder here; the live auth value is injected by
 * <RouterProvider context={{ auth }}> in app-router, and refreshed on auth
 * changes via router.invalidate() so guards re-run.
 */
export const router = createRouter({
  routeTree,
  context: {
    auth: undefined as unknown as AuthContextValue,
  },
  defaultPendingComponent: RootLoading,
  defaultErrorComponent: RouteError,
  defaultNotFoundComponent: NotFound,
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
