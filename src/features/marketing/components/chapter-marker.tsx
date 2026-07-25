import { cn } from '@/lib/utils'

type ChapterMarkerProps = {
  ordinal: string
  label: string
  className?: string
}

/**
 * The chapter label that opens each section.
 *
 * The landing page is structured as a descent through numbered chapters rather
 * than a stack of marketing blocks. This marker is what makes that structure
 * legible — it tells the reader where they are in the story and that there is
 * more of it below.
 *
 * Presentational only. The section's real heading follows it, so the document
 * outline is carried by the `h2`, not by this.
 */
export function ChapterMarker({ ordinal, label, className }: ChapterMarkerProps) {
  return (
    <p
      className={cn(
        'flex items-center gap-3 font-mono text-xs tracking-[0.22em] text-muted-foreground uppercase',
        className
      )}
    >
      <span className="text-brand">{ordinal}</span>
      <span aria-hidden="true" className="h-px w-8 bg-border" />
      {label}
    </p>
  )
}
