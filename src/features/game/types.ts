import type { AchievementUnlock } from '@/features/achievements'
import type { MasteryAward } from '@/features/mastery'

/**
 * Gameplay domain types (camelCase), mapped from the snake_case DB rows in the
 * API layer so UI/hooks never touch raw Supabase shapes.
 */

/**
 * The `public.difficulty_level` enum, in ladder order. Declared as a tuple so
 * the runtime validator and the compile-time type are the same list — a new
 * difficulty cannot be added to one and forgotten in the other.
 */
export const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'] as const

export type Difficulty = (typeof DIFFICULTIES)[number]

export type GameOutcome = {
  id: string
  resultText: string
  explanation: string
  isCorrect: boolean
  xpReward: number
}

export type GameChoice = {
  id: string
  label: string
  body: string | null
  sortOrder: number
  isTrap: boolean
  /** The bias this choice embodies (trap choices); null for correct/distractor. */
  biasId: string | null
  outcome: GameOutcome
}

export type GameBias = {
  slug: string
  name: string
  shortDescription: string | null
  counterStrategy: string | null
}

export type GameScenario = {
  id: string
  slug: string
  title: string
  context: string
  stakes: string | null
  difficulty: Difficulty
  categoryName: string | null
  packName: string | null
  choices: GameChoice[]
  /** The scenario's primary teaching bias (first linked bias), for the reveal. */
  primaryBias: GameBias | null
}

export type GameSession = {
  id: string
}

/**
 * Why a scenario load did not produce a playable scenario.
 *
 * These used to be one undifferentiated `null`, which is precisely how a
 * mapping bug spent a phase disguised as an empty content library. An empty
 * library is a *product* state; the other four are *defects*, and they must
 * never again share a screen.
 */
export type GameLoadFailureKind =
  /** The request never completed — offline, timeout, PostgREST error. */
  | 'queryFailed'
  /** RLS refused the read, or the session is no longer valid. */
  | 'permissionDenied'
  /** A row came back in a shape the client does not recognise. */
  | 'malformedData'
  /** A valid row that cannot be played — too few choices carry an outcome. */
  | 'unplayableData'

export type GameLoadFailure = {
  kind: GameLoadFailureKind
  /** Calm, player-facing line. The only field the UI is allowed to render. */
  message: string
  /** Engineer-facing detail. Logged, never displayed. */
  detail: string
}

/**
 * The outcome of asking for the next scenario.
 *
 * `exhausted` is deliberately its own state rather than an absent scenario:
 * "you have played everything" is a success, and the type should not let a
 * caller confuse it with a failure.
 */
export type ScenarioLoad =
  | { status: 'ok'; scenario: GameScenario }
  | { status: 'exhausted' }
  | { status: 'failed'; failure: GameLoadFailure }

/** Result of a submitted (immutable) attempt. */
export type AttemptRecord = {
  id: string
  choice: GameChoice
}

/**
 * The result of a server-side XP award — the client's only view of the economy.
 *
 * Every field is computed by the database and reported back; nothing here is
 * ever derived on the client. That is the point: if the UI could calculate XP,
 * there would be two economies and they would eventually disagree.
 *
 * The same shape is returned by every award path (play, reflection, and later
 * achievements and streaks), so the reward UI never learns a second payload.
 */
export type XpAward = {
  /** XP attributable to this award. Zero is legitimate (an authored 0 reward). */
  awarded: number
  /** False when the server returned an existing award instead of minting one. */
  awardedNow: boolean
  totalXp: number
  currentLevel: number
  levelTitle: string
  /** XP earned into the current level. */
  currentXp: number
  /** XP between this level and the next; null at the top of the ladder. */
  levelSpan: number | null
  leveledUp: boolean
  previousLevel: number
  /** Running XP for the current session, including this award. */
  sessionXp: number
  scenariosCompleted: number
  /**
   * How each bias this scenario teaches moved. Empty when the scenario has no
   * linked bias, or on a deployment predating the mastery engine — XP must
   * still land if mastery does not.
   */
  mastery: readonly MasteryAward[]
  /**
   * Achievements this award unlocked, smallest reward first so the biggest
   * moment lands last. Empty on almost every attempt — that is the point.
   */
  achievements: readonly AchievementUnlock[]
}

export type ReflectionInput = {
  text: string
  confidenceBefore: number | null
  confidenceAfter: number | null
  prompt: string | null
}

export type GamePhase =
  | 'initializing'
  | 'deciding'
  | 'submitting'
  | 'revealed'
  | 'loadingNext'
  | 'finishing'
  | 'summary'
  | 'empty'
  | 'error'
