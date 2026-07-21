import { createRouter } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'
import { RootLoading } from '@/app/layout/root-loading'
import { NotFound } from './not-found'
import { RouteError } from './route-error'

/**
 * Router instance + global route boundaries.
 *
 * - defaultPendingComponent  → route loading boundary (Suspense/pending)
 * - defaultErrorComponent    → route error boundary
 * - defaultNotFoundComponent → 404
 *
 * No auth, data, or context wiring yet — pure routing infrastructure.
 */
export const router = createRouter({
  routeTree,
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
