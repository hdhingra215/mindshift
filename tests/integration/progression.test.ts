import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { achievementUnlockSchema } from '@/features/achievements'
import { MASTERY_MAX, masteryAwardSchema } from '@/features/mastery'
import { streakStateSchema } from '@/features/streaks'

import { probeLiveDatabase } from './support/live-env'
import {
  createLivePlayer,
  loadScenarioForPlay,
  openSession,
  recordAttempt,
  type LivePlayer,
} from './support/live-player'

/**
 * The gameplay harness — the full progression pipeline against a real database.
 *
 * Covers the one thing no unit test can: that
 * `attempt → XP → progress → mastery → achievements → streak → session` actually
 * runs, inside one transaction, through RLS, as a signed-in player.
 *
 * ── Why this is an integration test and not a unit test ─────────────────────
 * The entire progression economy lives in SQL (ProjectStatus §4.1–§4.5). There
 * is nothing in TypeScript to unit-test: the client proposes and the database
 * decides. Reaching that logic means reaching a Postgres, which is why this file
 * skips itself rather than mocking anything — a mocked award function would
 * assert that the mock works.
 *
 * ── When the project is paused ──────────────────────────────────────────────
 * Every test here is skipped with a stated reason, loudly, and the suite still
 * passes. That is deliberate: a red suite caused by infrastructure being offline
 * trains people to ignore red suites. The skip reason names the cause.
 */

const live = await probeLiveDatabase()

if (!live.available) {
  // Surfaces in the run output rather than only in a skip count.
  console.warn(`[harness] progression suite skipped — ${live.reason}`)
}

