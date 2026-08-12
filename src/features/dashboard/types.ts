import type { MasteryTier } from '@/features/mastery'
import type { StreakState } from '@/features/streaks'

/**
 * Observatory domain types.
 *
 * The dashboard is not a report. It is an instrument the player looks *through*
 * at their own thinking, so these types describe a scene: what is lit, what is
 * still dark, and how far each thing sits from the centre.
 *
 * Every value is read from the progression tables the server owns. The
 * observatory computes geometry from them and nothing else.
 */

/** One of the twelve biases, as an object in the scene. */
export type ObservatoryBias = {
  slug: string
  name: string
  /** The family it belongs to. Groups the scene into recognisable regions. */
  categoryName: string | null
  /** 0–100. Zero for a bias never encountered. */
  masteryLevel: number
  /** Distinct scenarios in which it has been recognised. Breadth, not volume. */
  distinctContexts: number
  totalAttempts: number
  /** Null until it has been met at all. */
  lastPracticedAt: string | null
  tier: MasteryTier
}

/** An achievement already collected, as a docked mark on the rim. */
export type ObservatoryAchievement = {
  id: string
  name: string
  icon: string
  unlockedAt: string
}

/**
 * The whole scene.
 *
 * `isNewcomer` exists because an empty observatory is the most important frame
 * in the product and must not be a degraded version of the full one — a dark
 * field of twelve unlit points is the honest, and far more inviting, picture of
 * a mind before training (InteractionPrinciples §4).
 */
export type ObservatoryScene = {
  level: number
  levelTitle: string
  totalXp: number
  /** XP into the current level, and the span to the next; null at the top. */
  currentXp: number
  levelSpan: number | null
  scenariosCompleted: number
  accuracy: number
  biases: readonly ObservatoryBias[]
  achievements: readonly ObservatoryAchievement[]
  /**
   * Momentum. Null until the streak engine is deployed — the scene must render
   * a cold world rather than fail when the newest rollup is absent.
   */
  streak: StreakState | null
  isNewcomer: boolean
}

export type ObservatoryLoad =
  | { status: 'loading' }
  | { status: 'ready'; scene: ObservatoryScene }
  | { status: 'failed'; message: string }
