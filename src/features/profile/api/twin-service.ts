import { z } from 'zod'

import { supabase } from '@/lib/supabase/client'

import type {
  CognitiveTwinSlot,
  TwinPredictionRequest,
  TwinVerdict,
} from '../types'
import { catchesFrom } from '../lib/twin'

/**
 * Cognitive Twin data access.
 *
 * Two RPCs and nothing else. The inference lives in SQL (`twin_predict_scenario`,
 * `twin_state`), so this module carries no thresholds, no scoring and no
 * eligibility logic — everything it could hold is something a player could then
 * tamper with, and the whole value of a prediction is that it was fixed before
 * the answer was known.
 *
 * Both functions return `jsonb`, which the generated types can only describe as
 * `Json`. They are **parsed, not asserted**, for the reason recorded in
 * `scenario-row.ts`: a cast is an unverified promise, and this product has
 * already lost a phase to one.
 */

const contextKindSchema = z.enum(['pack', 'category'])

const predictionSchema = z.object({
  eligible: z.literal(true),
  prediction_id: z.string(),
  predicted_catch: z.boolean(),
  context_kind: contextKindSchema,
  context_label: z.string(),
  sample_size: z.coerce.number().int(),
  observed_rate: z.coerce.number(),
})

const declinedSchema = z.object({
  eligible: z.literal(false),
  reason: z.enum(['insufficient_history', 'cooldown', 'no_pattern', 'unauthenticated']),
})

/**
 * Ask whether the Twin has anything to say about this scenario.
 *
 * Every failure path resolves to `quiet`, never to a thrown error or a broken
 * screen: the Twin is an occasional guest in the game loop and must never be
 * able to block a decision the player came here to make.
 */
export async function requestTwinPrediction(scenarioId: string): Promise<TwinPredictionRequest> {
  const { data, error } = await supabase.rpc('twin_predict_scenario', {
    p_scenario_id: scenarioId,
  })

  if (error) {
    console.error(`[twin:${error.code}] prediction failed — ${error.message}`)
    return { status: 'quiet', reason: 'unavailable' }
  }

  const declined = declinedSchema.safeParse(data)
  if (declined.success) return { status: 'quiet', reason: declined.data.reason }

  const parsed = predictionSchema.safeParse(data)
  if (!parsed.success) {
    console.error('[twin:malformed] prediction payload —', parsed.error.issues)
    return { status: 'quiet', reason: 'unavailable' }
  }

  return {
    status: 'ready',
    prediction: {
      predictionId: parsed.data.prediction_id,
      predictedCatch: parsed.data.predicted_catch,
      contextKind: parsed.data.context_kind,
      contextLabel: parsed.data.context_label,
      sampleSize: parsed.data.sample_size,
      observedRate: parsed.data.observed_rate,
    },
  }
}

/** The `twin` key on an award payload, when the award resolved a prediction. */
export const twinVerdictSchema = z
  .object({
    prediction_id: z.string(),
    predicted_catch: z.boolean(),
    actual_catch: z.boolean(),
    was_correct: z.boolean(),
    context_kind: contextKindSchema,
    context_label: z.string(),
    sample_size: z.coerce.number().int(),
    observed_rate: z.coerce.number(),
  })
  .transform(
    (row): TwinVerdict => ({
      predictionId: row.prediction_id,
      predictedCatch: row.predicted_catch,
      actualCatch: row.actual_catch,
      wasCorrect: row.was_correct,
      contextKind: row.context_kind,
      contextLabel: row.context_label,
      sampleSize: row.sample_size,
      observedRate: row.observed_rate,
    }),
  )

const patternSchema = z.object({
  context_kind: contextKindSchema,
  context_label: z.string(),
  sample_size: z.coerce.number().int(),
  catches: z.coerce.number().int(),
  observed_rate: z.coerce.number(),
  predicts_catch: z.boolean(),
  edge: z.coerce.number(),
})

const resolvedSchema = z.object({
  id: z.string(),
  context_kind: contextKindSchema,
  context_label: z.string(),
  predicted_catch: z.boolean(),
  actual_catch: z.boolean(),
  was_correct: z.boolean(),
  sample_size: z.coerce.number().int(),
  observed_rate: z.coerce.number(),
  resolved_at: z.string(),
})

const sealedSchema = z.object({
  status: z.literal('sealed'),
  reason: z.enum(['insufficient_history', 'forbidden']),
  attempts: z.coerce.number().int().default(0),
  required: z.coerce.number().int().default(0),
})

const awakeSchema = z.object({
  status: z.enum(['watching', 'observing']),
  attempts: z.coerce.number().int(),
  patterns: z.array(patternSchema),
  predictions_resolved: z.coerce.number().int(),
  predictions_correct: z.coerce.number().int(),
  recent: z.array(resolvedSchema),
})

/** A Twin that could not be read. Sealed, and honest about why. */
const UNAVAILABLE: CognitiveTwinSlot = {
  status: 'sealed',
  reason: 'unavailable',
  attempts: 0,
  required: 0,
}

/**
 * Read the Twin for the Archive.
 *
 * Degrades to a sealed Twin rather than throwing. The Archive is a room the
 * player walks into; one instrument being unreadable must not close the room.
 */
export async function fetchTwinState(playerId: string): Promise<CognitiveTwinSlot> {
  const { data, error } = await supabase.rpc('twin_state', { p_player_id: playerId })

  if (error) {
    console.error(`[twin:${error.code}] state read failed — ${error.message}`)
    return UNAVAILABLE
  }

  const sealed = sealedSchema.safeParse(data)
  if (sealed.success) {
    return {
      status: 'sealed',
      reason: sealed.data.reason,
      attempts: sealed.data.attempts,
      required: sealed.data.required,
    }
  }

  const awake = awakeSchema.safeParse(data)
  if (!awake.success) {
    console.error('[twin:malformed] state payload —', awake.error.issues)
    return UNAVAILABLE
  }

  if (awake.data.status === 'watching') {
    return { status: 'watching', attempts: awake.data.attempts }
  }

  return {
    status: 'observing',
    attempts: awake.data.attempts,
    patterns: awake.data.patterns.map((pattern) => ({
      contextKind: pattern.context_kind,
      contextLabel: pattern.context_label,
      sampleSize: pattern.sample_size,
      // Trust the server's count when it sends one; `catchesFrom` is the
      // fallback the live prediction payload relies on.
      catches: pattern.catches ?? catchesFrom(pattern.observed_rate, pattern.sample_size),
      observedRate: pattern.observed_rate,
      predictsCatch: pattern.predicts_catch,
      edge: pattern.edge,
      // Nothing generates narration. The deterministic sentence is the product.
      narration: null,
    })),
    predictionsResolved: awake.data.predictions_resolved,
    predictionsCorrect: awake.data.predictions_correct,
    recent: awake.data.recent.map((row) => ({
      id: row.id,
      contextKind: row.context_kind,
      contextLabel: row.context_label,
      predictedCatch: row.predicted_catch,
      actualCatch: row.actual_catch,
      wasCorrect: row.was_correct,
      sampleSize: row.sample_size,
      observedRate: row.observed_rate,
      resolvedAt: row.resolved_at,
    })),
  }
}
