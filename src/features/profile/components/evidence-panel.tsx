import { InstrumentFrame } from '@/components/world'
import { cn } from '@/lib/utils'

import {
  formatDeliberation,
  formatShare,
  summariseCalibration,
  summariseDecisions,
} from '../lib/evidence'
import type { ArchiveCalibrationPoint, ArchiveDecision } from '../types'

type EvidencePanelProps = {
  decisions: readonly ArchiveDecision[]
  calibration: readonly ArchiveCalibrationPoint[]
  /** Server-owned accuracy. Read, never recomputed here. */
  accuracy: number
  scenariosCompleted: number
  truncated: boolean
}

/** Difficulty as the player would say it, not as the enum spells it. */
const DIFFICULTY_LABEL: Record<ArchiveDecision['difficulty'], string> = {
  easy: 'Everyday',
  medium: 'Pressured',
  hard: 'Costly',
  expert: 'Adversarial',
}

/**
 * The evidence plate: what the record actually shows about how this player decides.
 *
 * Four readings and a difficulty strip. Nothing here is a grade and nothing here
 * is a conclusion — the panel states numbers and the difference between two of
 * them, and leaves the interpretation alone. "Your confidence ran 14 points
 * ahead of your accuracy" is a fact about a record; "you are overconfident" is a
 * claim about a person, and the archive does not make those.
 *
 * Recognition comes from `progress.overall_accuracy`, which the server owns.
 * Deliberation, reflection rate and the difficulty strip are derived here
 * because the server exposes no equivalent — all three are descriptive and feed
 * nothing back into the game (see `lib/evidence.ts`).
 */
export function EvidencePanel({
  decisions,
  calibration,
  accuracy,
  scenariosCompleted,
  truncated,
}: EvidencePanelProps) {
  const summary = summariseDecisions(decisions)
  const calibrated = summariseCalibration(calibration)

  if (scenariosCompleted === 0) {
    return (
      <p className="max-w-xl text-sm leading-relaxed text-pretty text-muted-foreground">
        Nothing recorded here yet. Every scenario you play leaves a trace — how
        long you took, how sure you were, whether you were right. The patterns
        come out of that, so the first one has to be made before there is anything
        to read.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Reading
          detail={`across ${scenariosCompleted} ${scenariosCompleted === 1 ? 'decision' : 'decisions'}`}
          legend="Recognition"
          value={`${Math.round(accuracy)}%`}
        />

        <Reading
          detail={summary.medianResponseMs === null ? 'No timings recorded' : 'typical time to decide'}
          legend="Deliberation"
          value={formatDeliberation(summary.medianResponseMs)}
        />

        <Reading
          detail={
            summary.total === 0
              ? 'Nothing to compare yet'
              : `of ${summary.total} ${summary.total === 1 ? 'decision' : 'decisions'} written about`
          }
          legend="Reflection"
          value={formatShare(summary.reflectionRate)}
        />

        <Reading
          detail={describeCalibration(calibrated)}
          legend="Calibration"
          value={
            calibrated.gap === null
              ? '—'
              : `${calibrated.gap > 0 ? '+' : ''}${calibrated.gap}`
          }
        />
      </dl>

      {summary.byDifficulty.length > 0 ? (
        <div>
          <p className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
            Where the traps caught you
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {summary.byDifficulty.map((band) => {
              const share = band.attempted === 0 ? 0 : band.caught / band.attempted
              return (
                <li className="flex items-center gap-4" key={band.difficulty}>
                  <span className="w-28 shrink-0 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                    {DIFFICULTY_LABEL[band.difficulty]}
                  </span>
                  {/*
                   * A hairline track, not a progress bar: this measures what
                   * happened, not how far along something is. The number to its
                   * right carries the whole fact, so the line is a second channel
                   * rather than the only one.
                   */}
                  <span
                    aria-hidden="true"
                    className="relative h-px flex-1 overflow-hidden bg-border/50"
                  >
                    <span
                      className="absolute inset-y-0 left-0 bg-foreground/70"
                      style={{ width: `${Math.round(share * 100)}%` }}
                    />
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                    {band.caught}/{band.attempted}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {truncated ? (
        <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          Patterns describe your most recent {summary.total} decisions.
        </p>
      ) : null}
    </div>
  )
}

/** One reading, etched into its housing rather than boxed in a card. */
function Reading({
  legend,
  value,
  detail,
  tone,
}: {
  legend: string
  value: string
  detail: string
  tone?: string
}) {
  return (
    <InstrumentFrame className="px-4 py-3" legend={legend} legendAs="dt">
      <dd className="m-0">
        <p className={cn('font-heading text-2xl font-semibold tabular-nums', tone ?? 'text-foreground')}>
          {value}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p>
      </dd>
    </InstrumentFrame>
  )
}

/**
 * The calibration reading, in words.
 *
 * The number above it is a signed gap, which is meaningless on its own — this
 * line is the channel that carries the meaning without relying on the sign, a
 * colour, or the player knowing what "calibration" is.
 */
function describeCalibration(summary: ReturnType<typeof summariseCalibration>): string {
  if (summary.direction === 'insufficient') {
    return summary.sampleSize === 0
      ? 'Rate your confidence when you reflect'
      : `${summary.sampleSize} of 5 readings so far`
  }

  const stated = `${summary.averageConfidence}% sure, right ${summary.observedAccuracy}% of the time`

  if (summary.direction === 'aligned') return `${stated} — closely matched`
  if (summary.direction === 'ahead') return `${stated} — confidence ran ahead`
  return `${stated} — confidence ran behind`
}
