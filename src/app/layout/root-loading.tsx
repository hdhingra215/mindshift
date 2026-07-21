import { Loader2 } from 'lucide-react'

/**
 * Full-screen loading fallback for the root Suspense boundary.
 * Token-driven; respects reduced-motion via the animate-spin utility being
 * the only motion and easily overridable at the global CSS level.
 */
export function RootLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-dvh items-center justify-center bg-background text-muted-foreground"
    >
      <Loader2 className="size-6 animate-spin" aria-hidden="true" />
      <span className="sr-only">Loading…</span>
    </div>
  )
}
