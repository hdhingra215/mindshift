import { MASTERY_MAX, type MasteryTierId } from '@/features/mastery'
import type { ObservatoryBias } from '@/features/dashboard'

import type { ArchiveCalibrationPoint, ArchiveDecision, ArchiveWager } from '../types'

/**
 * Descriptive summaries of a player's recorded history.
 *
 * ── The line this module must not cross ─────────────────────────────────────
 * Nothing here computes progression. XP, mastery, accuracy, achievements and
 * momentum are decided by the database and arrive already settled; recomputing
 * any of them on the client would create a second, drifting answer to a question
 * the server already owns.
 *
 * What these functions do instead is *describe the record*: how quickly
 * decisions were made, how often they were reflected on, how confidence lined up
 * with outcomes, where mastery sits across the twelve. None of it feeds back into
 * the game, none of it unlocks anything, and none of it draws a conclusion about
 * the player. It reports what is written down.
 *
 * That distinction is also why this file is pure and tested: it is the only
 * place in the archive where a number is derived rather than read.
 */

/**
 * Below this many reflected decisions, calibration says nothing.
 *
 * Stating "your confidence runs ahead of your accuracy" from two data points
 * would be inventing a behavioural conclusion, which is exactly what this
 * product refuses to do before the Cognitive Twin exists to do it properly.
 */
export const MIN_CALIBRATION_SAMPLE = 5

/**
 * Percentage points of gap within which confidence and accuracy are called
 * aligned. Wide on purpose — a tight band would flip direction on noise.
 */
const CALIBRATION_TOLERANCE = 10

export type DecisionSummary = {
  /** Decisions in the window described. Zero for a new player. */
  total: number
  /** Median milliseconds to decide. Null when nothing is recorded. */
  medianResponseMs: number | null
  /** Share of decisions the player also reflected on, 0–1. */
  reflectionRate: number
  /** Clears per difficulty, in ladder order, omitting untouched rungs. */
  byDifficulty: readonly DifficultyBand[]
}

export type DifficultyBand = {
  difficulty: ArchiveDecision['difficulty']
  attempted: number
  caught: number
}

/** Difficulty in ladder order, so the readout never reshuffles. */
const DIFFICULTY_ORDER = ['easy', 'medium', 'hard', 'expert'] as const

/**
 * Reduce the decision record to what the archive can honestly display.
 *
 * Accuracy is deliberately absent: `progress.overall_accuracy` is the server's
 * number and the only one the product should ever show. Per-difficulty clears
 * are included because the server exposes no such breakdown, and a player who
 * catches every easy trap but no hard one is looking at the single most useful
 * fact in their own record.
 */
export function summariseDecisions(decisions: readonly ArchiveDecision[]): DecisionSummary {
  if (decisions.length === 0) {
    return { total: 0, medianResponseMs: null, reflectionRate: 0, byDifficulty: [] }
  }

  const reflected = decisions.reduce((count, decision) => count + (decision.reflected ? 1 : 0), 0)

  const bands = DIFFICULTY_ORDER.flatMap<DifficultyBand>((difficulty) => {
    const band = decisions.filter((decision) => decision.difficulty === difficulty)
    if (band.length === 0) return []
    return [
      {
        difficulty,
        attempted: band.length,
        caught: band.reduce((count, decision) => count + (decision.isCorrect ? 1 : 0), 0),
      },
    ]
  })

  return {
    total: decisions.length,
    medianResponseMs: median(decisions.map((decision) => decision.responseTimeMs)),
    reflectionRate: reflected / decisions.length,
    byDifficulty: bands,
  }
}

/**
 * Median rather than mean.
 *
 * One decision left open in a background tab for an hour would drag a mean into
 * meaninglessness. The median describes the player's actual habit and shrugs off
 * the outlier without needing a rule about what counts as one.
 */
function median(values: readonly number[]): number | null {
  const usable = values.filter((value) => Number.isFinite(value) && value >= 0).sort((a, b) => a - b)
  if (usable.length === 0) return null

  const middle = Math.floor(usable.length / 2)
  return usable.length % 2 === 1
    ? usable[middle]!
    : Math.round((usable[middle - 1]! + usable[middle]!) / 2)
}

export type CalibrationSummary = {
  sampleSize: number
  /** Mean stated confidence, 0–100. Null below the sample floor. */
  averageConfidence: number | null
  /** Share of those same decisions that were correct, as 0–100. Null below the floor. */
  observedAccuracy: number | null
  /** Signed points of confidence minus accuracy. Null below the floor. */
  gap: number | null
  /**
   * How the two numbers relate — a statement about the numbers, never about the
   * person. `insufficient` is a first-class answer, not a failure.
   */
  direction: 'ahead' | 'behind' | 'aligned' | 'insufficient'
}

/**
 * Compare what the player said they knew against what happened.
 *
 * Calibration is the one pattern in this product that a player genuinely cannot
 * see from the inside, which is why it earns a place in the archive. It is
 * reported as two numbers and their difference — the interface names the gap and
 * stops there, because "you are overconfident" is a judgement about a person and
 * this screen only holds evidence.
 */
