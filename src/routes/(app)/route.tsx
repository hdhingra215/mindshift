import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AppShell } from '@/components/layout/app-shell'
import { requireAuth } from '@/features/auth'

/**
 * Authenticated layout route for the (app) group.
 *
 * A single `beforeLoad` guard protects every child (dashboard, play, profile,
 * settings) — no per-route duplication — and the shared AppShell wraps them,
 * so navigating between sections keeps the chrome mounted (only the Outlet
 * swaps). `(app)` is a pathless group, so child URLs stay /dashboard, /play, …
 */
function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

export const Route = createFileRoute('/(app)')({
  beforeLoad: ({ context, location }) => requireAuth(context.auth, location.href),
  component: AppLayout,
})
