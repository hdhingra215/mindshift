/**
 * Mastery domain types.
 *
 * Mastery is the game's primary progression signal — what the player has
 * actually learned, as opposed to XP, which records that they showed up. The
 * two are modelled separately on purpose and should never be merged into one
 * number (GameDesign §6).
 *
 * Every value here is computed by the database. The client renders mastery; it
 * never calculates it.
 */

export type MasteryTierId = 'unfamiliar' | 'aware' | 'practiced' | 'skilled' | 'mastered'

export type MasteryTier = {
  id: MasteryTierId
  /** Player-facing name. */
  label: string
  /** Lucide icon name — paired with the label so tier is never colour-only. */
  icon: string
  /** Inclusive lower bound of the tier, as a percentage. */
  min: number
  /** Inclusive upper bound of the tier, as a percentage. */
  max: number
  /** Tailwind text class bound to a semantic token. Never a raw colour. */
  toneClass: string
  /** Tailwind background class for the meter fill, same token. */
  fillClass: string
  /** One line, in product voice, describing what this tier actually means. */
  description: string
}

/**
 * How one bias moved as a result of a single attempt.
 *
 * `previousLevel` and `delta` are server-computed rather than diffed on the
 * client, so a reload or a second tab can never invent a gain that did not
 * happen.
 */
export type MasteryAward = {
  biasId: string
  biasSlug: string
  biasName: string
  /** Mastery after this attempt, 0–100. */
  masteryLevel: number
  /** Mastery before it. */
  previousLevel: number
  /** Change in percentage points. Zero when the ceiling is already reached. */
  delta: number
  /**
   * The highest mastery currently reachable for this bias, set by how many
   * distinct scenarios the player has recognised it in. Rises with breadth,
   * never with repetition.
   */
  ceiling: number
  distinctContexts: number
  totalAttempts: number
  correctAttempts: number
}
