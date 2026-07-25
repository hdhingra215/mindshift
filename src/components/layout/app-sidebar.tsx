import { Link, useRouterState } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/shared/logo'
import { NAV_ITEMS } from './nav-items'
import { UserMenu } from './user-menu'

/**
 * Persistent desktop sidebar (md+). Logo → nav → account menu, top to bottom.
 * Hidden on mobile/tablet, where the bottom nav takes over.
 */
export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-16 items-center px-5">
        <Link
          to="/dashboard"
          aria-label="MindShift dashboard"
          className="group/logo rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo />
        </Link>
      </div>

      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.to || pathname.startsWith(`${item.to}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                active
                  ? 'bg-primary/12 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-3">
        <UserMenu variant="full" />
      </div>
    </aside>
  )
}
