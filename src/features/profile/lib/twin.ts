import type {
  CognitiveTwinSlot,
  TwinPattern,
  TwinPrediction,
  TwinVerdict,
} from '../types'

/**
 * How the Cognitive Twin is allowed to speak.
 *
 * The Twin's inference happens in SQL; this module only turns typed facts into
 * sentences. That split is what keeps the copy honest — there is no number here
 * that was not computed server-side from the player's own recorded decisions.
 *
 * ── Four rules every line in this file follows ──────────────────────────────
 *   1. **Evidence, never diagnosis.** "In Money & Spending you've caught 7 of 9"
 *      is a fact about a record. "You're impulsive with money" is a claim about
 *      a person, and the Twin does not make those.
 *   2. **Prediction is never certainty.** Every prediction is phrased as one —
 *      "I think", "my guess" — and always ships next to the sample it rests on.
 *   3. **Silence is a real answer.** Below threshold the Twin says it does not
 *      know yet. It never fills the gap with something plausible.
 *   4. **A miss is a good moment.** The wrong-prediction copy is interested, not
 *      apologetic. Being surprised by the player is the Twin working.
 *
 * Everything is pure and tested.
 */

/**
 * Resolved predictions needed before an accuracy *percentage* is shown.
 *
 * "100% accurate" off one prediction is technically true and completely
 * misleading, so below this the interface shows the raw tally instead.
 */
export const MIN_ACCURACY_SAMPLE = 4

/**
 * Recover the catch count from the stored rate.
 *
 * The server stores `observed_rate` as `round(catches / sample * 100, 2)`, and
 * two decimal places is more than enough to invert exactly at any sample size
 * this product will ever see. Done here rather than shipped as a second column
 * so the rate and the count can never disagree.
 */
export function catchesFrom(observedRate: number, sampleSize: number): number {
  if (!Number.isFinite(observedRate) || !Number.isFinite(sampleSize) || sampleSize <= 0) return 0
  const catches = Math.round((observedRate / 100) * sampleSize)
  return Math.min(sampleSize, Math.max(0, catches))
}

/**
 * The evidence behind a claim, as a sentence.
 *
 * Always a count out of a count, never a bare percentage: "7 of 9" invites the
 * player to judge the strength themselves, where "78%" hides how thin it is.
 */
export function describeEvidence(
  contextLabel: string,
  observedRate: number,
  sampleSize: number,
): string {
  const catches = catchesFrom(observedRate, sampleSize)
  return `In ${contextLabel} you've caught ${catches} of ${sampleSize}.`
}

/**
 * What the Twin thinks is about to happen.
 *
 * Hedged on purpose. The Twin is reading a tendency, not running a simulation,
 * and copy that sounded certain would be lying about what the model is.
 */
export function describePrediction(prediction: TwinPrediction): string {
  return prediction.predictedCatch
    ? 'My guess: you spot this one.'
    : 'My guess: this one slips past you.'
}

/** The evidence line under a live prediction. */
export function describePredictionEvidence(prediction: TwinPrediction): string {
  return describeEvidence(
    prediction.contextLabel,
    prediction.observedRate,
    prediction.sampleSize,
  )
}

export type TwinVerdictCopy = {
  /** Etched eyebrow. Names which of the two things happened. */
  eyebrow: string
  /** One line, in product voice. */
  line: string
}

/**
 * The reveal, after the player has decided.
 *
 * A miss is deliberately the warmer of the two. The Twin being wrong means the
 * player did something their own history did not predict, which is the single
 * best thing that can happen in a game about changing how you think — so it
 * reads as interest, never as an error and never as a correction.
 */
export function describeVerdict(verdict: TwinVerdict): TwinVerdictCopy {
  if (verdict.wasCorrect) {
    return {
      eyebrow: 'Twin prediction',
      line: verdict.predictedCatch
        ? 'Called it — I thought you had this one, and you did.'
        : 'Called it — I thought this one would get you.',
    }
  }

  return {
    eyebrow: 'The Twin missed',
    line: verdict.predictedCatch
      ? 'I had you catching this one. You went another way — my read was off.'
      : 'I expected this one to get you. It didn’t. Worth noticing.',
  }
}

/**
 * A pattern, written out.
 *
 * Prefers a generated narration when one exists, and falls back to the
 * deterministic sentence — which is what actually ships today, since nothing
 * generates narration yet. The fallback is the product, not a degraded mode.
 */
export function describePattern(pattern: TwinPattern): string {
  if (pattern.narration) return pattern.narration

  const evidence = describeEvidence(
    pattern.contextLabel,
    pattern.observedRate,
    pattern.sampleSize,
  )

  return pattern.predictsCatch
    ? `${evidence} This is a setting you read well.`
    : `${evidence} This setting keeps getting past you.`
}

export type TwinAccuracy = {
  resolved: number
  correct: number
  /** Null until the sample is large enough for a percentage to mean anything. */
  percentage: number | null
  /** The line to render, in either regime. */
  summary: string
}

/**
 * How often the Twin has been right.
 *
 * Below `MIN_ACCURACY_SAMPLE` this reports the tally and withholds the
 * percentage, for the same reason the Archive withholds a calibration verdict
 * on thin evidence: the number would be real and the impression false.
 */
export function summariseTwinAccuracy(resolved: number, correct: number): TwinAccuracy {
  const safeResolved = Math.max(0, Math.trunc(resolved) || 0)
  const safeCorrect = Math.min(safeResolved, Math.max(0, Math.trunc(correct) || 0))

  if (safeResolved === 0) {
    return { resolved: 0, correct: 0, percentage: null, summary: 'No predictions called yet.' }
  }

  if (safeResolved < MIN_ACCURACY_SAMPLE) {
    return {
      resolved: safeResolved,
      correct: safeCorrect,
      percentage: null,
      summary: `Right ${safeCorrect} of ${safeResolved} so far — too few to call.`,
    }
  }

  return {
    resolved: safeResolved,
    correct: safeCorrect,
    percentage: Math.round((safeCorrect / safeResolved) * 100),
    summary: `Right ${safeCorrect} of ${safeResolved} predictions.`,
  }
}

/**
 * The Twin's own account of its current state.
 *
 * Each sealed reason gets its own line — "come back later" and "something
 * broke" are different facts and must not wear the same copy.
 */
export function describeTwinStatus(twin: CognitiveTwinSlot): string {
  if (twin.status === 'sealed') {
    if (twin.reason === 'insufficient_history') {
      const remaining = Math.max(0, twin.required - twin.attempts)
      return `Not enough of your decisions on record yet — ${remaining} more and I can start reading them.`
    }
    return 'Your Twin can’t be read just now. Nothing on file is lost.'
  }

  if (twin.status === 'watching') {
    return 'I’ve been reading your decisions, but nothing leans far enough yet to call a pattern.'
  }

  const count = twin.patterns.length
  return `${count} ${count === 1 ? 'pattern' : 'patterns'} in your record so far.`
}
