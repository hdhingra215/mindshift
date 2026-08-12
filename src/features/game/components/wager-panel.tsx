import { Check, Lock } from 'lucide-react'

import { RevealContainer } from '@/components/motion'
import { InstrumentFrame } from '@/components/world'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import {
  affordableTiers,
  describeEmptyReserve,
  describeWagerIntro,
  formatInsight,
  projectBalance,
} from '../lib/wager'
import type { WagerPhase } from '../types'

type WagerPanelProps = {
  phase: WagerPhase
  /** True once the player has chosen an answer. The wager is the second decision. */
  enabled: boolean
  selectedStake: number | null
  onSelectStake: (stake: number | null) => void
  onLock: () => void
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
  enabled,
  selectedStake,
  onSelectStake,
  onLock,
}: WagerPanelProps) {
  if (phase.status === 'unavailable') return null

  const wallet = phase.wallet
  const tiers = affordableTiers(wallet)
  const isLocked = phase.status === 'locked'
  const isLocking = phase.status === 'locking'

  if (tiers.length === 0 && !isLocked) {
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
                disabled={!enabled || isLocked || isLocking}
                key={tier}
                onClick={() => onSelectStake(isSelected ? null : tier)}
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
            ? `Locked at ${formatInsight(phase.wager.stake)}. This one is committed.`
            : projection
              ? `Right: ${formatInsight(projection.ifRight)}. Wrong: ${formatInsight(projection.ifWrong)}.`
              : 'Choose a stake, or answer without one — skipping costs nothing.'}
        </p>

        {!isLocked ? (
          <div className="mt-4 flex items-center gap-3">
            <Button
              disabled={!enabled || selectedStake === null || isLocking}
              onClick={onLock}
              size="lg"
              type="button"
            >
              <Lock aria-hidden="true" className="size-4" />
              {isLocking ? 'Locking…' : 'Lock in'}
            </Button>
            {!enabled ? (
              <p className="text-xs text-muted-foreground">Pick your answer first.</p>
            ) : null}
          </div>
        ) : null}
      </InstrumentFrame>
    </RevealContainer>
  )
}
