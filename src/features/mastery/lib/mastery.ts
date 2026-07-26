import { MASTERY_MAX, MASTERY_TIERS } from '../constants'
import type { MasteryAward, MasteryTier } from '../types'

/**
 * Mastery presentation helpers.
 *
 * The one place mastery is interpreted for display. These functions read
 * server-computed values and turn them into tiers, fractions and copy — they
 * never compute mastery itself, because there is exactly one mastery
 * calculation and it lives in the database.
 *
 * Everything here is pure, so the dashboard, the profile and the bias codex can
 * reuse it without dragging any gameplay state along.
 */

function clampToScale(level: number): number {
  if (!Number.isFinite(level)) return 0
  return Math.min(MASTERY_MAX, Math.max(0, level))
}

/**
 * The tier a mastery level falls in.
 *
 * Falls back to the first tier rather than throwing: a malformed number should
 * degrade to "Unfamiliar", never blank out a reveal the player earned.
 */
export function getMasteryTier(level: number): MasteryTier {
  const value = clampToScale(level)
  return (
    MASTERY_TIERS.find((tier) => value >= tier.min && value <= tier.max) ??
    MASTERY_TIERS[0]
  )
}

/** True when this attempt moved the player into a new tier. */
export function hasTierChanged(award: MasteryAward): boolean {
  return getMasteryTier(award.previousLevel).id !== getMasteryTier(award.masteryLevel).id
}

export type MasteryProgress = {
  /** Fill fraction for a meter, 0–1. */
  fraction: number
  /** Where the fill sat before this attempt, 0–1. Used as the animation origin. */
  previousFraction: number
  /** Where the current ceiling sits on the same scale, 0–1. */
  ceilingFraction: number
  /** True when more repetition cannot help — only a new context can. */
  atCeiling: boolean
}

/**
 * Everything a meter needs to draw itself, on one 0–1 scale.
 *
 * The ceiling is exposed rather than hidden because it is the most useful thing
 * the model can tell a player: when the bar stops moving, the answer is not
 * "play this again harder", it is "meet this bias somewhere else".
 */
export function getMasteryProgress(award: MasteryAward): MasteryProgress {
  const level = clampToScale(award.masteryLevel)
  const ceiling = clampToScale(award.ceiling)

  return {
    fraction: level / MASTERY_MAX,
    previousFraction: clampToScale(award.previousLevel) / MASTERY_MAX,
    ceilingFraction: ceiling / MASTERY_MAX,
    // A hair of tolerance: mastery approaches its ceiling asymptotically and
    // rounds to two decimals, so exact equality would almost never be true.
    atCeiling: ceiling - level < 0.5,
  }
}

/** A mastery level as a whole percentage — `"63%"`. */
export function formatMastery(level: number): string {
  return `${Math.round(clampToScale(level))}%`
}

/**
 * A gain as a signed string — `"+3%"` — or null when nothing moved.
 *
 * Null rather than `"+0%"`: a zero that renders is a reward moment that quietly
 * says the player wasted their time. The caller shows the reason instead.
 */
export function formatMasteryDelta(delta: number): string | null {
  const rounded = Math.round(delta)
  if (rounded <= 0) return null
  return `+${rounded}%`
}

/**
 * The line shown when an attempt earned no mastery.
 *
 * Two very different situations wear the same zero, and conflating them would
 * teach the player the wrong lesson about their own progress.
 */
export function describeNoGain(award: MasteryAward): string {
  return getMasteryProgress(award).atCeiling
    ? 'As far as this situation can take you — meet this bias somewhere new to push further.'
    : 'Already counted. Repeating a scenario you know teaches less than a fresh one.'
}
