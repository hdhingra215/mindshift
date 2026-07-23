import { Logo } from '@/components/shared/logo'
import { RotatingMessage } from './rotating-message'
import { AUTH_LOADING_MESSAGES } from '../constants'

/**
 * Full-screen gate shown while the session is being restored on first load.
 * "The game is thinking" (InteractionPrinciples §5) — never a bare spinner.
 */
export function AuthLoadingScreen() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 text-center"
    >
      <Logo className="text-2xl" />
      <div className="flex flex-col items-center gap-4">
        <span
          className="size-1.5 animate-pulse rounded-full bg-primary"
          aria-hidden="true"
        />
        <RotatingMessage messages={AUTH_LOADING_MESSAGES} />
      </div>
      <span className="sr-only">Loading MindShift…</span>
    </div>
  )
}
