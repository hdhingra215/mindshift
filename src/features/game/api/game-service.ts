import { z } from 'zod'

import { supabase } from '@/lib/supabase/client'
import type {
  AttemptRecord,
  GameChoice,
  GameSession,
  ReflectionInput,
  ScenarioLoad,
} from '../types'
import { classifyQueryError, loadFailure, reportLoadFailure } from './load-failure'
import { SCENARIO_SELECT, parseScenarioRow } from './scenario-row'

/**
 * Gameplay data access. Every read is RLS-gated (published content only) and
 * every write is owner-scoped via the authenticated anon client. No hardcoded
 * content — scenarios, choices, outcomes, and biases all come from Supabase.
 */

type Result<T> = { data: T; error: null } | { data: null; error: string }

const GENERIC_LOAD_ERROR =
  'We couldn’t load that just now — the connection may have wavered. Your progress is safe.'
const GENERIC_WRITE_ERROR =
  'That didn’t save just now. Nothing’s lost — give it another go.'

// --- Session ---------------------------------------------------------------

/**
 * Reuse the player's open session if one exists (recovers gracefully from an
 * interrupted session / a second tab), otherwise create one.
 */
export async function getOrCreateSession(
  playerId: string,
): Promise<Result<GameSession>> {
  const existing = await supabase
    .from('sessions')
    .select('id')
    .eq('player_id', playerId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing.error) return { data: null, error: GENERIC_LOAD_ERROR }
  if (existing.data) return { data: { id: existing.data.id }, error: null }

  const created = await supabase
    .from('sessions')
    .insert({ player_id: playerId })
    .select('id')
    .single()

  if (created.error || !created.data) {
    return { data: null, error: GENERIC_LOAD_ERROR }
  }
  return { data: { id: created.data.id }, error: null }
}

/**
 * Close a session. Only the lifecycle columns are written here — the counters
 * (`total_attempts`, `total_xp_earned`) are owned by the XP engine's
 * `refresh_session_rollups`, which derives them from the ledger on every award.
 * Writing them from the client too would be a second, weaker calculation.
 */
export async function finishSession(
  sessionId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('sessions')
    .update({
      ended_at: new Date().toISOString(),
      completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  return { error: error ? GENERIC_WRITE_ERROR : null }
}

// --- Scenario --------------------------------------------------------------

/**
 * Fetch one playable published scenario the player hasn't seen this session.
 * Easy-first ordering (enum order) then slug — a gentle, deterministic ramp.
 *
 * Returns a discriminated `ScenarioLoad` rather than a nullable scenario. The
 * nullable version could not distinguish "you have played everything" from
 * "the row was unreadable", so a defect rendered as a content state and stayed
 * invisible. Every branch below is now named, and every defect is reported.
 */
export async function fetchNextScenario(excludeIds: string[]): Promise<ScenarioLoad> {
  let query = supabase
    .from('scenarios')
    .select(SCENARIO_SELECT)
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('difficulty', { ascending: true })
    .order('slug', { ascending: true })
    .limit(1)

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    const failure = classifyQueryError(error)
    reportLoadFailure('fetchNextScenario', failure)
    return { status: 'failed', failure }
  }

  // No row: the library is exhausted for this session. A product state, not a
  // defect — nothing is logged and the player gets the empty state.
  if (!data) return { status: 'exhausted' }

  const parsed = parseScenarioRow(data)

  if (parsed.status === 'malformed') {
    const failure = loadFailure('malformedData', parsed.detail)
    reportLoadFailure('fetchNextScenario', failure)
    return { status: 'failed', failure }
  }

  if (parsed.status === 'unplayable') {
    const failure = loadFailure('unplayableData', parsed.detail)
    reportLoadFailure('fetchNextScenario', failure)
    return { status: 'failed', failure }
  }

  return { status: 'ok', scenario: parsed.scenario }
}

// --- Attempt (immutable) ----------------------------------------------------

/**
 * The reveal, as `submit_attempt` returns it.
 *
 * Parsed rather than asserted — the rule this file's sibling learned the hard
 * way. A malformed reveal must surface here, not as `undefined` in the UI.
 */
const submitResultSchema = z.object({
  attempt_id: z.string().min(1),
  selected_choice_id: z.string().min(1),
  outcome: z.object({
    id: z.string().min(1),
    is_correct: z.boolean(),
    result_text: z.string(),
    explanation: z.string(),
    xp_reward: z.coerce.number().int(),
  }),
})

/**
 * Record a decision and get back what it turned out to be.
 *
 * ── Why this is an RPC and not an insert ────────────────────────────────────
 * The client used to supply `outcome_id` on the attempt row, which meant it
 * could record a trap choice against the *correct* outcome and collect the XP,
 * the mastery credit and the wager payout for an answer it did not give. The
 * insert policy is gone (Phase 8.6); the server derives the outcome from the
 * chosen choice, so correctness is no longer something the client can assert.
 *
 * One round trip, because the reveal is the same fact as the submission — asking
 * again would only add latency between the decision and its consequence.
 */
export async function submitAttempt(params: {
  sessionId: string
  scenarioId: string
  choice: GameChoice
  responseTimeMs: number
}): Promise<Result<AttemptRecord>> {
  const { data, error } = await supabase.rpc('submit_attempt', {
    p_session_id: params.sessionId,
    p_scenario_id: params.scenarioId,
    p_choice_id: params.choice.id,
    p_response_time_ms: Math.max(0, Math.round(params.responseTimeMs)),
  })

  if (error) {
    console.error(`[game:submit:${error.code}] ${error.message}`)
    return { data: null, error: GENERIC_WRITE_ERROR }
  }

  const parsed = submitResultSchema.safeParse(data)
  if (!parsed.success) {
    console.error('[game:submit:malformed]', parsed.error.issues)
    return { data: null, error: GENERIC_WRITE_ERROR }
  }

  return {
    data: {
      id: parsed.data.attempt_id,
      choice: params.choice,
      outcome: {
        id: parsed.data.outcome.id,
        resultText: parsed.data.outcome.result_text,
        explanation: parsed.data.outcome.explanation,
        isCorrect: parsed.data.outcome.is_correct,
        xpReward: parsed.data.outcome.xp_reward,
      },
    },
    error: null,
  }
}

// --- Reflection (immutable) -------------------------------------------------

/**
 * Persist a reflection. The schema requires non-empty `reflection_text`, so a
 * reflection row is only created when the player writes something; confidence
 * values ride along on that row (never overwritten — reflections are immutable).
 */
export async function saveReflection(params: {
  attemptId: string
  playerId: string
  input: ReflectionInput
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('reflections').insert({
    attempt_id: params.attemptId,
    player_id: params.playerId,
    reflection_text: params.input.text.trim(),
    prompt: params.input.prompt,
    confidence_before: params.input.confidenceBefore,
    confidence_after: params.input.confidenceAfter,
  })

  return { error: error ? GENERIC_WRITE_ERROR : null }
}
