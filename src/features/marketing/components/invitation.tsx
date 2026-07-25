import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

import { AnimatedButton, MagneticButton, SpotlightContainer } from '@/components/motion'
import { cn } from '@/lib/utils'

type InvitationProps = {
  isAuthed: boolean
  /** True once the visitor has played the teaser above. */
  hasPlayed: boolean
  /** True if they caught the bias rather than falling for it. */
  caught: boolean
  className?: string
}

/**
 * The close.
 *
 * Its argument is whatever the visitor just did, not a pitch: if they played
 * the teaser, the copy counts what they found and what is left. Eleven unlit
 * points are sitting a section above, so "there are eleven more" is a statement
 * about the page they are on rather than a marketing claim.
 *
 * No urgency, no scarcity, no counter, no "trusted by" (InteractionPrinciples
 * §13). One primary action, magnetic because this is the single most important
 * button on the page, and one quiet alternative for people who already have an
 * account.
 */
export function Invitation({ isAuthed, hasPlayed, caught, className }: InvitationProps) {
  const headline = hasPlayed
    ? caught
      ? 'You caught one. Eleven are still dark.'
      : 'One down. Eleven still have you.'
    : 'Your mind has twelve of these. You can see none of them.'

  const body = hasPlayed
    ? 'That was one scenario, one bias, twenty seconds. The full game runs the same loop across money, work, health, relationships and the things you read — until catching them stops being work.'
    : 'Twelve biases, hundreds of situations, and a map of your own blind spots that gets less dark every week. A few minutes a day is the whole trick.'

  return (
    <SpotlightContainer
      className={cn(
        'rounded-3xl border border-border bg-card/60 px-6 py-14 text-center depth-overlay sheen-top backdrop-blur-sm sm:px-12 sm:py-20',
        className
      )}
      tone={caught ? 'success' : 'brand'}
    >
      <h2 className="mx-auto max-w-2xl font-heading text-3xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
        {headline}
      </h2>

      <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
        {body}
      </p>

      <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <MagneticButton asChild className="w-full sm:w-auto" size="lg">
          <Link to={isAuthed ? '/dashboard' : '/auth/signup'}>
            {isAuthed ? 'Continue training' : 'Start training'}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </MagneticButton>

        {isAuthed ? null : (
          <AnimatedButton asChild className="w-full sm:w-auto" size="lg" variant="ghost">
            <Link to="/auth/login">I already have an account</Link>
          </AnimatedButton>
        )}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Free to start · No card · Your first real scenario in about two minutes
      </p>
    </SpotlightContainer>
  )
}
