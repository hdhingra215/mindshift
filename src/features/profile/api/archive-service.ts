import { fetchObservatoryScene } from '@/features/dashboard'
import { supabase } from '@/lib/supabase/client'

import { fetchTwinState } from './twin-service'
import type {
  ArchiveCalibrationPoint,
  ArchiveDecision,
  ArchiveDiscovery,
  ArchiveRecord,
  ArchiveReflection,
} from '../types'

/**
 * Mind Archive reads.
 *
 * Read-only, like the observatory it embeds. Every progression number in the
 * record is the server's; the archive adds only *history* — the decisions, the
 * confidence readings, the player's own words, and the full discovery catalogue.
 *
 * ── Why the observatory read is reused rather than reimplemented ────────────
 * The archive's mastery section *is* the dashboard's instrument, seen up close.
 * Issuing a second, near-identical set of queries would create two pictures of
 * the same mastery that could disagree after any schema change. One read, one
 * picture, two places it is shown.
 *
 * ── Cardinality ─────────────────────────────────────────────────────────────
 * The embeds below are typed against the generated schema, which derives
 * to-one/to-many from the same constraints PostgREST does — so a future UNIQUE
 * change surfaces as a type error here rather than as `undefined` at runtime
 * (ProjectStatus §8.3).
 */

const LOAD_ERROR =
  'We couldn’t open your archive just now — the connection may have wavered. Nothing in it is lost.'

/**
 * How many decisions the pattern summaries describe.
 *
 * A cap rather than the whole history, because the summaries are descriptive and
 * a player with thousands of attempts should not pay for a full table scan to
 * read their own tempo. When it bites, the record says so and the copy narrows
 * to "recent" — an archive that silently changes its own scope is lying.
 */
const DECISION_WINDOW = 400

/** Reflections shown on the shelf. The count above it is the true total. */
const REFLECTION_LIMIT = 12

type Result<T> = { data: T; error: null } | { data: null; error: string }

export async function fetchArchiveRecord(playerId: string): Promise<Result<ArchiveRecord>> {
  const [
    observatory,
    profileRow,
    decisionRows,
    reflectionRows,
    reflectionCount,
    catalogue,
    unlocked,
    twin,
  ] = await Promise.all([
      fetchObservatoryScene(playerId),
      supabase.from('profiles').select('created_at').eq('id', playerId).maybeSingle(),
      supabase
        .from('attempts')
        .select('response_time_ms, reflected, outcomes ( is_correct ), scenarios ( difficulty )')
        .eq('player_id', playerId)
        .order('completed_at', { ascending: false })
        .limit(DECISION_WINDOW),
      supabase
        .from('reflections')
        .select(
          'id, reflection_text, confidence_before, confidence_after, created_at, attempts ( outcomes ( is_correct ), scenarios ( title ) )',
        )
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(REFLECTION_LIMIT),
      supabase
        .from('reflections')
        .select('id', { count: 'exact', head: true })
        .eq('player_id', playerId),
      supabase
        .from('achievements')
        .select('id, slug, name, description, icon')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('slug', { ascending: true }),
      supabase.from('player_achievements').select('achievement_id, unlocked_at').eq('player_id', playerId),
      // Degrades to a sealed Twin on its own rather than failing the archive.
      fetchTwinState(playerId),
    ])

  /*
   * The observatory read is the only hard dependency: without mastery there is
   * no archive to draw. Everything else degrades to an empty section, which is
   * a state this screen already renders deliberately for a new player — so a
   * missing reflections table reads as "nothing written yet" rather than as a
   * broken room.
   */
  if (!observatory.data) {
    return { data: null, error: observatory.error ?? LOAD_ERROR }
  }

  if (decisionRows.error || catalogue.error) {
    console.error('[archive] read failed:', decisionRows.error?.message ?? catalogue.error?.message)
    return { data: null, error: LOAD_ERROR }
  }

  const decisions: ArchiveDecision[] = (decisionRows.data ?? []).flatMap((row) => {
    const difficulty = row.scenarios?.difficulty
    const isCorrect = row.outcomes?.is_correct
    // A row whose scenario or outcome is gone cannot be described honestly, so
    // it is dropped rather than defaulted into a fact that was never recorded.
    if (!difficulty || typeof isCorrect !== 'boolean') return []

    return [
      {
        isCorrect,
        responseTimeMs: row.response_time_ms,
        reflected: row.reflected,
        difficulty,
      },
    ]
  })

  const reflections: ArchiveReflection[] = (reflectionRows.data ?? []).map((row) => ({
    id: row.id,
    text: row.reflection_text,
    confidenceBefore: row.confidence_before,
    confidenceAfter: row.confidence_after,
    recordedAt: row.created_at,
    scenarioTitle: row.attempts?.scenarios?.title ?? null,
  }))

  /*
   * Calibration is drawn from reflections rather than attempts, because a
   * confidence reading only exists where the player recorded one. Pairing it
   * with the outcome of the same attempt is the whole measurement.
   */
  const calibration: ArchiveCalibrationPoint[] = (reflectionRows.data ?? []).flatMap((row) => {
    const confidenceBefore = row.confidence_before
    const isCorrect = row.attempts?.outcomes?.is_correct
    if (confidenceBefore === null || typeof isCorrect !== 'boolean') return []
    return [{ confidenceBefore, isCorrect }]
  })

  const unlockedAtById = new Map(
    (unlocked.error ? [] : (unlocked.data ?? [])).map(
      (row) => [row.achievement_id, row.unlocked_at] as const,
    ),
  )

  const discoveries: ArchiveDiscovery[] = (catalogue.data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    icon: row.icon ?? '',
    unlockedAt: unlockedAtById.get(row.id) ?? null,
  }))

  return {
    data: {
      openedAt: profileRow.error ? null : (profileRow.data?.created_at ?? null),
      observatory: observatory.data,
      decisions,
      calibration,
      decisionsTruncated: decisions.length >= DECISION_WINDOW,
      reflections,
      reflectionTotal: reflectionCount.count ?? reflections.length,
      discoveries,
      twin,
    },
    error: null,
  }
}
