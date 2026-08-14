import { useState, type ReactElement } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '../hooks/use-auth'
import {
  OAUTH_PROVIDER_LABELS,
  OAUTH_PROVIDER_ORDER,
  type OAuthProvider,
} from '../lib/oauth-providers'
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

/** GitHub's mark, inline for the same reason. Single-colour, so it takes
 * `currentColor` and follows the button's text in both themes. */
function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.07-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A7.995 7.995 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
      />
    </svg>
  )
}

/** Keyed by provider id, so a new provider cannot ship without a mark. */
const PROVIDER_MARKS: Record<OAuthProvider, () => ReactElement> = {
  google: GoogleMark,
  github: GitHubMark,
}

/**
 * One surface, shared by every provider button — equal prominence by
 * construction rather than by two declarations kept in sync.
 *
 * Light and theme-invariant on purpose, which is why these are literals and not
 * design tokens. Google's mark is a fixed four-colour asset that needs a light,
 * high-contrast container, so this surface must stay light even after the
 * planned light theme ships and the card beneath it turns white — which is what
 * the border is for. A themeable token would flip with the card and strand the
 * mark; that makes these brand constants, not palette decisions.
 *
 * Against the dark card it reads as the most prominent thing on the screen,
 * which is the intent: the providers lead, the email form follows.
 */
const PROVIDER_SURFACE =
  'w-full border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-100'

type OAuthProviderButtonsProps = {
  /** Where the player was headed; survives the round trip via `?redirect=`. */
  redirectTo?: string
  /** Error carried back on the callback URL (cancelled or failed consent). */
  callbackError?: string
}

/**
 * The provider half of the auth pages, and the primary way in: one full-width
 * action per provider at the top of the card on a shared light surface, then
 * the divider that hands off to the email form below.
 *
 * Every provider carries the same visual weight — there is no recommended one,
 * so ranking them would be a lie about the product. The email form is the
 * fallback and reads that way (its submit is outlined, not filled).
 *
 * Once a redirect is requested every button locks and keeps that state for the
 * rest of this document's life — the navigation is imminent, so re-enabling
 * would only invite a second, competing OAuth start. `pending` holds the chosen
 * provider rather than a boolean so the spinner names where the player is going
 * while the others simply disable.
 */
export function OAuthProviderButtons({
  redirectTo,
  callbackError,
}: OAuthProviderButtonsProps) {
  const { signInWithOAuth } = useAuth()
  const [pending, setPending] = useState<OAuthProvider | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleClick(provider: OAuthProvider) {
    if (pending) return
    setError(null)
    setPending(provider)

    const result = await signInWithOAuth(provider, redirectTo)
    if (result.error) {
      // The redirect never happened — hand the buttons back.
      setError(result.error)
      setPending(null)
    }
  }

  const message = error ?? callbackError ?? null

  return (
    <div className="flex flex-col gap-6">
      {message ? <FormAlert message={message} /> : null}

      <div className="flex flex-col gap-3">
        {OAUTH_PROVIDER_ORDER.map((provider) => {
          const Mark = PROVIDER_MARKS[provider]
          const label = OAUTH_PROVIDER_LABELS[provider]
          const isPending = pending === provider

          return (
            <Button
              key={provider}
              type="button"
              size="lg"
              onClick={() => handleClick(provider)}
              disabled={pending !== null}
              aria-busy={isPending}
              className={PROVIDER_SURFACE}
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Taking you to {label}…
                </>
              ) : (
                <>
                  <Mark />
                  Continue with {label}
                </>
              )}
            </Button>
          )
        })}
      </div>

      {/* Hands off to the email form below, so it follows the providers. */}
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  )
}
