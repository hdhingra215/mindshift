import type { ReactNode } from 'react'
import { ErrorBoundary } from '@/app/errors/error-boundary'
import { AppSidebar } from './app-sidebar'
import { BottomNav } from './bottom-nav'
import { TopBar } from './top-bar'
import { PageTransition } from './page-transition'
import { PageError } from './page-error'

type AppShellProps = {
  children: ReactNode
}

/**
 * Authenticated application shell.
 *
 * Responsive frame: persistent sidebar (desktop) / bottom nav (mobile), a
 * sticky top bar, and a centered, spacious page container. Route content is
 * wrapped in a content-scoped ErrorBoundary (so a page crash keeps the chrome
 * and navigation) plus a subtle page transition.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh bg-background">
      <a
        href="#main-content"
        className="sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:not-sr-only focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main id="main-content" className="flex-1 pb-20 md:pb-0">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
            <ErrorBoundary fallback={(reset) => <PageError onReset={reset} />}>
              <PageTransition>{children}</PageTransition>
            </ErrorBoundary>
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
