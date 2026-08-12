import { getMasteryTier } from '@/features/mastery'
import { supabase } from '@/lib/supabase/client'

import type { ObservatoryAchievement, ObservatoryBias, ObservatoryScene } from '../types'

/**
 * Observatory reads.
 *
 * Read-only, and deliberately so: every number here is owned by the
 * server-side progression pipeline. The dashboard observes state; it never
 * writes, computes or infers progression, which is why nothing in this file has
 * a rule in it.
 *
 * Four small reads instead of one clever join. The bias catalogue is global
 * content and cacheable; mastery is per-player and volatile; they are merged on
 * the client because the scene needs **all twelve biases whether or not the
 * player has met them** — an unmet bias is the most meaningful object on the
 * screen, and an inner join would delete exactly those.
 */

const LOAD_ERROR =
  'We couldn’t reach your observatory just now — the connection may have wavered. Your progress is safe.'

/** How many recent unlocks the rim shows before it would start to clutter. */
const RECENT_ACHIEVEMENT_LIMIT = 6

type Result<T> = { data: T; error: null } | { data: null; error: string }

export async function fetchObservatoryScene(playerId: string): Promise<Result<ObservatoryScene>> {
  const [biasRows, masteryRows, progressRow, achievementRows, streakRow] = await Promise.all([
    supabase
      .from('biases')
      .select('slug, name, categories ( name )')
      .is('deleted_at', null)
      .order('slug', { ascending: true }),
    supabase
      .from('bias_mastery')
      .select('mastery_level, distinct_contexts, total_attempts, last_practiced_at, biases ( slug )')
      .eq('player_id', playerId),
    supabase
      .from('progress')
      .select('current_level, current_xp, total_xp, scenarios_completed, overall_accuracy')
      .eq('player_id', playerId)
      .maybeSingle(),
    supabase
      .from('player_achievements')
      .select('id, unlocked_at, achievements ( name, icon )')
      .eq('player_id', playerId)
      .order('unlocked_at', { ascending: false })
      .limit(RECENT_ACHIEVEMENT_LIMIT),
    supabase
      .from('streaks')
      .select('current_streak, longest_streak, grace_used, last_activity_date')
      .eq('player_id', playerId)
      .maybeSingle(),
  ])

  /*
   * The streak read is deliberately excluded from the failure gate below. The
   * engine is the newest system in the product, so a deployment without it must
   * still open a working observatory — just a cold one.
   */
  if (biasRows.error || masteryRows.error || progressRow.error || achievementRows.error) {
    console.error(
      '[observatory] read failed:',
      biasRows.error?.message ??
        masteryRows.error?.message ??
        progressRow.error?.message ??
        achievementRows.error?.message,
    )
    return { data: null, error: LOAD_ERROR }
  }

  // Mastery keyed by bias slug, so the merge below is a lookup rather than a scan.
  const masteryBySlug = new Map(
    (masteryRows.data ?? []).flatMap((row) => {
      const slug = row.biases?.slug
      return slug ? [[slug, row] as const] : []
    }),
  )

  const biases: ObservatoryBias[] = (biasRows.data ?? []).map((bias) => {
    const mastery = masteryBySlug.get(bias.slug)
    const masteryLevel = Number(mastery?.mastery_level ?? 0)

    return {
      slug: bias.slug,
      name: bias.name,
      categoryName: bias.categories?.name ?? null,
      masteryLevel,
      distinctContexts: mastery?.distinct_contexts ?? 0,
      totalAttempts: mastery?.total_attempts ?? 0,
      lastPracticedAt: mastery?.last_practiced_at ?? null,
      // The tier ladder is shared with the reveal meter, so a bias reads the
      // same anywhere it appears.
      tier: getMasteryTier(masteryLevel),
    }
  })

  const achievements: ObservatoryAchievement[] = (achievementRows.data ?? []).flatMap((row) =>
    row.achievements
      ? [
          {
            id: row.id,
            name: row.achievements.name,
            icon: row.achievements.icon ?? '',
            unlockedAt: row.unlocked_at,
          },
        ]
      : [],
  )

  const progress = progressRow.data
  const streakData = streakRow.error ? null : streakRow.data

  return {
    data: {
      level: progress?.current_level ?? 1,
      // The ladder's titles live in the `levels` table; the observatory shows
      // the level number and leaves naming to the XP reveal, which already has
      // the title in its payload. One less read for a string.
      levelTitle: '',
      totalXp: progress?.total_xp ?? 0,
      currentXp: progress?.current_xp ?? 0,
      levelSpan: null,
      scenariosCompleted: progress?.scenarios_completed ?? 0,
      accuracy: Number(progress?.overall_accuracy ?? 0),
      biases,
      achievements,
      streak: streakData
        ? {
            currentStreak: streakData.current_streak,
            longestStreak: streakData.longest_streak,
            graceUsed: streakData.grace_used,
            lastActiveDay: streakData.last_activity_date,
            // Unknown, not false. Only the server's clock can decide what today
            // is; the award payload carries the authoritative answer during play.
            qualifiedToday: null,
            isLive: streakData.current_streak > 0,
          }
        : null,
      // Nothing recorded yet. Not an error and not an empty state to apologise
      // for — the unlit field is the point.
      isNewcomer: (progress?.scenarios_completed ?? 0) === 0,
    },
    error: null,
  }
}
