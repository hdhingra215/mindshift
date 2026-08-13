import { useEffect, useRef } from 'react'

import { RevealContainer } from '@/components/motion'
import { InstrumentFrame } from '@/components/world'
import { PHRASE, useSignalOnMount } from '@/lib/feedback'
import { ANIME_EASE, DURATION, animate, useReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { describeWagerResult, formatInsight } from '../lib/wager'
import type { WagerOutcome } from '../types'

type WagerResultProps = {
  outcome: WagerOutcome
}

/**
 * How the stake settled.
 *
 * ── Why a loss is not styled as damage ──────────────────────────────────────
 * Both outcomes get the same housing and the same weight. A win reads in
 * `success` and a shortfall in `warning` — the token for *caution*, deliberately
 * not `error`, because nothing went wrong: the player learned that their
 * confidence outran their judgement in this situation, which is the single most
 * useful thing this mechanic can teach. Red would frame a lesson as a failure.
 *
 * The eyebrow carries which happened in words, so the distinction survives with
 * colour removed, and the signed movement is always spelled out — the numerical
 * consequence is never hidden or softened.
 *
 * ── The one animation ───────────────────────────────────────────────────────
 * The balance counts from before to after. Time-driven, so Anime.js owns it
 * (MotionSystem §1), and it routes through the reduced-motion gate — under
 * reduced motion the final number is simply present, which is the state that
 * matters. Nothing here is a payout animation; it is a value moving.
 */
export function WagerResult({ outcome }: WagerResultProps) {
  const { eyebrow, movement, line } = describeWagerResult(outcome)
  const balanceRef = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()

  /*
   * Second in the reveal phrase, behind the outcome. Both settlements are the
   * same event in two colours — same length, same level — for exactly the
   * reason the styling is: nothing went wrong when a stake falls short.
   */
  useSignalOnMount(outcome.wasCorrect ? 'wager.win' : 'wager.loss', { delayMs: PHRASE.second })

  useEffect(() => {
    const node = balanceRef.current
    if (!node) return

    if (reduced) {
      node.textContent = String(outcome.balanceAfter)
      return
    }

    const counter = { value: outcome.balanceBefore }
    const tally = animate(counter, {
      value: outcome.balanceAfter,
      duration: DURATION.slow,
      ease: ANIME_EASE.move,
      onUpdate: () => {
        node.textContent = String(Math.round(counter.value))
      },
    })

    return () => {
      tally.revert()
      node.textContent = String(outcome.balanceAfter)
    }
  }, [outcome.balanceBefore, outcome.balanceAfter, reduced])

  return (
    <RevealContainer className="mx-auto w-full max-w-2xl" delay={40} distance="sm" duration="slow">
      <InstrumentFrame as="section" className="px-5 py-4" legend={eyebrow}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p
            className={cn(
              'font-heading text-lg font-semibold tabular-nums',
              outcome.wasCorrect ? 'text-success' : 'text-warning',
            )}
          >
            {movement}
          </p>
          <p className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
            Reserve{' '}
            <span className="tabular-nums" ref={balanceRef}>
              {outcome.balanceBefore}
            </span>
          </p>
        </div>

        <p className="mt-1.5 text-xs leading-relaxed text-pretty text-muted-foreground">{line}</p>

        {/* The whole fact, in one sentence, for a screen reader and for anyone
            who would rather read it than infer it from a moving number. */}
        <p className="sr-only" role="status">
          {`You staked ${formatInsight(outcome.stake)} and were ${
            outcome.wasCorrect ? 'right' : 'wrong'
          }. Your reserve is now ${formatInsight(outcome.balanceAfter)}.`}
        </p>
      </InstrumentFrame>
    </RevealContainer>
  )
}
