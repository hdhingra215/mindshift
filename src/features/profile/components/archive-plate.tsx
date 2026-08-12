import type { ReactNode } from 'react'

import { RevealContainer } from '@/components/motion'
import { cn } from '@/lib/utils'

type ArchivePlateProps = {
  /** The plate's index in the archive. Etched, like a catalogue number. */
  index: number
  title: string
  /** One line naming what this plate holds. Never a subtitle for its own sake. */
  standfirst?: string
  children: ReactNode
  className?: string
}

/**
 * One plate in the archive.
 *
 * The archive is a long room rather than a scrolling dashboard, so its divisions
 * have to read as *places within one object* — not as sections of a document and
 * certainly not as cards. A catalogue numeral, a hairline that runs out to the
 * edge, and the heading sitting on that line does the whole job: it says
 * "another face of the same instrument" instead of "another panel".
 *
 * ── Accessibility ───────────────────────────────────────────────────────────
 * Every plate is a real `<section>` labelled by its own `<h2>`, so the archive
 * has a navigable outline and a screen-reader user can jump between plates
 * without reading through them. The numeral is decorative and hidden — it
 * duplicates position, which the landmark order already carries.
 *
 * Reveals are scroll-held here, unlike the dashboard: the archive is taller than
 * a viewport, and content that animated in before it was reachable would have
 * finished by the time anyone saw it.
 *
 * The `<section>` is this component's own element rather than `RevealContainer`
 * rendered `as="section"` — the primitive forwards nothing but `className` and
 * passes every other prop to the reveal hook, so an `aria-labelledby` handed to
 * it would be silently dropped. Structure outside, motion inside.
 */
export function ArchivePlate({
  index,
  title,
  standfirst,
  children,
  className,
}: ArchivePlateProps) {
  const headingId = `archive-plate-${index}`

  return (
    <section aria-labelledby={headingId} className={cn('w-full', className)}>
      <RevealContainer distance="sm" duration="slow" revealOnScroll>
        <div className="flex items-baseline gap-3">
          <span
            aria-hidden="true"
            className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground tabular-nums"
          >
            {String(index).padStart(2, '0')}
          </span>
          <h2
            className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground uppercase"
            id={headingId}
          >
            {title}
          </h2>
          <span aria-hidden="true" className="h-px flex-1 bg-border/50" />
        </div>

        {standfirst ? (
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-pretty text-muted-foreground">
            {standfirst}
          </p>
        ) : null}

        <div className="mt-6">{children}</div>
      </RevealContainer>
    </section>
  )
}
