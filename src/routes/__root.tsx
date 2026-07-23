import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { AppLayout } from '@/app/layout/app-layout'
import type { AuthContextValue } from '@/features/auth'

/**
 * Router context — dependency-injected into every route's `beforeLoad`.
 * Auth lives here so route guards (requireAuth / redirectIfAuthenticated) can
 * read the resolved session synchronously. The live value is supplied by
 * <RouterProvider context> in app-router.
 */
export type RouterContext = {
  auth: AuthContextValue
}

function RootLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})
