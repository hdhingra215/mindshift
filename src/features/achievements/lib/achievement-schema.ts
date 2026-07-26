import { z } from 'zod'

import type { AchievementUnlock } from '../types'

/**
 * Wire schema for one unlocked achievement.
 *
 * The award functions return `jsonb`, which the generated Supabase types can
 * only describe as `Json`, so the shape is validated at the boundary rather than
 * asserted past the compiler — the same rule the scenario loader and the mastery
 * payload follow.
 */
export const achievementUnlockSchema = z
  .object({
    achievement_id: z.string().min(1),
    slug: z.string(),
    name: z.string(),
    description: z.string().nullish(),
    icon: z.string().nullish(),
    xp_reward: z.coerce.number().int(),
  })
  .transform(
    (row): AchievementUnlock => ({
      achievementId: row.achievement_id,
      slug: row.slug,
      name: row.name,
      description: row.description ?? '',
      // `achievements.icon` is nullable in the schema; the card falls back to a
      // trophy rather than rendering an empty medallion.
      icon: row.icon ?? '',
      xpReward: row.xp_reward,
    }),
  )
