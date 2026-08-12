/**
 * Streak domain types.
 *
 * A streak here is *momentum* — the continuity of deliberate practice — not a
 * score and not a possession. Nothing in this feature counts, decides or
 * advances anything: the run is computed server-side from attempt and reflection
 * history, and the client is told the result.
 */

export type StreakState = {
  /** Length of the live run in days, including any forgiven day inside it. */
  currentStreak: number
  /** Longest run ever. A high-water mark that never falls. */
  longestStreak: number
  /** Missed days sitting inside the live run. Forgiveness already spent. */
  graceUsed: number
  /** Last day that counted, ISO date. Null before any qualifying day. */
  lastActiveDay: string | null
  /**
   * Whether today already counts. Informative, never a deadline.
   *
   * `null` means *unknown*, which is the honest answer when the run was read
   * from the rollup rather than returned by an award: only the server's clock can
   * decide what "today" is, and guessing from a device clock would let the
   * interface state something false about the player's own history.
   */
  qualifiedToday: boolean | null
  /** True while a run is actually running. */
  isLive: boolean
}
