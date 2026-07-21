import type { ErrorComponentProps } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

/**
 * Router-level error boundary fallback. Rendered when a route's component or
 * loader throws. Complements the app-level ErrorBoundary (which catches
 * everything above the router). Token-driven only.
 */
export function RouteError({ reset }: ErrorComponentProps) {
  return (
    <div
      role="alert"
      className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground"
    >
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          This section failed to load. Try again — if it persists, reload the page.
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
