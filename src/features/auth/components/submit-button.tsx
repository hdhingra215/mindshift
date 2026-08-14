import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type SubmitButtonProps = {
  pending: boolean
  children: ReactNode
  /** Label announced (and shown) while the action is in flight. */
  pendingLabel: string
  /**
   * Visual weight. Filled by default — right where this form *is* the page's
   * one action (forgotten password, password reset). Login and signup pass
   * `outline`: there the OAuth providers lead and email is the fallback, so a
   * second filled button would flatten the hierarchy.
   */
  variant?: 'default' | 'outline'
}

/**
 * Submit button whose own surface becomes the loading state
 * (InteractionPrinciples §3) — no disconnected spinner elsewhere. Disabled and
 * aria-busy while pending; the accessible label reflects the pending state.
 */
export function SubmitButton({
  pending,
  children,
  pendingLabel,
  variant = 'default',
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      variant={variant}
      size="lg"
      disabled={pending}
      aria-busy={pending}
      className="w-full"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
