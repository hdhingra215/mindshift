import { useEffect, useRef, useState } from 'react'
import { Check, CornerDownRight } from 'lucide-react'

import { HoverGlow, RevealContainer } from '@/components/motion'
import { PHRASE, signal, useSignalOnMount } from '@/lib/feedback'
import {
  ANIME_EASE,
  DURATION,
  STAGGER,
  animate,
  prefersReducedMotion,
  stagger,
  useReducedMotion,
} from '@/lib/motion'
import { cn } from '@/lib/utils'

import {
  TEASER_BIAS_DEFINITION,
  TEASER_BIAS_NAME,
  TEASER_CHOICES,
  TEASER_PROMPT,
  TEASER_QUESTION,
  TEASER_REWRITE_NOTE,
} from '../constants'
import type { TeaserChoice, TeaserOutcome } from '../types'

type TrapTeaserProps = {
  /** Fired once, when the visitor commits to a choice. */
  onResolve: (outcome: TeaserOutcome) => void
  outcome: TeaserOutcome | null
  className?: string
}

/**
 * A real slice of gameplay — decide, reveal, understand — in about twenty
 * seconds and without an account.
 *
 * The reveal is the reason this section exists. Instead of explaining the
 * framing effect, the page *performs* it: once a choice is locked in, the two
 * options rewrite themselves into their opposite frames in place, and the
 * visitor watches two sentences they just compared turn out to be the same
 * sentence. Telling someone about a bias changes nothing; catching them in one
 * is the product.
 *
 * The rewrite is an Anime.js timeline (time-driven motion — the primary engine)
 * that fades each option out, swaps its text at the midpoint, and fades it back
 * with a short stagger, so the change reads as a deliberate act by the
 * interface rather than a re-render.
 *
 * Under reduced motion the swap is instantaneous and the note above it still
 * says exactly what changed — the insight never depended on the animation.
 */
