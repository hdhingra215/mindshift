import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '../hooks/use-auth'
import { FormAlert } from './form-alert'

/** Google's mark, inline — the icon set carries no brand logos and a whole
 * dependency for one 4-path SVG is not worth it. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="size-4 shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.34A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.71a5.4 5.4 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.09l3.01-2.34Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  )
}

type ContinueWithGoogleProps = {
  /** Where the player was headed; survives the round trip via `?redirect=`. */
  redirectTo?: string
  /** Error carried back on the callback URL (cancelled or failed consent). */
  callbackError?: string
}

/**
 * The Google half of the auth page: a divider and one secondary action, below
 * the email form so the primary path stays primary.
 *
 * Once the redirect is requested the button locks and keeps its pending state
 * for the rest of this document's life — the navigation is imminent, so
 * re-enabling it would only invite a second, competing OAuth start.
 */
export function ContinueWithGoogle({
  redirectTo,
  callbackError,
}: ContinueWithGoogleProps) {
  const { signInWithGoogle } = useAuth()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    if (pending) return
    setError(null)
    setPending(true)

    const result = await signInWithGoogle(redirectTo)
    if (result.error) {
      // The redirect never happened — hand the button back.
      setError(result.error)
      setPending(false)
    }
  }

  const message = error ?? callbackError ?? null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {message ? <FormAlert message={message} /> : null}

      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={handleClick}
        disabled={pending}
        aria-busy={pending}
        className="w-full"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Taking you to Google…
          </>
        ) : (
          <>
            <GoogleMark />
            Continue with Google
          </>
        )}
      </Button>
    </div>
  )
}
