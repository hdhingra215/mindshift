/**
 * Achievement domain types.
 *
 * An achievement records that the player *became better at something*, not that
 * they showed up enough times. Every one of the fourteen is earned by a learning
 * signal — recognition, transfer, calibration, recovery, breadth, consistency —
 * and the criteria that decide them live in content, evaluated server-side.
 *
 * The client is told what was unlocked. It never decides.
 */

/** One achievement the server just granted. */
export type AchievementUnlock = {
  achievementId: string
  slug: string
  name: string
  /**
   * Why this reflects real growth, authored per achievement. Presented as the
   * body of the reveal — recognition from a mentor, not a badge caption
   * (InteractionPrinciples §7).
   */
  description: string
  /** Lucide icon name from the seed. Unknown names fall back to a trophy. */
  icon: string
  /** XP granted alongside the unlock. Zero is legitimate. */
  xpReward: number
}