export function TrapTeaser({ onResolve, outcome, className }: TrapTeaserProps) {
  const optionsRef = useRef<HTMLUListElement>(null)
  const reduced = useReducedMotion()
  const [showRewritten, setShowRewritten] = useState(false)

  const isResolved = outcome !== null

  // Drive the rewrite from the resolved state rather than the click handler, so
  // the animation and the rendered text can never disagree.
  useEffect(() => {
    if (!isResolved) return

    const list = optionsRef.current
    if (!list) {
      setShowRewritten(true)
      return
    }

    if (prefersReducedMotion()) {
      setShowRewritten(true)
      return
    }

    const labels = Array.from(list.querySelectorAll<HTMLElement>('[data-teaser-label]'))
    if (labels.length === 0) {
      setShowRewritten(true)
      return
    }

    const animation = animate(labels, {
      opacity: [1, 0, 1],
      /*
       * The blur is driven through a numeric custom property rather than a
       * `filter: blur(Npx)` string, so the engine interpolates a plain number
       * and the CSS below composes it. Animating the shorthand string means
       * relying on the engine's filter parsing; a number always works.
       */
      '--rewrite-blur': [0, 7, 0],
      duration: DURATION.celebrate,
      ease: ANIME_EASE.move,
      delay: stagger(STAGGER.base, { start: DURATION.slow }),
    })

    // Swap the text while the labels are at their most obscured, so the change
    // is never visible mid-word. Tracked explicitly rather than fired from an
    // animation callback so it is always cancellable on unmount.
    const swapAt = DURATION.slow + DURATION.celebrate / 2
    const timer = window.setTimeout(() => setShowRewritten(true), swapAt)

    return () => {
      window.clearTimeout(timer)
      animation.revert()
    }
  }, [isResolved])

  /*
   * This control commits in a single click — there is no separate submit — so
   * the two beats the pipeline asks for are *hover* and *commit* rather than
   * select-then-submit. Hovering an option is the selection feedback (a graze,
   * no vibration); clicking it is the commitment, and gets the same seating
   * mechanism the real game gives a locked answer. Firing a select *and* a
   * commit a few milliseconds apart would be two sounds for one act.
   */
  const handleChoose = (choice: TeaserChoice) => {
    if (isResolved) return
    signal('answer.commit')
    onResolve({ choice, caught: choice.isCatch })
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="rounded-2xl border border-border bg-card/70 p-6 depth-raised sheen-top backdrop-blur-sm sm:p-8">
        <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">{TEASER_PROMPT}</p>
        <p className="mt-1 text-base font-medium text-foreground sm:text-lg">{TEASER_QUESTION}</p>

        {/*
         * A polite live region so the rewrite is announced rather than silently
         * mutating text a screen-reader user already read.
         */}
        <p
          aria-live="polite"
          className={cn(
            // Warm yellow, not brand purple: this line is the realization beat
            // — the moment the visitor is told to look again — and yellow is
            // the accent that owns "pay attention to this".
            'mt-5 flex items-start gap-2 text-sm text-warning transition-opacity duration-[var(--motion-base)]',
            isResolved ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
        >
          {isResolved ? (
            <>
              <CornerDownRight aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>{TEASER_REWRITE_NOTE}</span>
            </>
          ) : null}
        </p>

        <ul className="mt-4 flex flex-col gap-3" ref={optionsRef}>
          {TEASER_CHOICES.map((choice) => {
            const isChosen = outcome?.choice.id === choice.id

            return (
              <li key={choice.id}>
                <HoverGlow
                  className="rounded-xl"
                  elevate={!isResolved}
                  tone={choice.isCatch ? 'success' : 'brand'}
                >
                  <button
                    aria-pressed={isChosen}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-xl border p-4 text-left',
                      'transition-colors duration-[var(--motion-fast)] ease-[var(--ease-move)]',
                      'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                      isResolved ? 'cursor-default' : 'cursor-pointer hover:border-brand/45',
                      isChosen
                        ? choice.isCatch
                          ? 'border-success/60 bg-success/8'
                          : 'border-brand/60 bg-brand/8'
                        : 'border-border bg-background/40',
                      isResolved && !isChosen && 'opacity-55'
                    )}
                    disabled={isResolved}
                    onClick={() => handleChoose(choice)}
                    onFocus={() => {
                      if (!isResolved) signal('choice.hover')
                    }}
                    onPointerEnter={(event) => {
                      if (isResolved || event.pointerType !== 'mouse') return
                      signal('choice.hover')
                    }}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border',
                        isChosen
                          ? choice.isCatch
                            ? 'border-success bg-success text-success-foreground'
                            : 'border-brand bg-brand text-background'
                          : 'border-border'
                      )}
                    >
                      {isChosen ? <Check className="size-3" /> : null}
                    </span>

                    <span
                      className="text-sm leading-relaxed text-foreground sm:text-base"
                      data-teaser-label
                      style={{ filter: 'blur(calc(var(--rewrite-blur, 0) * 1px))' }}
                    >
                      {showRewritten ? choice.rewritten : choice.label}
                    </span>
                  </button>
                </HoverGlow>
              </li>
            )
          })}
        </ul>
      </div>

      {outcome ? <TeaserVerdict outcome={outcome} reduced={reduced} /> : null}
    </div>
  )
}

/**
 * The reveal panel. Structure follows ContentStrategy §7 — what happened, the
 * bias named, why your mind did it — and the tone follows InteractionPrinciples
 * §8: a miss is a discovery, never a verdict, and the copy names the *reasoning*
 * rather than praising or blaming the person.
 */
function TeaserVerdict({ outcome, reduced }: { outcome: TeaserOutcome; reduced: boolean }) {
  /*
   * The consequence, one beat behind the commitment. Caught and missed are the
   * same size of event in both channels — the panel's own copy calls a miss
   * "as designed", and the feedback must not argue with it.
   */
  useSignalOnMount(outcome.caught ? 'outcome.correct' : 'outcome.miss', {
    delayMs: PHRASE.second,
  })

  return (
    <RevealContainer
      className="mt-4 rounded-2xl border border-border bg-elevated/70 p-6 depth-overlay backdrop-blur-sm sm:p-8"
      delay={reduced ? 0 : DURATION.celebrate}
      distance="sm"
      duration="slow"
    >
      <p
        className={cn(
          'text-xs font-semibold tracking-[0.14em] uppercase',
          outcome.caught ? 'text-success' : 'text-reward'
        )}
      >
        {outcome.caught ? 'You caught it' : 'It caught you — as designed'}
      </p>

      <h3 className="mt-3 font-heading text-2xl font-semibold tracking-tight text-foreground">
        {TEASER_BIAS_NAME}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{TEASER_BIAS_DEFINITION}</p>

      <p className="mt-4 text-base leading-relaxed text-pretty text-foreground/90">
        {outcome.choice.verdict}
      </p>
    </RevealContainer>
  )
}
