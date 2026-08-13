import type { ObservatoryScene } from '@/features/dashboard'
import type { Database } from '@/types/database.types'

/**
 * Mind Archive domain types.
 *
 * The archive is the player's own record — not a profile page and not a report.
 * It is the room where the evidence of how they actually think is kept: the
 * instrument reading their mastery, the decisions that produced it, the marks
 * they collected, and their own words.
 *
 * Everything here is **read**. Nothing in this feature computes progression:
 * mastery, XP, accuracy, achievements and momentum are all owned by the
 * server-side pipeline and arrive already decided. What the archive *does*
 * derive are descriptive summaries of history — tempo, calibration, difficulty
 * spread — which carry no game consequence and are deliberately kept in one
 * pure, tested module (`lib/evidence.ts`).
 */

type Difficulty = Database['public']['Enums']['difficulty_level']

/**
 * One recorded decision, reduced to the facts the archive can describe.
 *
 * Not a domain object for gameplay — the attempt row is immutable and lives in
 * the game feature. This is the archival projection of it.
 */
export type ArchiveDecision = {
  isCorrect: boolean
  responseTimeMs: number
  reflected: boolean
  difficulty: Difficulty
}

/**
 * A confidence reading paired with what actually happened.
 *
 * Kept separate from `ArchiveDecision` because only reflected attempts have a
 * confidence value, and pretending otherwise would silently bias the sample.
 */
export type ArchiveCalibrationPoint = {
  /** 0–100, as the player set it before learning the outcome. */
  confidenceBefore: number
  isCorrect: boolean
}

/** One reflection, kept exactly as written. Reflections are never edited. */
/**
 * One settled wager, as the archive reads it.
 *
 * Only *resolved* wagers appear: an open stake has no outcome yet, and counting
 * it either way would make the conviction reading move on scenarios the player
 * has not finished. `delta` is the server's signed Insight movement, never
 * recomputed here.
 */
export type ArchiveWager = {
  stake: number
  wasCorrect: boolean
  delta: number
}

export type ArchiveReflection = {
  id: string
  text: string
  confidenceBefore: number | null
  confidenceAfter: number | null
  recordedAt: string
  /** The situation it was written about. Null if that scenario is gone. */
  scenarioTitle: string | null
}

/**
 * One achievement in the catalogue, found or not.
 *
 * The archive shows the whole set rather than only what was earned: an unfound
 * discovery is a legible thing still out there, which is the same argument that
 * puts all twelve biases in the observatory whether or not they have been met.
 */
export type ArchiveDiscovery = {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string
  /** Null when it has not been found yet. */
  unlockedAt: string | null
}

/** Which axis a Twin claim rests on. Only two exist, and both are in content. */
export type TwinContextKind = 'pack' | 'category'

/**
 * One thing the Twin has observed about how this player decides.
 *
 * A pattern is a *context* the player's record is lopsided in — nothing more.
 * It is never a trait, never a diagnosis, and it never exists below the server's
 * evidence thresholds, so a rendered pattern is always backed by the sample size
 * shown next to it.
 */
export type TwinPattern = {
  contextKind: TwinContextKind
  /** Player-facing name — "Money & Spending", "Decision & Framing". */
  contextLabel: string
  sampleSize: number
  /** Decisions caught in this context. */
  catches: number
  /** Catch rate, 0–100. */
  observedRate: number
  /** Which way the pattern leans. True = this player tends to catch it here. */
  predictsCatch: boolean
  /** Distance from a coin flip, 0.5–1. The ranking key. */
  edge: number
  /**
   * A written-out version of this pattern, if one was ever generated.
   *
   * **Always null today.** This is the declared boundary for a future narration
   * layer, and the interface must render the deterministic sentence whenever it
   * is absent — the Twin can never depend on a language model to be able to
   * speak, and no shipped copy is model-authored.
   */
  narration: string | null
}

/** A prediction the Twin made and the player has since answered. */
export type TwinResolvedPrediction = {
  id: string
  contextKind: TwinContextKind
  contextLabel: string
  predictedCatch: boolean
  actualCatch: boolean
  wasCorrect: boolean
  sampleSize: number
  observedRate: number
  resolvedAt: string
}

/**
 * The Cognitive Twin, as the Archive sees it.
 *
 * Three states, and the honesty gate is structural rather than a flag: below the
 * evidence floor the type carries **no patterns at all**, so an interface cannot
 * accidentally render a claim that was never made.
 *
 *   sealed     not enough decisions on record to say anything
 *   watching   enough history, but no context is lopsided enough to be a pattern
 *   observing  has at least one pattern
 */
export type CognitiveTwinSlot =
  | {
      status: 'sealed'
      reason: 'insufficient_history' | 'forbidden' | 'unavailable'
      attempts: number
      required: number
    }
  | { status: 'watching'; attempts: number }
  | {
      status: 'observing'
      attempts: number
      patterns: readonly TwinPattern[]
      predictionsResolved: number
      predictionsCorrect: number
      recent: readonly TwinResolvedPrediction[]
    }

/** A prediction the Twin is making about the scenario in front of the player. */
export type TwinPrediction = {
  predictionId: string
  /** True = "I think you'll catch this one". */
  predictedCatch: boolean
  contextKind: TwinContextKind
  contextLabel: string
  sampleSize: number
  observedRate: number
}

/**
 * The answer to "does the Twin have anything to say about this scenario?"
 *
 * Silence carries a reason rather than being an absent value, so the game can
 * tell "not enough evidence" apart from "deliberately quiet right now" — and so
 * a failed read never renders as the Twin having no opinion.
 */
export type TwinPredictionRequest =
  | { status: 'ready'; prediction: TwinPrediction }
  | {
      status: 'quiet'
      reason: 'insufficient_history' | 'cooldown' | 'no_pattern' | 'unauthenticated' | 'unavailable'
    }

/** How a prediction turned out, returned by the award that resolved it. */
export type TwinVerdict = {
  predictionId: string
  predictedCatch: boolean
  actualCatch: boolean
  wasCorrect: boolean
  contextKind: TwinContextKind
  contextLabel: string
  sampleSize: number
  observedRate: number
}

/** Everything the archive holds about one player. */
export type ArchiveRecord = {
  /** When the archive was opened — the profile's creation date. */
  openedAt: string | null
  /**
   * The observatory scene, unchanged. The archive embeds the dashboard's
   * instrument rather than building a second view of mastery.
   */
  observatory: ObservatoryScene
  decisions: readonly ArchiveDecision[]
  calibration: readonly ArchiveCalibrationPoint[]
  /**
   * True when the decision read hit its cap, so the summaries below describe a
   * recent window rather than all of history. Surfaced in copy — an archive that
   * quietly narrows its own scope is lying.
   */
  decisionsTruncated: boolean
  /** Settled wagers, newest first. Empty for a player who has never staked. */
  wagers: ArchiveWager[]
  reflections: readonly ArchiveReflection[]
  /** Total reflections written, which may exceed the number shown. */
  reflectionTotal: number
  discoveries: readonly ArchiveDiscovery[]
  twin: CognitiveTwinSlot
}

export type ArchiveLoad =
  | { status: 'loading' }
  | { status: 'ready'; record: ArchiveRecord }
  | { status: 'failed'; message: string }
