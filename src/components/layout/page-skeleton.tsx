import { Skeleton } from '@/components/ui/skeleton'

/**
 * In-shell content placeholder for route loading (graceful route loading,
 * InteractionPrinciples §5). Mirrors the general shape of a page so the layout
 * assembles rather than pops; the shell chrome stays put around it.
 */
export function PageSkeleton() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  )
}
