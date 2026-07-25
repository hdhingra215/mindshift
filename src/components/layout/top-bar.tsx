import { Link, useRouterState } from '@tanstack/react-router'
import { Logo } from '@/components/shared/logo'
import { NAV_ITEMS } from './nav-items'
import { UserMenu } from './user-menu'

/**
 * Sticky top bar.
 * - Mobile: brand (left) + account menu (right); navigation lives in the bottom nav.
 * - Desktop: current-section label (left); the account menu lives in the sidebar.
 *
 * A flat, four-destination app doesn't warrant a breadcrumb trail, so the bar
 * uses a single wayfinding section label instead — calmer, one focal point.
 */
export function TopBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const active = NAV_ITEMS.find(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
  )

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur supports-backdrop-filter:bg-background/70 md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          to="/dashboard"
          aria-label="MindShift dashboard"
          className="group/logo rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:hidden"
        >
          <Logo />
        </Link>
        {active ? (
          <h1 className="hidden truncate font-heading text-base font-semibold text-foreground md:block">
            {active.label}
          </h1>
        ) : null}
      </div>

      <div className="md:hidden">
        <UserMenu variant="compact" />
      </div>
    </header>
  )
}