export function summariseCalibration(
  points: readonly ArchiveCalibrationPoint[],
): CalibrationSummary {
  const usable = points.filter(
    (point) => Number.isFinite(point.confidenceBefore) && point.confidenceBefore >= 0,
  )

  if (usable.length < MIN_CALIBRATION_SAMPLE) {
    return {
      sampleSize: usable.length,
      averageConfidence: null,
      observedAccuracy: null,
      gap: null,
      direction: 'insufficient',
    }
  }

  const averageConfidence =
    usable.reduce((sum, point) => sum + point.confidenceBefore, 0) / usable.length
  const observedAccuracy =
    (usable.reduce((count, point) => count + (point.isCorrect ? 1 : 0), 0) / usable.length) * 100
  const gap = averageConfidence - observedAccuracy

  return {
    sampleSize: usable.length,
    averageConfidence: Math.round(averageConfidence),
    observedAccuracy: Math.round(observedAccuracy),
    gap: Math.round(gap),
    direction:
      Math.abs(gap) <= CALIBRATION_TOLERANCE ? 'aligned' : gap > 0 ? 'ahead' : 'behind',
  }
}

export type FamilyStanding = {
  name: string
  /** Mean mastery across the family, 0–100. */
  averageMastery: number
  /** How many of its biases have been met at all. */
  metCount: number
  size: number
}

/**
 * Mastery grouped by bias family, strongest first.
 *
 * The observatory already arranges families spatially; this is the same fact in
 * a form a screen reader can read out, which is what keeps the scene from being
 * a picture that only sighted players can use.
 */
export function standingsByFamily(biases: readonly ObservatoryBias[]): FamilyStanding[] {
  const families = new Map<string, ObservatoryBias[]>()

  for (const bias of biases) {
    const name = bias.categoryName ?? 'Unfiled'
    const existing = families.get(name)
    if (existing) existing.push(bias)
    else families.set(name, [bias])
  }

  return [...families.entries()]
    .map(([name, members]) => ({
      name,
      averageMastery:
        Math.round(
          (members.reduce((sum, bias) => sum + bias.masteryLevel, 0) / members.length) * 10,
        ) / 10,
      metCount: members.filter((bias) => bias.totalAttempts > 0).length,
      size: members.length,
    }))
    .sort((a, b) => b.averageMastery - a.averageMastery || a.name.localeCompare(b.name))
}

/**
 * How the twelve biases sit across the tier ladder.
 *
 * A shape, not a score: five counts summing to twelve. It answers "where am I
 * broadly" without inventing an overall mastery figure, which the product
 * deliberately does not have.
 */
export function masteryDistribution(
  biases: readonly ObservatoryBias[],
): Record<MasteryTierId, number> {
  const distribution: Record<MasteryTierId, number> = {
    unfamiliar: 0,
    aware: 0,
    practiced: 0,
    skilled: 0,
    mastered: 0,
  }

  for (const bias of biases) {
    distribution[bias.tier.id] += 1
  }

  return distribution
}

/**
 * The single most-integrated bias — the archive's counterweight to the
 * dashboard's "weakest known".
 *
 * Only counts biases actually met, and only above the floor tier: crowning a
 * bias the player has never encountered would be the archive congratulating
 * someone for a blank.
 */
export function strongestKnown(biases: readonly ObservatoryBias[]): ObservatoryBias | null {
  const known = biases.filter((bias) => bias.totalAttempts > 0 && bias.masteryLevel > 0)
  if (known.length === 0) return null

  return known.reduce((strongest, bias) =>
    bias.masteryLevel > strongest.masteryLevel ? bias : strongest,
  )
}

