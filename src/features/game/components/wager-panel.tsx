import { Check, Lock } from 'lucide-react'

import { RevealContainer } from '@/components/motion'
import { InstrumentFrame } from '@/components/world'
import { Button } from '@/components/ui/button'
import { signal } from '@/lib/feedback'
import { cn } from '@/lib/utils'

import {
  affordableTiers,
  describeEmptyReserve,
  describeReserveUnreadable,
  describeWagerIntro,
  describeWagerRequirement,
  formatInsight,
  projectBalance,
} from '../lib/wager'
import type { WagerPhase } from '../types'

type WagerPanelProps = {
  phase: WagerPhase
  selectedStake: number | null
  onSelectStake: (stake: number | null) => void
  onLock: () => void
  /** Another attempt at the reserve, after a read that failed its retries. */
  onRetryRead: () => void
}

/**
 * The Insight reserve — an instrument the player commits against.
 *
 * ── The distinction this component is built around ──────────────────────────
 * "Locking in a decision", never "placing a bet". There is no randomness in the
 * mechanic and there must be none in the styling: no chips, no odds, no glow on
 * the biggest number, nothing that rewards the *act* of staking over the
 * judgement behind it. It is a dial you set and a lever you pull.
 *
 * ── Both outcomes are always visible ────────────────────────────────────────
 * Selecting a stake shows where the balance lands if you are right *and* if you
 * are wrong, before the lock. Hiding the downside of a commitment is exactly the
 * dark pattern this mechanic would otherwise drift into.
 *
 * ── Accessibility ───────────────────────────────────────────────────────────
 * A real radiogroup of real buttons: arrow keys and tab both work, selection is
 * carried by `aria-checked`, a border weight *and* a check mark — never by
 * colour alone. The lock is a `<button>`, not a div. The projected outcome is a
 * polite live region, so a screen-reader user hears the consequence change as
 * they move between stakes.
 */
export function WagerPanel({
  phase,
  selectedStake,
  onSelectStake,
  onLock,
  onRetryRead,
}: WagerPanelProps) {
  /*
   * No economy on this deployment. The server has no ordering gate either, so
   * the answers are already open and there is nothing for this panel to say.
   */
  if (phase.status === 'unavailable') return null

  /*
   * The reserve has not resolved. The answers are shut behind this, so the panel
   * has to account for itself rather than sit blank — and when the read has given
   * up, offer the way out instead of stranding the player.
   */
  if (phase.status === 'pending') {
    return (
      <RevealContainer className="mx-auto w-full max-w-2xl" delay={80} distance="sm">
        <InstrumentFrame as="section" className="px-5 py-4" legend="Insight reserve">
          {phase.unreadable ? (
            <>
              <p className="text-xs leading-relaxed text-muted-foreground" role="status">
                {describeReserveUnreadable()}
              </p>
              <div className="mt-3">
                <Button onClick={onRetryRead} size="lg" type="button" variant="outline">
                  Try again
                </Button>
              </div>
            </>
          ) : (
            <p aria-live="polite" className="text-xs text-muted-foreground">
              Reading your Insight reserve…
            </p>
          )}
        </InstrumentFrame>
      </RevealContainer>
    )
  }

  const wallet = phase.wallet

  /*
   * Below the smallest tier — an empty reserve, or the band just above it. The
   * player goes straight to the answer, and the copy has to say so plainly:
   * running low on Insight may not read as being locked out of the game.
   */
  if (phase.status === 'skipped') {
    return (
      <RevealContainer className="mx-auto w-full max-w-2xl" delay={80} distance="sm">
        <InstrumentFrame as="section" className="px-5 py-4" legend="Insight reserve">
          <p className="font-heading text-sm text-foreground">{formatInsight(wallet.balance)}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {describeEmptyReserve(wallet)}
          </p>
        </InstrumentFrame>
      </RevealContainer>
    )
  }

  const tiers = affordableTiers(wallet)
  const isLocked = phase.status === 'locked'
  const isLocking = phase.status === 'locking'

  const projection = selectedStake ? projectBalance(wallet, selectedStake) : null

  return (
    <RevealContainer className="mx-auto w-full max-w-2xl" delay={80} distance="sm">
      <InstrumentFrame as="section" className="px-5 py-4" legend="Insight reserve">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="font-heading text-base font-semibold text-foreground">
            Back your confidence.
          </p>
          <p className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase tabular-nums">
            {formatInsight(isLocked ? wallet.balance : wallet.balance)} available
          </p>
        </div>

        {/* The whole explanation, inline. No modal, no tour. */}
        <p className="mt-1.5 text-xs leading-relaxed text-pretty text-muted-foreground">
          {describeWagerIntro(wallet)}
        </p>

        {/*
         * That the stake comes first, stated once and up front. Not framed as a
         * requirement imposed on the player — it is how you commit to a read.
         */}
        {!isLocked ? (
          <p className="mt-2 text-xs leading-relaxed font-medium text-foreground">
            {describeWagerRequirement()}
          </p>
        ) : null}

        <div
          aria-label="How much Insight to stake"
          className="mt-4 flex flex-wrap gap-2"
          role="radiogroup"
        >
          {tiers.map((tier) => {
            const isSelected = selectedStake === tier
            return (
              <button
                aria-checked={isSelected}
                className={cn(
                  'relative flex min-w-[5.5rem] items-center justify-center gap-1.5 rounded-md border px-3 py-2',
                  'font-mono text-xs tracking-[0.08em] tabular-nums',
                  'transition-[border-color,background-color,opacity] duration-[var(--motion-fast)]',
                  'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                  isSelected
                    ? 'border-foreground/70 bg-foreground/5 text-foreground'
                    : 'border-border/70 text-muted-foreground hover:border-border',
                  (isLocked || isLocking) && 'pointer-events-none opacity-60',
                )}
                disabled={isLocked || isLocking}
                key={tier}
                onClick={() => {
                  // A detent on a dial: dry, mechanical, no pitch to speak of.
                  // Selecting and clearing feel identical, because they are the
                  // same act — moving the dial, not winning anything.
                  signal('wager.select')
                  onSelectStake(isSelected ? null : tier)
                }}
                role="radio"
                type="button"
              >
                {/* Selection is a mark, a border weight and aria-checked — three
                    channels, none of them colour. */}
                {isSelected ? <Check aria-hidden="true" className="size-3" /> : null}
                {tier}
              </button>
            )
          })}
        </div>

        {/*
         * The consequence, both ways, before the commitment. Polite rather than
         * assertive so it does not interrupt the player mid-thought.
         */}
        <p aria-live="polite" className="mt-3 min-h-[1.25rem] text-xs text-muted-foreground">
          {isLocked && phase.status === 'locked'
            ? `Locked at ${formatInsight(phase.wager.stake)}. This one is committed — your options are open.`
            : projection
              ? `Right: ${formatInsight(projection.ifRight)}. Wrong: ${formatInsight(projection.ifWrong)}.`
              : 'Choose how much you’d back your read of this one.'}
        </p>

        {!isLocked ? (
          <div className="mt-4 flex items-center gap-3">
            <Button
              disabled={selectedStake === null || isLocking}
              onClick={onLock}
              size="lg"
              // The same weight as committing an answer, because staking
              // Insight is the same kind of act: a thing you cannot take back.
              moment="wager.commit"
              type="button"
            >
              <Lock aria-hidden="true" className="size-4" />
              {isLocking ? 'Locking…' : 'Lock in'}
            </Button>
          </div>
        ) : null}
      </InstrumentFrame>
    </RevealContainer>
  )
}
