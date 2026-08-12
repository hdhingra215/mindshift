import type { StreakState } from '../types'

/**
 * Momentum — a streak expressed as a property of the world rather than a number
 * to collect.
 *
 * The product's whole position on streaks is that they must never become a debt
 * (GameDesign §5, InteractionPrinciples §13). So there is no counter, no badge,
 * no flame and no calendar here. What a run produces instead is *warmth*: a
 * scalar the environment consumes, and one plain sentence for anyone who wants
 * the number.
 *
 * Pure functions. No DOM, no React, no dates parsed from the client — the only
 * clock that matters already ran on the server.
 */

/** Days of practice at which momentum is considered fully established. */
const MOMENTUM_CEILING_DAYS = 14

/**
 * A run, as a 0–1 scalar.
 *
 * Square-rooted, so the first few days move the world visibly and the
 * fourteenth does not have to move it much. A player who has just started
 * deserves to see the room respond; a veteran does not need it to keep
 * escalating, and an effect that escalated forever would end up shouting.
 */
export function momentumOf(streak: StreakState | null): number {
  if (!streak || !streak.isLive) return 0
  const ratio = Math.min(1, streak.currentStreak / MOMENTUM_CEILING_DAYS)
  return Math.sqrt(ratio)
}

/**
 * The one line of text that carries the streak.
 *
 * This is the accessible channel: everything the environment expresses through
 * light is stated here in words, so momentum is never communicated by colour or
 * motion alone.
 *
 * Tone rules, in order of importance: never imply a deadline, never mention what
 * would be lost, never congratulate a number. Describe what is true.
 */
export function describeMomentum(streak: StreakState | null): string {
  if (!streak || streak.currentStreak === 0) {
    return streak?.longestStreak
      ? `Your longest run of deliberate practice was ${streak.longestStreak} days. Whenever you’re ready to start another.`
      : 'No run going yet. A couple of decisions, or one honest reflection, and today counts.'
  }

  const days = streak.currentStreak
  const span = `${days} ${days === 1 ? 'day' : 'days'}`

  if (streak.qualifiedToday === false) {
    // Factual, not urgent. It states what would make today count and stops.
    return `${span} of deliberate practice. Two decisions or one reflection and today joins them.`
  }

  if (streak.qualifiedToday === null) {
    // Whether today counts is unknown here, so it goes unmentioned rather than
    // asserted. Never tell a player something about their history that the
    // client cannot actually know.
    return streak.graceUsed > 0
      ? `${span} of deliberate practice, ${streak.graceUsed} of them forgiven.`
      : `${span} of deliberate practice.`
  }

  if (streak.graceUsed > 0) {
    return `${span} of deliberate practice, ${streak.graceUsed} of them forgiven. Consistency, not perfection.`
  }

  return `${span} of deliberate practice, today included.`
}

/**
 * A short label for the run, for places with no room for a sentence.
 *
 * Deliberately says "days", not a bare integer: a number on its own is the badge
 * this system exists to avoid.
 */
export function formatMomentum(streak: StreakState | null): string {
  if (!streak || streak.currentStreak === 0) return 'No run'
  return `${streak.currentStreak}-day run`
}
