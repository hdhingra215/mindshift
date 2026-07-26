import type { GlowTone } from '@/components/motion'
import { cn } from '@/lib/utils'

/**
 * The ordinal's accent, and the hairline that fades out of it.
 *
 * Each chapter is lit by the accent that already owns the mental state that
 * chapter is about — purple for the brand's own premise, blue for the moment
 * of catching something, orange for progress, yellow for what you should be
 * wary of. No accent leaves its documented role (DesignSystem §1); the page
 * simply visits more than one of them as it descends.
 */
const TONE_CLASS: Record<GlowTone, { text: string; rule: string }> = {
  brand: { text: 'text-brand', rule: 'from-brand/50' },
  reward: { text: 'text-reward', rule: 'from-reward/50' },
  success: { text: 'text-success', rule: 'from-success/50' },
  warning: { text: 'text-warning', rule: 'from-warning/50' },
  destructive: { text: 'text-destructive', rule: 'from-destructive/50' },
}

type ChapterMarkerProps = {
  ordinal: string
  label: string
  tone?: GlowTone
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
export function ChapterMarker({ ordinal, label, tone = 'brand', className }: ChapterMarkerProps) {
  const accent = TONE_CLASS[tone]

  return (
    <p
      className={cn(
        'flex items-center gap-3 font-mono text-xs tracking-[0.22em] text-muted-foreground uppercase',
        className
      )}
    >
      <span className={accent.text}>{ordinal}</span>
      <span
        aria-hidden="true"
        className={cn('h-px w-8 bg-gradient-to-r to-border', accent.rule)}
      />
      {label}
    </p>
  )
}