/** A response time as a short, plain reading — `"12s"`, `"1m 04s"`. */
export function formatDeliberation(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return '—'

  const totalSeconds = Math.round(ms / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

/** A 0–1 share as a whole percentage — `"38%"`. */
export function formatShare(share: number): string {
  const bounded = Math.min(1, Math.max(0, Number.isFinite(share) ? share : 0))
  return `${Math.round(bounded * 100)}%`
}

/** Mastery averaged across a family, as a percentage of the scale. */
export function formatFamilyMastery(standing: FamilyStanding): string {
  return `${Math.round((standing.averageMastery / MASTERY_MAX) * 100)}%`
}

/**
 * Wagers needed before conviction is described at all.
 *
 * Higher than the calibration floor, and deliberately so: a conviction reading
 * compares two accuracies, and a difference between two small samples is noise
 * wearing the clothes of a finding. Six settled stakes is still not many — the
 * copy says the count every time, so the player can weigh it themselves.
 */
export const MIN_CONVICTION_SAMPLE = 6

/** Points of difference inside which staked and overall accuracy are the same. */
const CONVICTION_TOLERANCE = 5

export type ConvictionBand = {
  stake: number
  attempts: number
  correct: number
  /** 0–100. Null below the per-tier floor — a tier is not a claim on two rows. */
  accuracy: number | null
}

export type ConvictionSummary = {
  /** Settled wagers in the record. */
  sampleSize: number
  /** Accuracy on the decisions the player staked on, 0–100. Null below the floor. */
  stakedAccuracy: number | null
  /** Signed points: staked accuracy minus overall accuracy. Null below the floor. */
  edge: number | null
  /**
   * What the two numbers say about each other. `insufficient` is a first-class
   * answer, exactly as it is for calibration.
   */
  direction: 'sharper' | 'looser' | 'level' | 'insufficient'
  /** Mean stake, in Insight. Null below the floor. */
  averageStake: number | null
  /** Net Insight across every settled wager. Signed, and always exact. */
  netInsight: number
  /** Per-tier breakdown, ascending by stake. Only tiers actually used appear. */
  bands: ConvictionBand[]
}

/** A tier needs at least this many settled wagers before it states an accuracy. */
const MIN_BAND_SAMPLE = 3

/**
 * Conviction — whether the player's certainty tracks their judgement.
 *
 * The Blind Wager mechanic exists to measure one thing that confidence cannot:
 * not how sure someone *says* they are, but how much they will put behind it
 * (§4.7). This turns the settled record into that reading.
 *
 * ── Why it compares against overall accuracy ────────────────────────────────
 * A staked accuracy on its own says nothing — 70% is excellent for a player who
 * is right 55% of the time and poor for one who is right 85% of the time. The
 * *difference* is the measurement, which is also why the sample floor here is
 * higher than anywhere else in the archive: it is a comparison of two rates.
 *
 * Descriptive only, like everything in this file. It reports two numbers and
 * the gap between them and stops; "you are overconfident" is a claim about a
 * person, and the archive does not make those.
 */
export function summariseConviction(
  wagers: readonly ArchiveWager[],
  overallAccuracy: number,
): ConvictionSummary {
  const netInsight = wagers.reduce((total, wager) => total + wager.delta, 0)

  const byStake = new Map<number, { attempts: number; correct: number }>()
  for (const wager of wagers) {
    const band = byStake.get(wager.stake) ?? { attempts: 0, correct: 0 }
    band.attempts += 1
    band.correct += wager.wasCorrect ? 1 : 0
    byStake.set(wager.stake, band)
  }

  const bands: ConvictionBand[] = [...byStake.entries()]
    .sort(([a], [b]) => a - b)
    .map(([stake, band]) => ({
      stake,
      attempts: band.attempts,
      correct: band.correct,
      accuracy:
        band.attempts >= MIN_BAND_SAMPLE
          ? Math.round((band.correct / band.attempts) * 100)
          : null,
    }))

  if (wagers.length < MIN_CONVICTION_SAMPLE) {
    return {
      sampleSize: wagers.length,
      stakedAccuracy: null,
      edge: null,
      direction: 'insufficient',
      averageStake: null,
      netInsight,
      bands,
    }
  }

  const correct = wagers.reduce((count, wager) => count + (wager.wasCorrect ? 1 : 0), 0)
  const stakedAccuracy = (correct / wagers.length) * 100
  const edge = stakedAccuracy - overallAccuracy
  const averageStake = wagers.reduce((total, wager) => total + wager.stake, 0) / wagers.length

  return {
    sampleSize: wagers.length,
    stakedAccuracy: Math.round(stakedAccuracy),
    edge: Math.round(edge),
    direction:
      Math.abs(edge) <= CONVICTION_TOLERANCE ? 'level' : edge > 0 ? 'sharper' : 'looser',
    averageStake: Math.round(averageStake),
    netInsight,
    bands,
  }
}

/**
 * The conviction reading, in one sentence.
 *
 * Same four rules the Twin's copy follows: evidence never diagnosis, never
 * certainty, silence is a real answer, and nothing here scolds. A player whose
 * conviction runs ahead of their judgement is told what the two numbers are,
 * not what kind of person that makes them.
 */
export function describeConviction(summary: ConvictionSummary): string {
  if (summary.direction === 'insufficient') {
    return summary.sampleSize === 0
      ? 'No stakes settled yet. Backing a decision with Insight is how this reading gets made — it measures conviction, which is a different thing from confidence.'
      : `${summary.sampleSize} ${summary.sampleSize === 1 ? 'stake has' : 'stakes have'} settled. A few more and this can compare how you do when you commit against how you do overall.`
  }

  const staked = `${summary.stakedAccuracy}%`
  const across = `across ${summary.sampleSize} staked ${summary.sampleSize === 1 ? 'decision' : 'decisions'}`

  if (summary.direction === 'level') {
    return `Right ${staked} of the time when you stake, ${across} — the same rate as when you don't. Your conviction is tracking your judgement.`
  }

  if (summary.direction === 'sharper') {
    return `Right ${staked} of the time when you stake, ${across} — ${Math.abs(summary.edge ?? 0)} points above your overall rate. You are backing the ones you actually know.`
  }

  return `Right ${staked} of the time when you stake, ${across} — ${Math.abs(summary.edge ?? 0)} points below your overall rate. Conviction ran ahead of judgement on these.`
}

/** The Insight movement, stated plainly and never softened. */
export function formatInsightMovement(net: number): string {
  if (net === 0) return 'Even, overall.'
  return net > 0 ? `+${net} Insight, overall.` : `${net} Insight, overall.`
}
