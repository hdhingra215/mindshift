/**
 * Gameplay domain types (camelCase), mapped from the snake_case DB rows in the
 * API layer so UI/hooks never touch raw Supabase shapes.
 */

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

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

/** Result of a submitted (immutable) attempt. */
export type AttemptRecord = {
  id: string
  choice: GameChoice
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
