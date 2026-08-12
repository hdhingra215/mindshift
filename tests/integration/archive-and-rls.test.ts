import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { summariseCalibration, summariseDecisions } from '@/features/profile'

import { probeLiveDatabase } from './support/live-env'
import {
  createLivePlayer,
  loadScenarioForPlay,
  openSession,
  recordAttempt,
  type LivePlayer,
} from './support/live-player'

/**
 * The Mind Archive against real PostgREST, and the RLS boundary under it.
 *
 * Two things no unit test can reach:
 *
 *   1. **Embed cardinality.** PostgREST decides whether an embed serialises as
 *      an object or an array from *constraints*, not from join direction — the
 *      defect that silently broke the scenario loader in 7.1b and the one
 *      remaining invisible coupling in the schema (ProjectStatus §8.3). The
 *      archive's `reflections → attempts → outcomes` and `attempts → scenarios`
 *      embeds have never run live. If either flips shape, the mapper reads
 *      `undefined` and the archive quietly shows a player an empty record of a
 *      life they actually lived. That failure is worse than a crash, so it is
 *      asserted here.
 *
 *   2. **That progression really is server-authoritative.** Every progression
 *      table grants the player SELECT and nothing else. The tests at the bottom
 *      try to write each one directly, as the player, and require every attempt
 *      to be rejected.
 */

const live = await probeLiveDatabase()

if (!live.available) {
  console.warn(`[harness] archive + RLS suite skipped — ${live.reason}`)
}

