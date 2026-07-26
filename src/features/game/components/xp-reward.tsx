import { useEffect, useRef, useState } from 'react'
import { PenLine, Sparkles } from 'lucide-react'

import { useCountTo, useReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'

import type { XpAward } from '../types'

type XpRewardProps = {
  award: XpAward
  /** Bonus earned by writing a reflection, once one has been saved. */
  reflectionXp: number | null
  className?: string
}

/** Fraction of a level bar, clamped so a mid-migration value can never overflow. */
function fillFraction(xpIntoLevel: number, span: number | null): number {
  if (span === null || span <= 0) return 1
  return Math.min(1, Math.max(0, xpIntoLevel / span))
}

/**
 * The reward beat: what the last play earned, where it landed, and what the
 * session is worth so far.
 *
 * Restraint is the design (InteractionPrinciples §7, §13). No confetti, no
 * full-screen moment, nothing to dismiss — a strip that settles in beside the
 * explanation and stays there. XP is scaffolding; the insight above it is the
 * actual prize, so this must never out-shout the reveal it sits under.
 *
 * Every number is the server's. Nothing here is computed from a local guess,
 * which is why the strip renders only once an award has actually landed: a
 * plausible-looking XP figure that turned out wrong would be worse than a
 * moment of nothing.
 *
 * Orange throughout, because orange means reward in this product and nothing
 * else (DesignSystem §1). The bar and the count both survive reduced motion —
 * the count writes its final value instantly and the fill renders already full.
 */
export function XpReward({ award, reflectionXp, className }: XpRewardProps) {
  const reduced = useReducedMotion()
  const amountRef = useRef<HTMLSpanElement>(null)
  const sessionRef = useRef<HTMLSpanElement>(null)

  const target = fillFraction(award.currentXp, award.levelSpan)
  // Where the bar sat before this award, so the fill travels the distance the
  // player just earned. A level-up starts the new bar from empty.
  const origin = award.leveledUp
    ? 0
    : fillFraction(award.currentXp - award.awarded, award.levelSpan)

  const [fill, setFill] = useState(reduced ? target : origin)

  useCountTo(amountRef, award.awarded, { duration: 'celebrate' })
  useCountTo(sessionRef, award.sessionXp, { duration: 'slow' })

  // Painted at the origin first, then advanced on the next frame so the CSS
  // transition has two values to move between rather than mounting at the end.
  useEffect(() => {
    if (reduced) {
      setFill(target)
      return
    }
    const frame = requestAnimationFrame(() => setFill(target))
    return () => cancelAnimationFrame(frame)
  }, [reduced, target])

  const atMaxLevel = award.levelSpan === null

  return (
    <section
      aria-label="Experience earned"
      className={cn(
        'mx-auto w-full max-w-2xl rounded-xl border border-reward/25 bg-reward/5 p-4 sm:p-5',
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <p className="flex items-baseline gap-2 font-heading text-lg font-semibold text-reward">
          <Sparkles className="size-4 self-center" aria-hidden="true" />
          <span aria-hidden="true">
            +<span className="tabular-nums" ref={amountRef}>0</span> XP
          </span>
          {/*
           * The visual number animates and is therefore hidden from assistive
           * tech; the settled value is announced once, in words, instead of
           * every intermediate frame being read aloud.
           */}
          <span className="sr-only" aria-live="polite">
            {award.awarded} XP earned
          </span>
        </p>

        <p className="text-xs text-muted-foreground">
          This session:{' '}
          <span className="font-medium tabular-nums text-foreground" ref={sessionRef}>
            {award.sessionXp}
          </span>{' '}
          XP
        </p>
      </div>

      {reflectionXp === null ? null : (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <PenLine className="size-3.5 text-reward" aria-hidden="true" />
          <span>
            <span className="font-medium text-reward tabular-nums">+{reflectionXp}</span>{' '}
            for writing it down — the part that makes it stick.
          </span>
        </p>
      )}

      <div className="mt-4 flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3 text-xs">
          <p className="font-medium text-foreground">
            Level {award.currentLevel} · {award.levelTitle}
          </p>
          <p className="text-muted-foreground tabular-nums">
            {atMaxLevel
              ? `${award.totalXp} XP total`
              : `${award.currentXp} / ${award.levelSpan} to level ${award.currentLevel + 1}`}
          </p>
        </div>

        <div
          aria-hidden="true"
          className="h-1.5 w-full overflow-hidden rounded-full bg-border"
        >
          <div
            className="h-full rounded-full bg-reward transition-[width] duration-[var(--motion-celebrate)] ease-[var(--ease-enter)]"
            style={{ width: `${fill * 100}%` }}
          />
        </div>

        {award.leveledUp ? (
          <p className="mt-1 text-xs text-foreground" aria-live="polite">
            <span className="font-medium">Level {award.currentLevel} — {award.levelTitle}.</span>{' '}
            New ground, not a trophy.
          </p>
        ) : null}
      </div>
    </section>
  )
}
