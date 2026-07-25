import { supabase } from '@/lib/supabase/client'
import type {
  AttemptRecord,
  Difficulty,
  GameChoice,
  GameScenario,
  GameSession,
  ReflectionInput,
} from '../types'

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

// --- Raw row shapes (the nested select result) ------------------------------

type RawOutcome = {
  id: string
  result_text: string
  explanation: string
  is_correct: boolean
  xp_reward: number
}

type RawChoice = {
  id: string
  label: string
  body: string | null
  sort_order: number
  is_trap: boolean
  bias_id: string | null
  outcomes: RawOutcome[] | null
}

type RawBias = {
  slug: string
  name: string
  short_description: string | null
  counter_strategy: string | null
}

type RawScenario = {
  id: string
  slug: string
  title: string
  context: string
  stakes: string | null
  difficulty: Difficulty
  categories: { name: string } | null
  scenario_choices: RawChoice[] | null
  scenario_biases: { biases: RawBias | null }[] | null
  scenario_pack_items: { scenario_packs: { name: string } | null }[] | null
}

const SCENARIO_SELECT = `
  id, slug, title, context, stakes, difficulty,
  categories ( name ),
  scenario_choices ( id, label, body, sort_order, is_trap, bias_id,
    outcomes ( id, result_text, explanation, is_correct, xp_reward ) ),
  scenario_biases ( biases ( slug, name, short_description, counter_strategy ) ),
  scenario_pack_items ( scenario_packs ( name ) )
`

function mapScenario(row: RawScenario): GameScenario | null {
  const choices: GameChoice[] = (row.scenario_choices ?? [])
    .map((choice): GameChoice | null => {
      const outcome = choice.outcomes?.[0]
      if (!outcome) return null // a choice with no outcome can't be attempted
      return {
        id: choice.id,
        label: choice.label,
        body: choice.body,
        sortOrder: choice.sort_order,
        isTrap: choice.is_trap,
        biasId: choice.bias_id,
        outcome: {
          id: outcome.id,
          resultText: outcome.result_text,
          explanation: outcome.explanation,
          isCorrect: outcome.is_correct,
          xpReward: outcome.xp_reward,
        },
      }
    })
    .filter((c): c is GameChoice => c !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  // A scenario without at least two live choices isn't playable — skip it.
  if (choices.length < 2) return null

  const rawBias = row.scenario_biases?.[0]?.biases ?? null

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    context: row.context,
    stakes: row.stakes,
    difficulty: row.difficulty,
    categoryName: row.categories?.name ?? null,
    packName: row.scenario_pack_items?.[0]?.scenario_packs?.name ?? null,
    choices,
    primaryBias: rawBias
      ? {
          slug: rawBias.slug,
          name: rawBias.name,
          shortDescription: rawBias.short_description,
          counterStrategy: rawBias.counter_strategy,
        }
      : null,
  }
}

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

export async function finishSession(
  sessionId: string,
  totalAttempts: number,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('sessions')
    .update({
      ended_at: new Date().toISOString(),
      completed: true,
      total_attempts: totalAttempts,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  return { error: error ? GENERIC_WRITE_ERROR : null }
}

// --- Scenario --------------------------------------------------------------

/**
 * Fetch one playable published scenario the player hasn't seen this session.
 * Easy-first ordering (enum order) then slug — a gentle, deterministic ramp.
 * Returns `data: null, error: null` when nothing new is available (empty state).
 */
export async function fetchNextScenario(
  excludeIds: string[],
): Promise<Result<GameScenario | null>> {
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

  if (error) return { data: null, error: GENERIC_LOAD_ERROR }
  if (!data) return { data: null, error: null }

  const scenario = mapScenario(data as unknown as RawScenario)
  return { data: scenario, error: null }
}

// --- Attempt (immutable) ----------------------------------------------------

export async function submitAttempt(params: {
  sessionId: string
  playerId: string
  scenarioId: string
  choice: GameChoice
  responseTimeMs: number
}): Promise<Result<AttemptRecord>> {
  const { data, error } = await supabase
    .from('attempts')
    .insert({
      session_id: params.sessionId,
      player_id: params.playerId,
      scenario_id: params.scenarioId,
      selected_choice_id: params.choice.id,
      outcome_id: params.choice.outcome.id,
      bias_id: params.choice.biasId,
      response_time_ms: Math.max(0, Math.round(params.responseTimeMs)),
      reflected: false,
    })
    .select('id')
    .single()

  if (error || !data) return { data: null, error: GENERIC_WRITE_ERROR }
  return { data: { id: data.id, choice: params.choice }, error: null }
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