describe.skipIf(!live.available)('Mind Archive reads (live database)', () => {
  let player: LivePlayer

  beforeAll(async () => {
    if (!live.available) return
    player = await createLivePlayer(live.env, 'archive')

    const sessionId = await openSession(player.client, player.id)

    // Two decisions at different difficulties with one reflection, which is the
    // minimum history that makes every archive query non-trivial.
    const easy = await loadScenarioForPlay(player, 'easy')
    const easyAttempt = await recordAttempt(player.client, {
      playerId: player.id,
      sessionId,
      scenarioId: easy.id,
      choiceId: easy.correct.choiceId,
      outcomeId: easy.correct.outcomeId,
      responseTimeMs: 8_000,
    })
    await player.client.rpc('award_attempt_xp', { p_attempt_id: easyAttempt })

    const hard = await loadScenarioForPlay(player, 'hard')
    const hardAttempt = await recordAttempt(player.client, {
      playerId: player.id,
      sessionId,
      scenarioId: hard.id,
      choiceId: hard.trap.choiceId,
      outcomeId: hard.trap.outcomeId,
      responseTimeMs: 24_000,
    })
    await player.client.rpc('award_attempt_xp', { p_attempt_id: hardAttempt })

    await player.client.from('reflections').insert({
      player_id: player.id,
      attempt_id: hardAttempt,
      reflection_text: 'I was sure, and I was wrong. Worth noticing why.',
      confidence_before: 90,
      confidence_after: 35,
    })
  }, 90_000)

  afterAll(async () => {
    await player?.dispose()
  }, 30_000)

  it('reads the decision window with to-one outcome and scenario embeds', async () => {
    const { data, error } = await player.client
      .from('attempts')
      .select('response_time_ms, reflected, outcomes ( is_correct ), scenarios ( difficulty )')
      .eq('player_id', player.id)
      .order('completed_at', { ascending: false })
      .limit(400)

    expect(error).toBeNull()
    expect(data?.length).toBe(2)

    for (const row of data ?? []) {
      // Both must be bare objects. An array here means a constraint changed and
      // `archive-service.ts` is silently dropping every decision.
      expect(Array.isArray(row.outcomes)).toBe(false)
      expect(Array.isArray(row.scenarios)).toBe(false)
      expect(typeof row.outcomes?.is_correct).toBe('boolean')
      expect(row.scenarios?.difficulty).toBeTruthy()
    }
  })

  it('produces difficulty bands the evidence panel can render', async () => {
    const { data } = await player.client
      .from('attempts')
      .select('response_time_ms, reflected, outcomes ( is_correct ), scenarios ( difficulty )')
      .eq('player_id', player.id)

    const decisions = (data ?? []).flatMap((row) => {
      const difficulty = row.scenarios?.difficulty
      const isCorrect = row.outcomes?.is_correct
      if (!difficulty || typeof isCorrect !== 'boolean') return []
      return [{ isCorrect, responseTimeMs: row.response_time_ms, reflected: row.reflected, difficulty }]
    })

    const summary = summariseDecisions(decisions)

    expect(summary.total).toBe(2)
    expect(summary.medianResponseMs).toBe(16_000)
    expect(summary.byDifficulty.map((band) => band.difficulty)).toEqual(['easy', 'hard'])
    expect(summary.byDifficulty[0]).toMatchObject({ attempted: 1, caught: 1 })
    expect(summary.byDifficulty[1]).toMatchObject({ attempted: 1, caught: 0 })
  })

  it('reads calibration through the nested reflection embed', async () => {
    const { data, error } = await player.client
      .from('reflections')
      .select(
        'id, reflection_text, confidence_before, confidence_after, created_at, attempts ( outcomes ( is_correct ), scenarios ( title ) )',
      )
      .eq('player_id', player.id)
      .order('created_at', { ascending: false })
      .limit(12)

    expect(error).toBeNull()
    expect(data?.length).toBe(1)

    const row = data?.[0]
    // Two levels of to-one embed — the deepest shape the archive depends on.
    expect(Array.isArray(row?.attempts)).toBe(false)
    expect(Array.isArray(row?.attempts?.outcomes)).toBe(false)
    expect(row?.attempts?.outcomes?.is_correct).toBe(false)
    expect(typeof row?.attempts?.scenarios?.title).toBe('string')

    const points = (data ?? []).flatMap((reflection) => {
      const confidenceBefore = reflection.confidence_before
      const isCorrect = reflection.attempts?.outcomes?.is_correct
      if (confidenceBefore === null || typeof isCorrect !== 'boolean') return []
      return [{ confidenceBefore, isCorrect }]
    })

    expect(points).toEqual([{ confidenceBefore: 90, isCorrect: false }])
    // One reading is below the sample floor — the archive must say so, not guess.
    expect(summariseCalibration(points).direction).toBe('insufficient')
  })

  it('counts reflections exactly for the shelf footer', async () => {
    const { count, error } = await player.client
      .from('reflections')
      .select('id', { count: 'exact', head: true })
      .eq('player_id', player.id)

    expect(error).toBeNull()
    expect(count).toBe(1)
  })

  it('lists the whole discovery catalogue, lit and unlit', async () => {
    const [catalogue, unlocked] = await Promise.all([
      player.client
        .from('achievements')
        .select('id, slug, name, description, icon')
        .eq('is_active', true)
        .is('deleted_at', null),
      player.client.from('player_achievements').select('achievement_id, unlocked_at').eq('player_id', player.id),
    ])

    expect(catalogue.error).toBeNull()
    expect(unlocked.error).toBeNull()
    expect(catalogue.data).toHaveLength(14)

    const unlockedIds = new Set((unlocked.data ?? []).map((row) => row.achievement_id))
    // Every unlock must correspond to a catalogue entry the archive can name.
    for (const id of unlockedIds) {
      expect(catalogue.data?.some((row) => row.id === id)).toBe(true)
    }
  })

  it('shows all twelve biases whether or not they have been met', async () => {
    const [biases, mastery] = await Promise.all([
      player.client.from('biases').select('slug, categories ( name )').is('deleted_at', null),
      player.client
        .from('bias_mastery')
        .select('mastery_level, biases ( slug )')
        .eq('player_id', player.id),
    ])

    expect(biases.error).toBeNull()
    expect(mastery.error).toBeNull()
    expect(biases.data).toHaveLength(12)
    // An inner join would delete exactly the unmet biases — the most meaningful
    // objects in the observatory. The archive merges client-side for this reason.
    expect((mastery.data ?? []).length).toBeLessThanOrEqual(12)
    for (const row of mastery.data ?? []) {
      expect(Array.isArray(row.biases)).toBe(false)
    }
  })

  it('reads a profile row for the masthead date', async () => {
    const { data, error } = await player.client
      .from('profiles')
      .select('created_at')
      .eq('id', player.id)
      .maybeSingle()

    expect(error).toBeNull()
    expect(data?.created_at).toBeTruthy()
  })
})

