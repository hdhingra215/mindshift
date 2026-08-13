import { InstrumentFrame } from '@/components/world'

import {
  describeConviction,
  formatInsightMovement,
  summariseConviction,
} from '../lib/evidence'
import type { ArchiveWager } from '../types'

type ConvictionPanelProps = {
  wagers: readonly ArchiveWager[]
  /** Server-owned overall accuracy. Read, never recomputed — the baseline. */
  accuracy: number
}

/**
 * The conviction plate — what the player's stakes say that their answers do not.
 *
 * The Blind Wager mechanic has been recording since Phase 8.5 and nothing has
 * ever read it (ProjectStatus §11). This is that surface, and it exists to
 * report exactly one comparison: **how often the player is right when they put
 * Insight behind an answer, against how often they are right in general.**
 *
 * ── Why that comparison and not a scoreboard ────────────────────────────────
 * Confidence is a feeling and costs nothing; conviction is a commitment. The
 * wager was designed to measure the second (§4.7), and a staked accuracy on its
 * own measures neither — 70% is excellent for a player who is right 55% of the
 * time and poor for one who is right 85%. Only the gap is a finding, which is
 * also why its sample floor is the highest in the archive.
 *
 * ── What it refuses to do ───────────────────────────────────────────────────
 * No streaks, no biggest-win, no "you're on a roll". This is the one screen in
 * the product that could most easily drift into a betting history, and the
 * mechanic's own rules forbid it (§5.4): no chips, no odds, nothing that
 * rewards the act of staking over the judgement behind it. The net Insight line
 * states the movement and stops — it is a number, not a score.
 *
 * Every claim ships with its sample size in the same breath, the same
 * discipline the Twin holds itself to (§4.6), and below the floor the panel
 * says what it is waiting for rather than showing a percentage nobody should
 * believe.
 */
export function ConvictionPanel({ wagers, accuracy }: ConvictionPanelProps) {
  const summary = summariseConviction(wagers, accuracy)

  if (summary.sampleSize === 0) {
    return (
      <p className="max-w-xl text-sm leading-relaxed text-pretty text-muted-foreground">
        {describeConviction(summary)}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <dl className="grid gap-6 sm:grid-cols-3">
        <Reading
          detail={
            summary.stakedAccuracy === null
              ? `${summary.sampleSize} settled so far`
              : `across ${summary.sampleSize} staked ${summary.sampleSize === 1 ? 'decision' : 'decisions'}`
          }
          legend="When you commit"
          value={summary.stakedAccuracy === null ? '—' : `${summary.stakedAccuracy}%`}
        />

        <Reading
          detail={
            summary.edge === null
              ? 'Not enough settled to compare'
              : `against ${Math.round(accuracy)}% overall`
          }
          legend="Conviction edge"
          value={summary.edge === null ? '—' : `${summary.edge > 0 ? '+' : ''}${summary.edge}`}
        />

        <Reading
          detail={formatInsightMovement(summary.netInsight)}
          legend="Typical stake"
          value={summary.averageStake === null ? '—' : String(summary.averageStake)}
        />
      </dl>

      <p className="max-w-2xl text-sm leading-relaxed text-pretty text-muted-foreground">
        {describeConviction(summary)}
      </p>

      {summary.bands.length > 0 ? (
        <div>
          <p className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
            How each stake settled
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {summary.bands.map((band) => {
              const share = band.attempts === 0 ? 0 : band.correct / band.attempts
              return (
                <li className="flex items-center gap-4" key={band.stake}>
                  <span className="w-28 shrink-0 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase tabular-nums">
                    {band.stake} Insight
                  </span>
                  {/*
                   * The same hairline track the evidence plate uses. A tier
                   * below its own floor draws nothing rather than drawing a
                   * confident-looking line over two decisions — and the tally
                   * to its right carries the whole fact either way.
                   */}
                  <span
                    aria-hidden="true"
                    className="relative h-px flex-1 overflow-hidden bg-border/50"
                  >
                    {band.accuracy === null ? null : (
                      <span
                        className="absolute inset-y-0 left-0 bg-foreground/70"
                        style={{ width: `${Math.round(share * 100)}%` }}
                      />
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                    {band.correct}/{band.attempts}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

/** One etched reading. Same shape as the evidence plate's, deliberately. */
function Reading({
  legend,
  value,
  detail,
}: {
  legend: string
  value: string
  detail: string
}) {
  return (
    <InstrumentFrame as="div" className="px-4 py-3" legend={legend} legendAs="dt">
      <dd className="flex flex-col gap-1">
        <span className="font-heading text-2xl font-semibold tracking-tight text-foreground tabular-nums">
          {value}
        </span>
        <span className="text-xs leading-relaxed text-muted-foreground">{detail}</span>
      </dd>
    </InstrumentFrame>
  )
}
