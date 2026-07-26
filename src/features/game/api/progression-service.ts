import { z } from 'zod'

import { masteryAwardSchema } from '@/features/mastery'
import { supabase } from '@/lib/supabase/client'
import type { XpAward } from '../types'

/**
 * Progression data access.
 *
 * Thin by design: the client cannot write `xp_transactions`, `progress` or
 * `bias_mastery` (RLS grants it SELECT only), so this module has no economy
 * logic to hold. It calls the server-authoritative award functions, validates
 * their payload, and nothing else. Every number the UI displays came from the
 * database.
 *
 * Both awards are idempotent per attempt, which is what makes the retry below
 * safe: a request that succeeded but whose response was lost returns the same
 * award on the second call rather than minting a second one. Mastery is
 * idempotent for free, being derived from attempt history rather than
 * incremented.
 */

type Result<T> = { data: T; error: null } | { data: null; error: string }

/** How many times an award is attempted before the reward strip is skipped. */
const AWARD_ATTEMPTS = 2

const AWARD_ERROR =
  'Your play is saved — the XP for it hasn’t landed yet. It’ll catch up.'

/**
 * The award payload, validated rather than asserted.
 *
 * `award_attempt_xp` returns `jsonb`, which the generated Supabase types can
 * only describe as `Json`; a cast here would be exactly the unverified promise
 * that broke the scenario loader.
 */
const xpAwardSchema = z
  .object({
    awarded: z.coerce.number(),
    awarded_now: z.boolean(),
    total_xp: z.coerce.number(),
    current_level: z.coerce.number().int(),
    level_title: z.string(),
    current_xp: z.coerce.number(),
    level_span: z.coerce.number().nullable(),
    leveled_up: z.boolean(),
    previous_level: z.coerce.number().int(),
    session_xp: z.coerce.number(),
    scenarios_completed: z.coerce.number().int(),
    // Absent on any award recorded before the mastery engine shipped, and on a
    // deployment where 7.2 has not been applied yet. Progression must not fail
    // because the newest half of the payload is missing.
    mastery: z.array(masteryAwardSchema).nullish(),
  })
  .transform(
    (row): XpAward => ({
      awarded: row.awarded,
      awardedNow: row.awarded_now,
      totalXp: row.total_xp,
      currentLevel: row.current_level,
      levelTitle: row.level_title,
      currentXp: row.current_xp,
      levelSpan: row.level_span,
      leveledUp: row.leveled_up,
      previousLevel: row.previous_level,
      sessionXp: row.session_xp,
      scenariosCompleted: row.scenarios_completed,
      mastery: row.mastery ?? [],
    }),
  )

async function callAward(
  fn: 'award_attempt_xp' | 'award_reflection_xp',
  attemptId: string,
): Promise<Result<XpAward>> {
  for (let attempt = 0; attempt < AWARD_ATTEMPTS; attempt += 1) {
    const { data, error } = await supabase.rpc(fn, { p_attempt_id: attemptId })

    if (!error) {
      const parsed = xpAwardSchema.safeParse(data)
      if (parsed.success) return { data: parsed.data, error: null }

      // A shape we do not recognise is not worth retrying — the next call
      // returns the same thing. Report it and stop.
      console.error(`[progression:malformed] ${fn} —`, parsed.error.issues)
      return { data: null, error: AWARD_ERROR }
    }

    if (attempt === AWARD_ATTEMPTS - 1) {
      // Never block the reveal on the economy: the attempt itself is already an
      // immutable fact, and progress is rebuilt from it on the next award.
      console.error(`[progression:${error.code}] ${fn} — ${error.message}`)
    }
  }

  return { data: null, error: AWARD_ERROR }
}

/** Award the authored outcome XP for a submitted attempt, and refresh mastery. */
export function awardAttemptXp(attemptId: string): Promise<Result<XpAward>> {
  return callAward('award_attempt_xp', attemptId)
}

/** Award the reflection bonus. Requires the reflection row to already exist. */
export function awardReflectionXp(attemptId: string): Promise<Result<XpAward>> {
  return callAward('award_reflection_xp', attemptId)
}