describe.skipIf(!live.available)('progression RLS boundary (live database)', () => {
  let player: LivePlayer

  beforeAll(async () => {
    if (!live.available) return
    player = await createLivePlayer(live.env, 'rls')
  }, 60_000)

  afterAll(async () => {
    await player?.dispose()
  }, 30_000)

  /**
   * "The client proposes; the database decides" is only true if the client
   * cannot write these tables. Each case asserts a rejection, not a shrug — an
   * insert that silently succeeds is the whole economy compromised.
   */
  it('rejects a direct XP ledger write', async () => {
    const { error } = await player.client.from('xp_transactions').insert({
      player_id: player.id,
      amount: 100_000,
      source: 'attempt',
    } as never)

    expect(error).not.toBeNull()
  })

  it('rejects a direct progress write', async () => {
    const { error } = await player.client
      .from('progress')
      .insert({ player_id: player.id, total_xp: 999_999, current_level: 99 } as never)

    expect(error).not.toBeNull()
  })

  it('rejects a direct mastery write', async () => {
    const { error } = await player.client
      .from('bias_mastery')
      .insert({ player_id: player.id, mastery_level: 100 } as never)

    expect(error).not.toBeNull()
  })

  it('rejects granting yourself an achievement', async () => {
    const { data: achievement } = await player.client
      .from('achievements')
      .select('id')
      .limit(1)
      .single()

    const { error } = await player.client
      .from('player_achievements')
      .insert({ player_id: player.id, achievement_id: achievement?.id ?? '' } as never)

    expect(error).not.toBeNull()
  })

  it('rejects a direct streak write', async () => {
    const { error } = await player.client
      .from('streaks')
      .insert({ player_id: player.id, current_streak: 365, longest_streak: 365 } as never)

    expect(error).not.toBeNull()
  })

  it('rejects reading another player’s progression', async () => {
    // A UUID that is not this player. Absent rows and forbidden rows are
    // indistinguishable under RLS, which is the correct behaviour — the test
    // asserts no data comes back either way.
    const { data, error } = await player.client
      .from('progress')
      .select('total_xp')
      .eq('player_id', '00000000-0000-0000-0000-000000000000')

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('refuses to rewrite a recorded decision', async () => {
    const scenario = await loadScenarioForPlay(player, 'easy')
    const sessionId = await openSession(player.client, player.id)
    const attemptId = await recordAttempt(player.client, {
      playerId: player.id,
      sessionId,
      scenarioId: scenario.id,
      choiceId: scenario.trap.choiceId,
      outcomeId: scenario.trap.outcomeId,
    })

    /*
     * Attempts are immutable (ProjectStatus §12.9). There is no UPDATE policy,
     * so the row is invisible to the statement and PostgREST reports success
     * over zero affected rows — which is why the assertion that matters is on
     * the stored value, not on the error. `select()` makes the affected set
     * observable: it must come back empty.
     */
    const { data: affected, error } = await player.client
      .from('attempts')
      .update({ outcome_id: scenario.correct.outcomeId })
      .eq('id', attemptId)
      .select('id')

    expect(error).toBeNull()
    expect(affected).toEqual([])

    const { data } = await player.client
      .from('attempts')
      .select('outcome_id')
      .eq('id', attemptId)
      .single()

    expect(data?.outcome_id).toBe(scenario.trap.outcomeId)
  }, 30_000)
})
