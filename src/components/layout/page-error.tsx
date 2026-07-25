import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

type PageErrorProps = {
  onReset: () => void
}

/**
 * In-shell content error fallback (InteractionPrinciples §6 — calm, never
 * blaming, always a way forward). Rendered inside the shell so navigation and
 * chrome survive a content-level crash; the player is never stranded.
 */
export function PageError({ onReset }: PageErrorProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 py-16 text-center"
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-5" aria-hidden="true" />
      </span>
      <div className="space-y-1.5">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          This section didn’t load
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Something slipped on our end — your progress is safe. Give it another go.
        </p>
      </div>
      <Button variant="outline" onClick={onReset}>
        Try again
      </Button>
    </div>
  )
}
