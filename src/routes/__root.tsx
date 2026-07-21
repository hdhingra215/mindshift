import { createRootRoute, Outlet } from '@tanstack/react-router'
import { AppLayout } from '@/app/layout/app-layout'

/**
 * Root route + root layout.
 *
 * Wraps every route in the global AppLayout shell and renders the active
 * route via <Outlet />. Route-level pending / error / not-found fallbacks are
 * configured on the router instance.
 */
function RootLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
})
