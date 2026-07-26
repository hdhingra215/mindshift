import { z } from 'zod'

import type { MasteryAward } from '../types'

/**
 * Wire schema for one mastery award.
 *
 * The award functions return `jsonb`, which the generated Supabase types can
 * only describe as `Json` — so the shape has to be checked at the boundary
 * rather than asserted past the compiler. That is the same lesson the scenario
 * loader learned the hard way: an unverified cast is a runtime failure with the
 * type error suppressed.
 *
 * Parsing here also means a server-side rename surfaces as a named validation
 * error instead of `NaN%` rendered into a reward moment.
 */
export const masteryAwardSchema = z
  .object({
    bias_id: z.string().min(1),
    bias_slug: z.string(),
    bias_name: z.string(),
    mastery_level: z.coerce.number(),
    previous_level: z.coerce.number(),
    delta: z.coerce.number(),
    ceiling: z.coerce.number(),
    distinct_contexts: z.coerce.number().int(),
    total_attempts: z.coerce.number().int(),
    correct_attempts: z.coerce.number().int(),
  })
  .transform(
    (row): MasteryAward => ({
      biasId: row.bias_id,
      biasSlug: row.bias_slug,
      biasName: row.bias_name,
      masteryLevel: row.mastery_level,
      previousLevel: row.previous_level,
      delta: row.delta,
      ceiling: row.ceiling,
      distinctContexts: row.distinct_contexts,
      totalAttempts: row.total_attempts,
      correctAttempts: row.correct_attempts,
    }),
  )
