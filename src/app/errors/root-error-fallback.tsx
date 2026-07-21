import { Button } from '@/components/ui/button'

type RootErrorFallbackProps = {
  onReset: () => void
}

/**
 * Fallback UI rendered when the root ErrorBoundary catches an error.
 * Token-driven only — no hardcoded colors.
 */
export function RootErrorFallback({ onReset }: RootErrorFallbackProps) {
  return (
    <div
      role="alert"
      className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground"
    >
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          An unexpected error occurred. Try again — if it keeps happening, please reload the page.
        </p>
      </div>
      <Button onClick={onReset}>Try again</Button>
    </div>
  )
}
