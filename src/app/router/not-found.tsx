import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

/**
 * Router 404 fallback. Rendered for any unmatched route.
 * Token-driven only.
 */
export function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The page you are looking for doesn&apos;t exist or has moved.
        </p>
      </div>
      <Button asChild>
        <Link to="/">Back home</Link>
      </Button>
    </div>
  )
}
