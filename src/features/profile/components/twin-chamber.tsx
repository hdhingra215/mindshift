import { InstrumentFrame } from '@/components/world'
import { useSoundscape } from '@/lib/feedback'
import { useInViewRef } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { describePattern, describeTwinStatus, summariseTwinAccuracy } from '../lib/twin'
import type { CognitiveTwinSlot, TwinPattern } from '../types'

type TwinChamberProps = {
  twin: CognitiveTwinSlot
  /** How much evidence the archive holds, for the honest count when sealed. */
  decisionCount: number
  reflectionCount: number
}

/**
 * The Cognitive Twin's chamber in the Archive.
 *
 * A model of how this player decides, built from their own record. The chamber
 * has three faces and the type decides which one renders — a sealed Twin
 * literally has no patterns to display, so the interface cannot leak a claim
 * that the evidence thresholds refused to make.
 *
 * ── The honesty this component is responsible for ───────────────────────────
 * Every pattern ships with its sample size in the same breath as the claim, not
 * behind a tooltip. The player should be able to disbelieve the Twin from the
 * information on screen — "7 of 9" is an argument they can weigh, where a
 * confidence bar is one they have to take on faith.
 *
 * Nothing here is generated. The sentences are deterministic templates over
 * server-computed facts, and `pattern.narration` is the declared slot for a
 * future language layer that does not exist yet.
 */
export function TwinChamber(props: TwinChamberProps) {
  /*
   * The chamber takes the room while it is on screen, and gives it straight
   * back (ProjectStatus §8.17 — deferred from 8.9, closed here).
   *
   * It has to be in-view rather than mounted, because unlike the prediction
   * card in play this plate exists for the whole life of the page: declaring on
   * mount would hold the entire Archive in the Twin's bed. `null` withdraws the
   * declaration rather than claiming silence, so the archive room underneath
   * simply resumes.
   *
   * `once: false` because this is a state, not a reveal — scrolling away has to
   * hand the room back.
   */
  const [ref, inView] = useInViewRef<HTMLDivElement>({ once: false, amount: 0.35 })
  useSoundscape(inView ? 'twin' : null)

  return (
    <div ref={ref}>
      <ChamberFace {...props} />
    </div>
  )
}

/** The chamber's three faces. Which one renders is decided by the slot type. */
function ChamberFace({ twin, decisionCount, reflectionCount }: TwinChamberProps) {
  if (twin.status === 'sealed') {
    return <SealedChamber twin={twin} decisions={decisionCount} reflections={reflectionCount} />
  }

  if (twin.status === 'watching') {
    return (
      <InstrumentFrame className="px-6 py-8" legend="Reading">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8">
          <TwinCore lit />
          <div className="max-w-xl">
            <p className="font-heading text-base font-semibold text-foreground">
              Your Twin is awake, and still undecided.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
              {describeTwinStatus(twin)} That is a real finding in itself — it
              means nothing in your record is one-sided enough to bet on yet.
            </p>
            <p className="mt-3 font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
              {twin.attempts} decisions read
            </p>
          </div>
        </div>
      </InstrumentFrame>
    )
  }

  const accuracy = summariseTwinAccuracy(twin.predictionsResolved, twin.predictionsCorrect)

  return (
    <InstrumentFrame className="px-6 py-8" legend="Observing">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8">
          <TwinCore lit />
          <div className="max-w-xl">
            <p className="font-heading text-base font-semibold text-foreground">
              Built from {twin.attempts} of your decisions.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
              Not a personality read — a record of where your judgement holds and
              where it slips. It guesses before some scenarios, and it is wrong
              often enough to be worth arguing with.
            </p>
            <p className="mt-3 font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
              {accuracy.summary}
            </p>
          </div>
        </div>

        <div>
          <p className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
            What it has noticed
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {twin.patterns.map((pattern) => (
              <PatternLine key={`${pattern.contextKind}-${pattern.contextLabel}`} pattern={pattern} />
            ))}
          </ul>
        </div>
      </div>
    </InstrumentFrame>
  )
}

/**
 * One observation.
 *
 * The leaning is stated in words *and* carried by the marker, so "reads well"
 * versus "keeps slipping" never depends on distinguishing two colours.
 */
function PatternLine({ pattern }: { pattern: TwinPattern }) {
  return (
    <li className="flex items-baseline gap-3">
      <span
        aria-hidden="true"
        className={cn(
          'mt-1.5 block size-1.5 shrink-0 rounded-full',
          pattern.predictsCatch ? 'bg-success' : 'bg-warning',
        )}
      />
      <div className="min-w-0">
        <p className="text-sm leading-relaxed text-pretty text-foreground">
          {describePattern(pattern)}
        </p>
        <p className="mt-0.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          {pattern.contextKind === 'pack' ? 'Setting' : 'Bias family'} ·{' '}
          {pattern.predictsCatch ? 'reads well' : 'slips'}
        </p>
      </div>
    </li>
  )
}

/**
 * The Twin before it has enough to read.
 *
 * Keeps the sealed housing the chamber shipped with: reserved, never broken, and
 * explicit that the silence is a threshold rather than a failure.
 */
function SealedChamber({
  twin,
  decisions,
  reflections,
}: {
  twin: Extract<CognitiveTwinSlot, { status: 'sealed' }>
  decisions: number
  reflections: number
}) {
  return (
    <InstrumentFrame className="px-6 py-8" legend="Reserved">
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8">
        <TwinCore lit={false} />

        <div className="max-w-xl">
          <p className="font-heading text-base font-semibold text-foreground">
            Your Cognitive Twin is still forming.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
            {describeTwinStatus(twin)} It will be built from this archive and
            nothing else — so rather than guess at your patterns now, it stays
            quiet and says so.
          </p>
          <p className="mt-3 font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
            {describeMaterial(decisions, reflections)}
          </p>
        </div>
      </div>
    </InstrumentFrame>
  )
}

/**
 * The housing itself — the same shape as the observatory's core.
 *
 * Unlit it reads as a place something will sit; lit, as an instrument running.
 * Decorative only: every fact it implies is stated in the text beside it.
 */
function TwinCore({ lit }: { lit: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative flex size-20 shrink-0 items-center justify-center rounded-full border',
        lit ? 'border-info/40' : 'border-dashed border-border/70',
      )}
    >
      {lit ? (
        <span className="absolute inset-0 rounded-full bg-info/10 blur-xl" />
      ) : null}
      <span
        className={cn(
          'size-8 rounded-full border',
          lit ? 'border-info/60 bg-info/20' : 'border-border/50',
        )}
      />
    </span>
  )
}

/**
 * What the archive is holding for it.
 *
 * A count of real rows, phrased without a target — "12 of 50 needed" would be a
 * fabricated threshold and a manufactured goal (InteractionPrinciples §13). The
 * genuine threshold, when there is one, is stated by `describeTwinStatus`.
 */
function describeMaterial(decisions: number, reflections: number): string {
  if (decisions === 0) return 'Nothing on file for it yet'

  const decisionPart = `${decisions} ${decisions === 1 ? 'decision' : 'decisions'}`
  if (reflections === 0) return `${decisionPart} on file`

  return `${decisionPart} and ${reflections} ${reflections === 1 ? 'reflection' : 'reflections'} on file`
}
