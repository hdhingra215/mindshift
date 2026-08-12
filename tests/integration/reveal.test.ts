import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { SCENARIO_SELECT } from '@/features/game/api/scenario-row'

import { probeLiveDatabase } from './support/live-env'
import {
  createLivePlayer,
  loadScenarioForPlay,
  openSession,
  recordAttempt,
  type LivePlayer,
} from './support/live-player'

/**
 * The decision/reveal boundary (Phase 8.6).
 *
 * One property, asserted from every angle a client could attack it from: **a
 * player cannot learn which answer is correct until they have committed to one.**
 *
 * Five separate columns used to give it away and all of them were readable
 * directly, so it is not enough to check that the app's own query is clean —
 * these tests go around the app and query the tables themselves, the way a
 * scripted client would.
 *
 * The second half asserts the other side of the same coin: that the server, not
 * the client, decides what a decision was worth.
 */

const live = await probeLiveDatabase()

if (!live.available) {
  console.warn(`[harness] reveal suite skipped — ${live.reason}`)
}

describe.skipIf(!live.available)('correctness is not exposed before answering (live database)', () => {
  let player: LivePlayer
  let sessionId: string
  /** A scenario this player has NOT attempted. The answer key must stay shut. */
  let unseenScenarioId: string
  let unseenChoiceIds: string[]

  beforeAll(async () => {
    if (!live.available) return
    player = await createLivePlayer(live.env, 'reveal')
    sessionId = await openSession(player.client, player.id)

    const scenario = await loadScenarioForPlay(player, 'easy')
    unseenScenarioId = scenario.id
    unseenChoiceIds = [scenario.correct.choiceId, scenario.trap.choiceId]
  }, 90_000)

  afterAll(async () => {
    await player?.dispose()
  }, 30_000)

  it('cannot read any outcome for a scenario it has not attempted', async () => {
    const { data, error } = await player.client
      .from('outcomes')
      .select('id, is_correct, xp_reward, result_text')
      .in('choice_id', unseenChoiceIds)

    // RLS filters rather than errors, which is the correct behaviour — the
    // player learns nothing, not even that rows exist.
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('cannot read a single outcome by walking the whole table', async () => {
    const { data, error } = await player.client
      .from('outcomes')
      .select('id, is_correct')
      .limit(1000)

    expect(error).toBeNull()
    // Nothing attempted yet, so nothing is revealed. 216 outcomes exist.
    expect(data).toEqual([])
  })

  it('cannot read is_trap on any choice', async () => {
    const { error } = await player.client
      .from('scenario_choices')
      .select('id, is_trap')
      .eq('scenario_id', unseenScenarioId)

    // Column privilege, so this is a hard refusal rather than a filter.
    expect(error).not.toBeNull()
    expect(error?.code).toBe('42501')
  })

  it('cannot read bias_id on any choice — its presence alone is the tell', async () => {
    const { error } = await player.client
      .from('scenario_choices')
      .select('id, bias_id')
      .eq('scenario_id', unseenScenarioId)

    expect(error).not.toBeNull()
    expect(error?.code).toBe('42501')
  })

  it('can still read everything needed to answer', async () => {
    const { data, error } = await player.client
      .from('scenario_choices')
      .select('id, label, body, sort_order')
      .eq('scenario_id', unseenScenarioId)

    expect(error).toBeNull()
    expect(data?.length).toBeGreaterThanOrEqual(2)
    expect(data?.every((row) => typeof row.label === 'string' && row.label.length > 0)).toBe(true)
  })

  /**
   * The app's own query, run verbatim. If someone re-adds an outcome embed to
   * `SCENARIO_SELECT`, this fails — the leak cannot creep back in through the
   * select string without a test noticing.
   */
  it('the shipped scenario query returns no correctness data', async () => {
    const { data, error } = await player.client
      .from('scenarios')
      .select(SCENARIO_SELECT)
      .eq('id', unseenScenarioId)
      .single()

    expect(error).toBeNull()

    const serialised = JSON.stringify(data)
    expect(serialised).not.toMatch(/is_correct/)
    expect(serialised).not.toMatch(/is_trap/)
    expect(serialised).not.toMatch(/xp_reward/)
    expect(serialised).not.toMatch(/explanation/)
    expect(serialised).not.toMatch(/result_text/)
  })

  it('reveals the outcome only once the decision is recorded', async () => {
    const before = await player.client
      .from('outcomes')
      .select('id')
      .in('choice_id', unseenChoiceIds)
    expect(before.data).toEqual([])

    await recordAttempt(player.client, {
      playerId: player.id,
      sessionId,
      scenarioId: unseenScenarioId,
      choiceId: unseenChoiceIds[0]!,
    })

    const after = await player.client
      .from('outcomes')
      .select('id, is_correct')
      .in('choice_id', unseenChoiceIds)

    expect(after.error).toBeNull()
    // Now readable — the reveal is the reward for having committed.
    expect(after.data?.length).toBe(unseenChoiceIds.length)
  }, 60_000)
})

describe.skipIf(!live.available)('the server decides correctness (live database)', () => {
  let player: LivePlayer
  let sessionId: string

  beforeAll(async () => {
    if (!live.available) return
    player = await createLivePlayer(live.env, 'reveal-authority')
    sessionId = await openSession(player.client, player.id)
  }, 60_000)

  afterAll(async () => {
    await player?.dispose()
  }, 30_000)

  it('refuses a direct insert into attempts', async () => {
    const scenario = await loadScenarioForPlay(player, 'easy')

    // The exploit this closes: recording the trap choice against the *correct*
    // outcome, and collecting the XP, mastery and wager payout for it.
    const { error } = await player.client.from('attempts').insert({
      player_id: player.id,
      session_id: sessionId,
      scenario_id: scenario.id,
      selected_choice_id: scenario.trap.choiceId,
      outcome_id: scenario.correct.outcomeId,
      response_time_ms: 1_000,
    } as never)

    expect(error).not.toBeNull()
  }, 60_000)

  it('derives the outcome from the choice, so a wrong answer stays wrong', async () => {
    const scenario = await loadScenarioForPlay(player, 'easy')

    const { data, error } = await player.client.rpc('submit_attempt', {
      p_session_id: sessionId,
      p_scenario_id: scenario.id,
      p_choice_id: scenario.trap.choiceId,
      p_response_time_ms: 5_000,
    })
    const result = data as Record<string, unknown>
    const outcome = result.outcome as Record<string, unknown>

    expect(error).toBeNull()
    // The client named only a choice. The server decided what it was worth.
    expect(outcome.is_correct).toBe(false)
    expect(outcome.id).toBe(scenario.trap.outcomeId)

    const { data: row } = await player.admin
      .from('attempts')
      .select('outcome_id, selected_choice_id')
      .eq('id', result.attempt_id as string)
      .single()

    expect(row?.selected_choice_id).toBe(scenario.trap.choiceId)
    expect(row?.outcome_id).toBe(scenario.trap.outcomeId)
  }, 60_000)

  it('pays a miss like a miss, however the submission was shaped', async () => {
    const scenario = await loadScenarioForPlay(player, 'medium')

    const submitted = await player.client.rpc('submit_attempt', {
      p_session_id: sessionId,
      p_scenario_id: scenario.id,
      p_choice_id: scenario.trap.choiceId,
      p_response_time_ms: 5_000,
    })
    const attemptId = (submitted.data as Record<string, unknown>).attempt_id as string

    const awarded = await player.client.rpc('award_attempt_xp', { p_attempt_id: attemptId })
    const payload = awarded.data as Record<string, unknown>

    expect(Number(payload.awarded)).toBe(scenario.trap.xp)
    expect(Number(payload.awarded)).toBeLessThan(scenario.correct.xp)
  }, 90_000)

  it('rejects a choice that belongs to a different scenario', async () => {
    const a = await loadScenarioForPlay(player, 'easy')
    const b = await loadScenarioForPlay(player, 'hard')

    // Without this check a player could answer scenario A with a choice from B —
    // which sails past every downstream system, since mastery reads the scenario
    // and XP reads the outcome.
    const { error } = await player.client.rpc('submit_attempt', {
      p_session_id: sessionId,
      p_scenario_id: a.id,
      p_choice_id: b.correct.choiceId,
      p_response_time_ms: 1_000,
    })

    expect(error).not.toBeNull()
  }, 60_000)

  it('refuses to submit into a session that is not yours', async () => {
    const stranger = await createLivePlayer(live.available ? live.env : ({} as never), 'reveal-outsider')
    try {
      const strangerSession = await openSession(stranger.client, stranger.id)
      const scenario = await loadScenarioForPlay(player, 'easy')

      const { error } = await player.client.rpc('submit_attempt', {
        p_session_id: strangerSession,
        p_scenario_id: scenario.id,
        p_choice_id: scenario.correct.choiceId,
        p_response_time_ms: 1_000,
      })

      expect(error).not.toBeNull()
    } finally {
      await stranger.dispose()
    }
  }, 120_000)

  it('records one decision per scenario however often it is submitted', async () => {
    const scenario = await loadScenarioForPlay(player, 'expert')

    const first = await player.client.rpc('submit_attempt', {
      p_session_id: sessionId,
      p_scenario_id: scenario.id,
      p_choice_id: scenario.correct.choiceId,
      p_response_time_ms: 3_000,
    })
    // Resubmitting with the *other* choice must not overwrite the decision:
    // attempts are immutable, so the first answer stands.
    const second = await player.client.rpc('submit_attempt', {
      p_session_id: sessionId,
      p_scenario_id: scenario.id,
      p_choice_id: scenario.trap.choiceId,
      p_response_time_ms: 3_000,
    })

    const firstId = (first.data as Record<string, unknown>).attempt_id
    const secondResult = second.data as Record<string, unknown>

    expect(secondResult.attempt_id).toBe(firstId)
    expect(secondResult.selected_choice_id).toBe(scenario.correct.choiceId)
    expect((secondResult.outcome as Record<string, unknown>).is_correct).toBe(true)

    const { count } = await player.client
      .from('attempts')
      .select('id', { count: 'exact', head: true })
      .eq('player_id', player.id)
      .eq('scenario_id', scenario.id)

    expect(count).toBe(1)
  }, 90_000)

  it('still runs the whole award pipeline from a submitted attempt', async () => {
    const { data: attempts } = await player.client
      .from('attempts')
      .select('id')
      .eq('player_id', player.id)
      .limit(1)

    const awarded = await player.client.rpc('award_attempt_xp', {
      p_attempt_id: attempts![0]!.id,
    })
    const payload = awarded.data as Record<string, unknown>

    // The boundary changed; the pipeline did not.
    expect(awarded.error).toBeNull()
    expect(payload).toHaveProperty('mastery')
    expect(payload).toHaveProperty('achievements')
    expect(payload).toHaveProperty('streak')
    expect(payload).toHaveProperty('twin')
    expect(payload).toHaveProperty('wager')
    expect(payload).toHaveProperty('insight_balance')
  }, 60_000)
})

describe.skipIf(!live.available)('wagers stay blind (live database)', () => {
  let player: LivePlayer
  let sessionId: string

  beforeAll(async () => {
    if (!live.available) return
    player = await createLivePlayer(live.env, 'reveal-wager')
    sessionId = await openSession(player.client, player.id)
  }, 60_000)

  afterAll(async () => {
    await player?.dispose()
  }, 30_000)

  /**
   * The reason this phase exists. A wager is a measurement of conviction, and it
   * only measures anything if the player genuinely does not know the answer when
   * they stake.
   */
  it('locks a stake while the answer is still unreadable', async () => {
    const scenario = await loadScenarioForPlay(player, 'easy')

    const placed = await player.client.rpc('place_wager', {
      p_session_id: sessionId,
      p_scenario_id: scenario.id,
      p_stake: 50,
    })
    expect((placed.data as Record<string, unknown>).accepted).toBe(true)

    // Staked, and still blind.
    const { data: outcomes } = await player.client
      .from('outcomes')
      .select('id, is_correct')
      .in('choice_id', [scenario.correct.choiceId, scenario.trap.choiceId])

    expect(outcomes).toEqual([])
  }, 90_000)

  it('settles the stake from the server’s verdict, not the client’s', async () => {
    const scenario = await loadScenarioForPlay(player, 'easy')

    const submitted = await player.client.rpc('submit_attempt', {
      p_session_id: sessionId,
      p_scenario_id: scenario.id,
      p_choice_id: scenario.trap.choiceId,
      p_response_time_ms: 4_000,
    })
    const attemptId = (submitted.data as Record<string, unknown>).attempt_id as string

    const awarded = await player.client.rpc('award_attempt_xp', { p_attempt_id: attemptId })
    const wager = (awarded.data as Record<string, unknown>).wager as Record<string, unknown>

    // The player staked everything on an answer the server judged wrong.
    expect(wager.was_correct).toBe(false)
    expect(Number(wager.delta)).toBe(-50)
    expect(Number(wager.balance_after)).toBe(0)
  }, 90_000)
})
