import { cn } from '@/lib/utils'
import { APP_NAME } from '@/constants/app'

type LogoProps = {
  className?: string
  /** Render as a plain wordmark without the accent mark (e.g. dense contexts). */
  showMark?: boolean
}

/**
 * MindShift wordmark. The brand concept is a "shift" in thinking — expressed
 * with a single terracotta accent on the pivot letter, no cartoon brain.
 * Decorative; screen readers get the app name via the text itself.
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
    </span>
  )
}
