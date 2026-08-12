import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database.types'

import { recordAttempt, type LivePlayer } from './live-player'

/**
 * Fixtures for the Cognitive Twin suite.
 *
 * The Twin only speaks once a player has a substantial, lopsided record, so its
 * tests need a player who has genuinely played a dozen scenarios. Everything
 * here builds that history the same way the game does — real attempts through
 * the player's own client — because a history assembled any other way would not
 * exercise the pipeline the Twin actually reads.
 */

/** One scenario reduced to the two choices a fixture ever needs. */
export type PlayableScenario = {
  id: string
  slug: string
  correct: { choiceId: string; outcomeId: string }
  trap: { choiceId: string; outcomeId: string }
}

export type TwinThresholds = {
  minTotalAttempts: number
  minContextSample: number
  minEdge: number
  cooldownAttempts: number
}

/**
 * Read the thresholds from the database rather than hardcoding them.
 *
 * They are tuning knobs and will move. A test that hardcoded 12 would start
 * failing for the wrong reason the day someone tunes it, and — worse — a test
 * that hardcoded the *old* value could pass while the product had silently
 * lowered its bar for speaking about a player.
 */
export async function twinThresholds(
  client: SupabaseClient<Database>,
): Promise<TwinThresholds> {
  const [total, context, edge, cooldown] = await Promise.all([
    client.rpc('twin_min_total_attempts'),
    client.rpc('twin_min_context_sample'),
    client.rpc('twin_min_edge'),
    client.rpc('twin_cooldown_attempts'),
  ])

  const first = total.error ?? context.error ?? edge.error ?? cooldown.error
  if (first) throw new Error(`threshold read failed: ${first.message}`)

  return {
    minTotalAttempts: Number(total.data),
    minContextSample: Number(context.data),
    minEdge: Number(edge.data),
    cooldownAttempts: Number(cooldown.data),
  }
}

/**
 * Play a run of scenarios, all one way.
 *
 * Awards each attempt, so the whole pipeline runs and the Twin sees the history
 * exactly as a real session would leave it. Sequential rather than parallel: the
 * award takes a per-player advisory lock, and concurrent awards would serialise
 * anyway while making the failure output much harder to read.
 */
export async function playThroughPack(
  player: LivePlayer,
  sessionId: string,
  scenarios: readonly PlayableScenario[],
  options: { catch: boolean },
): Promise<void> {
  for (const scenario of scenarios) {
    const choice = options.catch ? scenario.correct : scenario.trap

    const attemptId = await recordAttempt(player.client, {
      playerId: player.id,
      sessionId,
      scenarioId: scenario.id,
      choiceId: choice.choiceId,
      outcomeId: choice.outcomeId,
    })

    const { error } = await player.client.rpc('award_attempt_xp', { p_attempt_id: attemptId })
    if (error) throw new Error(`award failed for ${scenario.slug}: ${error.message}`)
  }
}
