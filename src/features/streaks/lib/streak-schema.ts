import { z } from 'zod'

import type { StreakState } from '../types'

/**
 * Wire schema for the streak snapshot.
 *
 * The award functions return `jsonb`, which the generated Supabase types can only
 * describe as `Json`, so the shape is validated at the boundary rather than
 * asserted past the compiler — the rule every other progression payload follows.
 */
export const streakStateSchema = z
  .object({
    current_streak: z.coerce.number().int(),
    longest_streak: z.coerce.number().int(),
    grace_used: z.coerce.number().int(),
    last_active_day: z.string().nullish(),
    qualified_today: z.boolean(),
    is_live: z.boolean(),
  })
  .transform(
    (row): StreakState => ({
      currentStreak: row.current_streak,
      longestStreak: row.longest_streak,
      graceUsed: row.grace_used,
      lastActiveDay: row.last_active_day ?? null,
      qualifiedToday: row.qualified_today,
      isLive: row.is_live,
    }),
  )
