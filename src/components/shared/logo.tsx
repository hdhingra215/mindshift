import { cn } from '@/lib/utils'
import { APP_NAME } from '@/constants/app'

type LogoProps = {
  className?: string
  /** Render as a plain wordmark without the accent mark (e.g. dense contexts). */
  showMark?: boolean
}

/**
 * MindShift wordmark. The brand concept is a "shift" in thinking — expressed
 * with a single brand accent on the pivot letter, no cartoon brain.
 * Decorative; screen readers get the app name via the text itself.
 *
 * The closing period is part of the mark, not punctuation: it is the full stop
 * at the end of a thought, and it renders in the foreground neutral in every
 * context so the accent letter stays the only coloured glyph.
 */
export function Logo({ className, showMark = true }: LogoProps) {
  return (
    <span
      className={cn(
        'inline-flex items-baseline font-heading text-lg font-semibold tracking-tight text-foreground',
        className,
      )}
    >
      {APP_NAME.slice(0, -1)}
      {showMark ? (
        <span
          className="text-primary transition-transform duration-300 ease-out group-hover/logo:-translate-y-0.5"
          aria-hidden="true"
        >
          {APP_NAME.slice(-1)}
        </span>
      ) : (
        APP_NAME.slice(-1)
      )}
      <span aria-hidden="true" className="text-foreground">
        .
      </span>
    </span>
  )
}
