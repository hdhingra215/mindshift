/**
 * Streaks feature — momentum.
 *
 * The final progression system, and the only one with no surface of its own. A
 * run does not get a card, a badge, a flame or a calendar; it gets *warmth* that
 * the world consumes and one sentence that states the truth for anyone who wants
 * the number.
 *
 * Contains no counting and no clock. The run is computed server-side from
 * attempt and reflection history inside the award transaction; this module turns
 * that result into a scalar and a sentence.
 */

export { describeMomentum, formatMomentum, momentumOf } from './lib/momentum'
export { streakStateSchema } from './lib/streak-schema'
export type { StreakState } from './types'