describe.skipIf(!live.available)('progression pipeline (live database)', () => {
  let player: LivePlayer
  let sessionId: string
  let scenario: Awaited<ReturnType<typeof loadScenarioForPlay>>

  beforeAll(async () => {
    if (!live.available) return
    player = await createLivePlayer(live.env, 'pipeline')
    scenario = await loadScenarioForPlay(player, 'easy')
    sessionId = await openSession(player.client, player.id)
  }, 60_000)

  afterAll(async () => {
    await player?.dispose()
  }, 30_000)

  describe('seeded content', () => {
    it('exposes the full achievement catalogue to a player', async () => {
      const { data, error } = await player.client
        .from('achievements')
        .select('slug, criteria, xp_reward')
        .eq('is_active', true)
        .is('deleted_at', null)

      expect(error).toBeNull()
      // Fourteen were seeded in Phase 5B; the Archive lists every one of them.
      expect(data).toHaveLength(14)
      // No achievement may be defined in code — every one carries its rule DSL.
      expect(data?.every((row) => row.criteria !== null)).toBe(true)
    })

    it('teaches at least one bias per playable scenario', () => {
      expect(scenario.biasIds.length).toBeGreaterThan(0)
    })
  })

  describe('award_attempt_xp', () => {
    let attemptId: string
    let firstAward: Record<string, unknown>

    beforeAll(async () => {
      attemptId = await recordAttempt(player.client, {
        playerId: player.id,
        sessionId,
        scenarioId: scenario.id,
        choiceId: scenario.correct.choiceId,
        outcomeId: scenario.correct.outcomeId,
      })

      const { data, error } = await player.client.rpc('award_attempt_xp', {
        p_attempt_id: attemptId,
      })
      expect(error).toBeNull()
      firstAward = data as Record<string, unknown>
    }, 30_000)

    it('awards the XP the content authored, not a client-chosen amount', () => {
      expect(firstAward.awarded_now).toBe(true)
      expect(Number(firstAward.awarded)).toBe(scenario.correct.xp)
    })

    /*
     * `awarded` is the attempt's XP; `total_xp` is the whole ledger.
     *
     * A first correct answer also unlocks achievements, and `evaluate_achievements`
     * grants their XP through `record_xp` inside the same transaction (§4.4). So
     * the two numbers legitimately differ, and asserting `total_xp === awarded`
     * would be asserting that achievements do not pay out.
     *
     * The real invariant — the one that would catch progress drifting — is that
     * progress is *derived from the ledger* rather than incremented. That is what
     * is checked here and below.
     */
    it('counts every ledger row toward the total, including achievement XP', async () => {
      const { data, error } = await player.client
        .from('xp_transactions')
        .select('amount')
        .eq('player_id', player.id)

      expect(error).toBeNull()

      const ledgerTotal = (data ?? []).reduce((sum, row) => sum + Number(row.amount), 0)
      expect(Number(firstAward.total_xp)).toBe(ledgerTotal)
      // The attempt's own XP is part of it, never the whole of it.
      expect(ledgerTotal).toBeGreaterThanOrEqual(scenario.correct.xp)
    })

    it('returns a payload the client contract can parse', () => {
      // The same schemas `progression-service.ts` validates against, so a
      // payload change that would break the reveal breaks this test first.
      expect(() =>
        masteryAwardSchema.array().parse(firstAward.mastery ?? []),
      ).not.toThrow()
      expect(() =>
        achievementUnlockSchema.array().parse(firstAward.achievements ?? []),
      ).not.toThrow()

      // Unconditional now that 8.1 is applied: the award payload must carry a
      // streak. A guard here would go quiet again if the migration were ever
      // rolled back, which is exactly when this needs to shout.
      expect(firstAward.streak).toBeTruthy()
      expect(() => streakStateSchema.parse(firstAward.streak)).not.toThrow()
    })

    it('writes exactly one ledger row for the attempt, and attributes the rest', async () => {
      const { data, error } = await player.client
        .from('xp_transactions')
        .select('amount, source, attempt_id')
        .eq('player_id', player.id)

      expect(error).toBeNull()

      // Keyed on the attempt rather than on a total count: the count also
      // includes achievement payouts, so counting rows would conflate "the
      // attempt paid twice" with "the attempt unlocked something".
      const forAttempt = (data ?? []).filter((row) => row.attempt_id === attemptId)
      expect(forAttempt).toHaveLength(1)
      expect(forAttempt[0]?.source).toBe('attempt')
      expect(Number(forAttempt[0]?.amount)).toBe(scenario.correct.xp)

      // Nothing else may be attributed to play. Every other row is an unlock.
      const others = (data ?? []).filter((row) => row.attempt_id !== attemptId)
      expect(others.every((row) => row.source === 'achievement')).toBe(true)
    })

    it('derives progress from the ledger rather than incrementing it', async () => {
      const [progress, ledger] = await Promise.all([
        player.client
          .from('progress')
          .select('total_xp, scenarios_completed, overall_accuracy, current_level')
          .eq('player_id', player.id)
          .single(),
        player.client.from('xp_transactions').select('amount').eq('player_id', player.id),
      ])

      expect(progress.error).toBeNull()
      expect(ledger.error).toBeNull()

      const ledgerTotal = (ledger.data ?? []).reduce((sum, row) => sum + Number(row.amount), 0)
      expect(Number(progress.data?.total_xp)).toBe(ledgerTotal)
      expect(progress.data?.scenarios_completed).toBe(1)
      expect(Number(progress.data?.overall_accuracy)).toBe(100)
      expect(progress.data?.current_level).toBeGreaterThanOrEqual(1)
    })

    it('moves mastery for every bias the scenario teaches, within bounds', async () => {
      const awards = masteryAwardSchema.array().parse(firstAward.mastery ?? [])
      expect(awards.length).toBe(scenario.biasIds.length)

      for (const award of awards) {
        expect(award.masteryLevel).toBeGreaterThan(0)
        expect(award.masteryLevel).toBeLessThanOrEqual(MASTERY_MAX)
        // The ceiling is the anti-grind mechanism; mastery may never exceed it.
        expect(award.masteryLevel).toBeLessThanOrEqual(award.ceiling)
        expect(award.previousLevel).toBe(0)
        expect(award.delta).toBeGreaterThan(0)
      }
    })

    it('attaches mastery to the bias the scenario teaches, not to attempts.bias_id', async () => {
      const { data, error } = await player.client
        .from('bias_mastery')
        .select('bias_id, mastery_level, distinct_contexts')
        .eq('player_id', player.id)

      expect(error).toBeNull()
      expect(data?.map((row) => row.bias_id).sort()).toEqual([...scenario.biasIds].sort())
      // One correct answer in one scenario is exactly one recognised context.
      expect(data?.every((row) => row.distinct_contexts === 1)).toBe(true)
    })

    it('is idempotent — a retried award mints nothing', async () => {
      const before = await player.client
        .from('xp_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('player_id', player.id)

      const { data, error } = await player.client.rpc('award_attempt_xp', {
        p_attempt_id: attemptId,
      })
      const second = data as Record<string, unknown>

      expect(error).toBeNull()
      expect(second.awarded_now).toBe(false)
      expect(Number(second.total_xp)).toBe(Number(firstAward.total_xp))

      const after = await player.client
        .from('xp_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('player_id', player.id)

      // Compared against the observed count, not a literal: the ledger already
      // holds achievement rows, and re-evaluating must add none of either kind.
      expect(after.count).toBe(before.count)
    })

    it('rolls the session up from its attempts', async () => {
      const { data, error } = await player.client
        .from('sessions')
        .select('total_attempts, total_xp_earned')
        .eq('id', sessionId)
        .single()

      expect(error).toBeNull()
      expect(data?.total_attempts).toBe(1)
      // Attempt XP only. `refresh_session_rollups` traces ledger rows to a
      // session through an attempt, and an achievement has none — so session XP
      // deliberately understates total XP (ProjectStatus §8.10).
      expect(Number(data?.total_xp_earned)).toBe(scenario.correct.xp)
    })
  })

  describe('a miss still earns, and still teaches', () => {
    it('awards the authored miss XP rather than nothing', async () => {
      const harder = await loadScenarioForPlay(player, 'medium')
      const attemptId = await recordAttempt(player.client, {
        playerId: player.id,
        sessionId,
        scenarioId: harder.id,
        choiceId: harder.trap.choiceId,
        outcomeId: harder.trap.outcomeId,
      })

      const { data, error } = await player.client.rpc('award_attempt_xp', {
        p_attempt_id: attemptId,
      })
      const award = data as Record<string, unknown>

      expect(error).toBeNull()
      // A wrong answer is a discovery, never a verdict (ProjectStatus §12.20).
      expect(Number(award.awarded)).toBe(harder.trap.xp)
      expect(Number(award.awarded)).toBeGreaterThan(0)
    }, 30_000)

    it('keeps mastery bounded after repeated encounters', async () => {
      const { data, error } = await player.client
        .from('bias_mastery')
        .select('mastery_level, distinct_contexts')
        .eq('player_id', player.id)

      expect(error).toBeNull()
      for (const row of data ?? []) {
        const level = Number(row.mastery_level)
        expect(level).toBeGreaterThanOrEqual(0)
        expect(level).toBeLessThanOrEqual(MASTERY_MAX)
        // ceiling = min(100, 50 + 25 × contexts) — the model's hard bound.
        expect(level).toBeLessThanOrEqual(Math.min(100, 50 + 25 * row.distinct_contexts))
      }
    })
  })

  describe('award_reflection_xp', () => {
    let attemptId: string

    beforeAll(async () => {
      const third = await loadScenarioForPlay(player, 'hard')
      attemptId = await recordAttempt(player.client, {
        playerId: player.id,
        sessionId,
        scenarioId: third.id,
        choiceId: third.correct.choiceId,
        outcomeId: third.correct.outcomeId,
      })
      await player.client.rpc('award_attempt_xp', { p_attempt_id: attemptId })
    }, 30_000)

    it('refuses the bonus before a reflection exists', async () => {
      const { data } = await player.client.rpc('award_reflection_xp', {
        p_attempt_id: attemptId,
      })
      const award = data as Record<string, unknown> | null

      // Either a refusal or a zero award — never a bonus for nothing written.
      expect(award === null || award.awarded_now === false || Number(award.awarded) === 0).toBe(
        true,
      )
    })

    it('awards the bonus once a reflection is written, and only once', async () => {
      const saved = await player.client.from('reflections').insert({
        player_id: player.id,
        attempt_id: attemptId,
        reflection_text: 'I anchored on the first number I saw and never questioned it.',
        confidence_before: 80,
        confidence_after: 40,
      })
      expect(saved.error).toBeNull()

      const first = await player.client.rpc('award_reflection_xp', { p_attempt_id: attemptId })
      const firstAward = first.data as Record<string, unknown>
      expect(first.error).toBeNull()
      expect(firstAward.awarded_now).toBe(true)
      expect(Number(firstAward.awarded)).toBeGreaterThan(0)

      const second = await player.client.rpc('award_reflection_xp', { p_attempt_id: attemptId })
      const secondAward = second.data as Record<string, unknown>
      expect(secondAward.awarded_now).toBe(false)
      expect(Number(secondAward.total_xp)).toBe(Number(firstAward.total_xp))
    }, 30_000)
  })

  describe('achievements', () => {
    /*
     * Driven through `award_attempt_xp` rather than by calling
     * `evaluate_achievements` directly. That function is internal as of
     * 20260812000002 and no longer reachable from a browser — and re-awarding is
     * the path a real double-submit would take anyway, so this is the stronger
     * test as well as the only available one.
     */
    it('never unlocks the same achievement twice, however often it is evaluated', async () => {
      const attempts = await player.client
        .from('attempts')
        .select('id')
        .eq('player_id', player.id)

      for (const row of attempts.data ?? []) {
        await player.client.rpc('award_attempt_xp', { p_attempt_id: row.id })
      }

      const { data, error } = await player.client
        .from('player_achievements')
        .select('achievement_id')
        .eq('player_id', player.id)

      expect(error).toBeNull()

      const ids = (data ?? []).map((row) => row.achievement_id)
      expect(ids.length).toBeGreaterThan(0)
      expect(new Set(ids).size).toBe(ids.length)
    }, 90_000)

    it('refuses a direct call to the achievement evaluator', async () => {
      // Internal since 20260812000002. A client that could evaluate on demand
      // could also evaluate against another player's id.
      const { error } = await player.client.rpc('evaluate_achievements', {
        p_player_id: player.id,
      })

      expect(error).not.toBeNull()
    })
  })

  describe('streaks', () => {
    /*
     * Read from the `streaks` rollup rather than by calling
     * `refresh_player_streak`, which is internal as of 20260812000002. The
     * rollup is what the dashboard and the Archive actually read, so asserting
     * on it tests the surface the product uses.
     */
    it('counts today as a qualifying day after two decisions', async () => {
      const { data, error } = await player.client
        .from('streaks')
        .select('current_streak, longest_streak, grace_used, last_activity_date')
        .eq('player_id', player.id)
        .single()

      expect(error).toBeNull()
      // Three attempts were recorded above; the bar is two decisions.
      expect(data?.current_streak ?? 0).toBeGreaterThanOrEqual(1)
      expect(data?.current_streak ?? 0).toBeLessThanOrEqual(data?.longest_streak ?? 0)
    }, 30_000)

    it('reports the same run in the award payload as in the rollup', async () => {
      // ⚠ There must be exactly one definition of a day run (ProjectStatus §4.5).
      // The award payload and the table are the two places it surfaces; they are
      // written in the same transaction and must never disagree.
      const [rollup, attempts] = await Promise.all([
        player.client
          .from('streaks')
          .select('current_streak, longest_streak, grace_used')
          .eq('player_id', player.id)
          .single(),
        player.client.from('attempts').select('id').eq('player_id', player.id).limit(1),
      ])

      const attemptId = attempts.data?.[0]?.id
      expect(attemptId).toBeTruthy()

      const awarded = await player.client.rpc('award_attempt_xp', { p_attempt_id: attemptId! })
      const streak = (awarded.data as Record<string, unknown>).streak as Record<string, unknown>

      expect(streak).toBeTruthy()
      expect(Number(streak.current_streak)).toBe(rollup.data?.current_streak)
      expect(Number(streak.longest_streak)).toBe(rollup.data?.longest_streak)
      expect(Number(streak.grace_used)).toBe(rollup.data?.grace_used)
    }, 60_000)

    it('refuses a direct call to the streak refresher', async () => {
      // Internal since 20260812000002 — it both read and wrote another player's
      // rollup when it was reachable.
      const { error } = await player.client.rpc('refresh_player_streak', {
        p_player_id: player.id,
      })

      expect(error).not.toBeNull()
    })
  })
})

/**
 * Grace needs a player whose history spans days, which no live run can produce
 * honestly. The fixture rows are backdated with the service-role client — setup
 * only; every assertion still reads through the player's own client.
 */
describe.skipIf(!live.available)('streak grace (live database)', () => {
  let player: LivePlayer

  beforeAll(async () => {
    if (!live.available) return
    player = await createLivePlayer(live.env, 'grace')
  }, 60_000)

  afterAll(async () => {
    await player?.dispose()
  }, 30_000)

  it('forgives one missed day without breaking the run', async () => {
    const sessionId = await openSession(player.client, player.id)

    /*
     * Six *distinct* scenarios, one per attempt. `submit_attempt` is idempotent
     * per session and scenario (Phase 8.6), so replaying one scenario six times
     * now yields a single decision — correctly, since attempts are immutable.
     * A multi-day history therefore needs multi-scenario material.
     */
    const { data: pool, error: poolError } = await player.admin
      .from('scenarios')
      .select('id, scenario_choices ( id, outcomes ( id, is_correct ) )')
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('slug', { ascending: true })
      .limit(6)

    expect(poolError).toBeNull()
    expect(pool?.length).toBe(6)

    const scenarios = (pool ?? []).map((row) => ({
      id: row.id,
      choiceId: row.scenario_choices.find((choice) => choice.outcomes?.is_correct === true)!.id,
    }))

    // Days 3 and 1 back qualify; day 2 is the gap grace has to bridge.
    const schedule = [3, 3, 1, 1, 0, 0]
    for (const [index, daysAgo] of schedule.entries()) {
      const scenario = scenarios[index]!
      const attemptId = await recordAttempt(player.client, {
        playerId: player.id,
        sessionId,
        scenarioId: scenario.id,
        choiceId: scenario.choiceId,
      })

      if (daysAgo > 0) {
        const when = new Date(Date.now() - daysAgo * 86_400_000).toISOString()
        const moved = await player.admin
          .from('attempts')
          .update({ completed_at: when })
          .eq('id', attemptId)
        expect(moved.error).toBeNull()
      }
    }

    /*
     * Backdating the rows does not itself refresh the rollup, and
     * `refresh_player_streak` is internal as of 20260812000002 — so the streak
     * is recomputed the way the product does it: by awarding an attempt. One
     * more award runs the whole pipeline over the now-backdated history.
     */
    const latest = await player.client
      .from('attempts')
      .select('id')
      .eq('player_id', player.id)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    const awarded = await player.client.rpc('award_attempt_xp', {
      p_attempt_id: latest.data!.id,
    })
    const state = (awarded.data as Record<string, unknown>).streak as Record<string, unknown>

    expect(awarded.error).toBeNull()
    // A run is a span, not a count, so the forgiven day stays inside it.
    expect(Number(state.current_streak)).toBeGreaterThanOrEqual(3)
    expect(Number(state.grace_used)).toBeGreaterThanOrEqual(1)
    expect(Number(state.current_streak)).toBeLessThanOrEqual(Number(state.longest_streak))
  }, 120_000)
})
