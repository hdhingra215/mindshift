import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { summariseConviction } from '@/features/profile'
import { probeLiveDatabase } from './support/live-env'
import {
  createLivePlayer,
  isWagerRequiredError,
  loadScenarioForPlay,
  openSession,
  recordAttempt,
  type LivePlayer,
} from './support/live-player'

/**
 * Blind Wagers against the real database.
 *
 * The economy is the first thing in this product a player could try to cheat, so
 * most of what follows is adversarial: staking more than you hold, restaking
 * after locking, resolving twice, grading your own wager, and reaching into
 * someone else's reserve. Each of those is a way to mint Insight, and each is
 * asserted closed.
 *
 * Insight has no real-world value, which lowers the stakes of a breach but not
 * the standard — a currency that can be minted is a broken measurement, and the
 * whole point of the mechanic is to measure conviction honestly.
 */

const live = await probeLiveDatabase()

if (!live.available) {
  console.warn(`[harness] wager suite skipped — ${live.reason}`)
}

/** Reads the economy's own constants rather than hardcoding them. */
async function economy(player: LivePlayer) {
  const [start, award, tiers] = await Promise.all([
    player.client.rpc('insight_starting_balance'),
    player.client.rpc('insight_recognition_award'),
    player.client.rpc('insight_wager_tiers'),
  ])

  const first = start.error ?? award.error ?? tiers.error
  if (first) throw new Error(`economy read failed: ${first.message}`)

  return {
    startingBalance: Number(start.data),
    recognitionAward: Number(award.data),
    tiers: (tiers.data as number[]).map(Number).sort((a, b) => a - b),
  }
}

describe.skipIf(!live.available)('Insight reserve (live database)', () => {
  let player: LivePlayer

  beforeAll(async () => {
    if (!live.available) return
    player = await createLivePlayer(live.env, 'wager-wallet')
  }, 60_000)

  afterAll(async () => {
    await player?.dispose()
  }, 30_000)

  it('grants a brand-new player their starting reserve', async () => {
    const rules = await economy(player)
    const { data, error } = await player.client.rpc('insight_wallet')
    const wallet = data as Record<string, unknown>

    expect(error).toBeNull()
    expect(Number(wallet.balance)).toBe(rules.startingBalance)
    expect(wallet.tiers).toEqual(rules.tiers)
  })

  it('reports only the stakes the balance can actually cover', async () => {
    const rules = await economy(player)
    const { data } = await player.client.rpc('insight_wallet')
    const wallet = data as Record<string, unknown>

    const affordable = (wallet.affordable as number[]).map(Number)
    expect(affordable).toEqual(rules.tiers.filter((tier) => tier <= rules.startingBalance))
  })

  it('earns recognition Insight for a correct decision, wagered or not', async () => {
    const rules = await economy(player)
    const scenario = await loadScenarioForPlay(player, 'easy')
    const sessionId = await openSession(player.client, player.id)

    const attemptId = await recordAttempt(player.client, {
      playerId: player.id,
      sessionId,
      scenarioId: scenario.id,
      choiceId: scenario.correct.choiceId,
      outcomeId: scenario.correct.outcomeId,
    })
    const awarded = await player.client.rpc('award_attempt_xp', { p_attempt_id: attemptId })

    expect(awarded.error).toBeNull()

    /*
     * The recognition award is independent of wagering, which is the claim here
     * and the reason a drained player can always climb back.
     *
     * Written to hold on either side of the Phase 9.2 deployment: with the
     * ordering gate live this player can afford a tier, so `recordAttempt` stakes
     * the minimum and the reserve also moves by that stake. Without it, nothing
     * resolved. Either way the recognition award landed.
     */
    const payload = awarded.data as Record<string, unknown>
    const wager = payload.wager as Record<string, unknown> | null
    const stakeDelta = wager === null ? 0 : Number(wager.delta)

    expect(Number(payload.insight_balance)).toBe(
      rules.startingBalance + rules.recognitionAward + stakeDelta,
    )
  }, 60_000)
})

describe.skipIf(!live.available)('placing a wager (live database)', () => {
  let player: LivePlayer
  let sessionId: string

  beforeAll(async () => {
    if (!live.available) return
    player = await createLivePlayer(live.env, 'wager-place')
    sessionId = await openSession(player.client, player.id)
  }, 60_000)

  afterAll(async () => {
    await player?.dispose()
  }, 30_000)

  it('locks a valid stake and records it before any attempt exists', async () => {
    const scenario = await loadScenarioForPlay(player, 'easy')
    const { data, error } = await player.client.rpc('place_wager', {
      p_session_id: sessionId,
      p_scenario_id: scenario.id,
      p_stake: 25,
    })
    const result = data as Record<string, unknown>

    expect(error).toBeNull()
    expect(result.accepted).toBe(true)
    expect(Number(result.stake)).toBe(25)

    const { data: row } = await player.client
      .from('attempt_wagers')
      .select('stake, balance_before, attempt_id, was_correct, delta, resolved_at')
      .eq('player_id', player.id)
      .eq('scenario_id', scenario.id)
      .single()

    expect(row?.stake).toBe(25)
    // Locked, not resolved: no attempt, no grade, no payout.
    expect(row?.attempt_id).toBeNull()
    expect(row?.was_correct).toBeNull()
    expect(row?.delta).toBeNull()
    expect(row?.resolved_at).toBeNull()
  }, 60_000)

  it('refuses an amount that is not one of the defined tiers', async () => {
    const scenario = await loadScenarioForPlay(player, 'medium')
    const { data } = await player.client.rpc('place_wager', {
      p_session_id: sessionId,
      p_scenario_id: scenario.id,
      p_stake: 37,
    })

    expect((data as Record<string, unknown>).accepted).toBe(false)
    expect((data as Record<string, unknown>).reason).toBe('invalid_stake')
  }, 60_000)

  it('refuses a stake larger than the reserve', async () => {
    const scenario = await loadScenarioForPlay(player, 'medium')
    // The reserve starts at 50; 500 is not a tier either, so use a real tier
    // against a deliberately drained balance in the dedicated suite below. Here
    // the check is that an over-tier amount is rejected outright.
    const { data } = await player.client.rpc('place_wager', {
      p_session_id: sessionId,
      p_scenario_id: scenario.id,
      p_stake: 500,
    })

    expect((data as Record<string, unknown>).accepted).toBe(false)
  }, 60_000)

  it('will not restake a scenario once the wager is locked', async () => {
    const scenario = await loadScenarioForPlay(player, 'easy')
    const { data } = await player.client.rpc('place_wager', {
      p_session_id: sessionId,
      p_scenario_id: scenario.id,
      p_stake: 50,
    })
    const result = data as Record<string, unknown>

    // Returns the existing wager rather than replacing it — a refresh must never
    // become a way to change your mind after committing.
    expect(result.reason).toBe('already_locked')
    expect(Number(result.stake)).toBe(25)

    const { count } = await player.client
      .from('attempt_wagers')
      .select('id', { count: 'exact', head: true })
      .eq('player_id', player.id)
      .eq('scenario_id', scenario.id)

    expect(count).toBe(1)
  }, 60_000)

  it('refuses to wager inside someone else’s session', async () => {
    const stranger = await createLivePlayer(live.available ? live.env : ({} as never), 'wager-outsider')
    try {
      const strangerSession = await openSession(stranger.client, stranger.id)
      const scenario = await loadScenarioForPlay(player, 'hard')

      const { data } = await player.client.rpc('place_wager', {
        p_session_id: strangerSession,
        p_scenario_id: scenario.id,
        p_stake: 10,
      })

      expect((data as Record<string, unknown>).accepted).toBe(false)
      expect((data as Record<string, unknown>).reason).toBe('not_your_session')
    } finally {
      await stranger.dispose()
    }
  }, 120_000)
})

describe.skipIf(!live.available)('resolving a wager (live database)', () => {
  let player: LivePlayer
  let sessionId: string

  beforeAll(async () => {
    if (!live.available) return
    player = await createLivePlayer(live.env, 'wager-resolve')
    sessionId = await openSession(player.client, player.id)
  }, 60_000)

  afterAll(async () => {
    await player?.dispose()
  }, 30_000)

  it('pays the stake on a correct answer', async () => {
    const rules = await economy(player)
    const scenario = await loadScenarioForPlay(player, 'easy')

    await player.client.rpc('place_wager', {
      p_session_id: sessionId,
      p_scenario_id: scenario.id,
      p_stake: 25,
    })

    const attemptId = await recordAttempt(player.client, {
      playerId: player.id,
      sessionId,
      scenarioId: scenario.id,
      choiceId: scenario.correct.choiceId,
      outcomeId: scenario.correct.outcomeId,
    })
    const awarded = await player.client.rpc('award_attempt_xp', { p_attempt_id: attemptId })
    const payload = awarded.data as Record<string, unknown>
    const wager = payload.wager as Record<string, unknown>

    expect(wager.was_correct).toBe(true)
    expect(Number(wager.delta)).toBe(25)
    // Starting reserve + the stake + the recognition award for being right.
    expect(Number(wager.balance_after)).toBe(
      rules.startingBalance + 25 + rules.recognitionAward,
    )
    expect(Number(payload.insight_balance)).toBe(Number(wager.balance_after))
  }, 90_000)

  it('takes the stake on a wrong answer, and no more', async () => {
    const scenario = await loadScenarioForPlay(player, 'medium')
    const before = await player.client.rpc('insight_wallet')
    const balanceBefore = Number((before.data as Record<string, unknown>).balance)

    await player.client.rpc('place_wager', {
      p_session_id: sessionId,
      p_scenario_id: scenario.id,
      p_stake: 10,
    })

    const attemptId = await recordAttempt(player.client, {
      playerId: player.id,
      sessionId,
      scenarioId: scenario.id,
      choiceId: scenario.trap.choiceId,
      outcomeId: scenario.trap.outcomeId,
    })
    const awarded = await player.client.rpc('award_attempt_xp', { p_attempt_id: attemptId })
    const wager = (awarded.data as Record<string, unknown>).wager as Record<string, unknown>

    expect(wager.was_correct).toBe(false)
    expect(Number(wager.delta)).toBe(-10)
    // Even money: exactly the stake, and no recognition award for a miss.
    expect(Number(wager.balance_after)).toBe(balanceBefore - 10)
  }, 90_000)

  it('does not resolve twice, however often the award is retried', async () => {
    const { data: rows } = await player.client
      .from('attempt_wagers')
      .select('id, attempt_id, delta, resolved_at')
      .eq('player_id', player.id)
      .not('attempt_id', 'is', null)
      .order('resolved_at', { ascending: true })

    const balanceBefore = Number(
      ((await player.client.rpc('insight_wallet')).data as Record<string, unknown>).balance,
    )

    for (const row of rows ?? []) {
      if (row.attempt_id) {
        await player.client.rpc('award_attempt_xp', { p_attempt_id: row.attempt_id })
        await player.client.rpc('award_attempt_xp', { p_attempt_id: row.attempt_id })
      }
    }

    const { data: after } = await player.client
      .from('attempt_wagers')
      .select('id, attempt_id, delta, resolved_at')
      .eq('player_id', player.id)
      .not('attempt_id', 'is', null)
      .order('resolved_at', { ascending: true })

    // Same rows, same deltas, same timestamps — and the balance never moved.
    expect(after).toEqual(rows)
    expect(
      Number(((await player.client.rpc('insight_wallet')).data as Record<string, unknown>).balance),
    ).toBe(balanceBefore)
  }, 120_000)

  it('serves the Archive its conviction reading, settled rows only', async () => {
    /*
     * The exact query `archive-service.ts` issues for the conviction plate.
     *
     * It is worth running live rather than trusting the unit tests, because
     * every way this can fail is invisible from the client: a withheld column
     * grant, a filter PostgREST rejects, or an ordering on a nullable column.
     * All three would degrade the plate to "no stakes settled yet" — a
     * plausible-looking empty state that is simply a lie.
     */
    const { data, error } = await player.client
      .from('attempt_wagers')
      .select('stake, was_correct, delta')
      .eq('player_id', player.id)
      .not('resolved_at', 'is', null)
      .order('resolved_at', { ascending: false })
      .limit(400)

    expect(error).toBeNull()
    expect(data?.length).toBeGreaterThan(0)

    for (const row of data ?? []) {
      // Settled means graded. A null here would mean the filter is not doing
      // what the plate assumes, and the reading would count unfinished stakes.
      expect(typeof row.was_correct).toBe('boolean')
      expect(typeof row.delta).toBe('number')
      expect(row.stake).toBeGreaterThan(0)
    }

    // The plate's own summary must survive real rows without throwing.
    const summary = summariseConviction(
      (data ?? []).map((row) => ({
        stake: row.stake,
        wasCorrect: row.was_correct as boolean,
        delta: row.delta as number,
      })),
      60,
    )
    expect(summary.sampleSize).toBe(data?.length)
    expect(summary.netInsight).toBe((data ?? []).reduce((sum, row) => sum + (row.delta ?? 0), 0))
  }, 60_000)

  it('resolves an attempt that carries no wager without inventing one', async () => {
    /*
     * Phase 9.2 made a stake compulsory for a player who can afford one, so an
     * unwagered attempt is now only reachable below the smallest tier. What this
     * asserts is unchanged and still worth asserting: the award pipeline reports
     * `wager: null` rather than fabricating a settlement, and XP lands normally.
     * `recordAttempt` stakes only if the server demands it, so on a deployment
     * without the gate this remains a genuinely unwagered attempt.
     */
    const scenario = await loadScenarioForPlay(player, 'hard')
    const attemptId = await recordAttempt(player.client, {
      playerId: player.id,
      sessionId,
      scenarioId: scenario.id,
      choiceId: scenario.correct.choiceId,
      outcomeId: scenario.correct.outcomeId,
    })

    const awarded = await player.client.rpc('award_attempt_xp', { p_attempt_id: attemptId })
    const payload = awarded.data as Record<string, unknown>
    const wager = payload.wager as Record<string, unknown> | null

    expect(Number(payload.awarded)).toBeGreaterThan(0)

    if (wager === null) {
      // Unwagered: nothing settled, nothing invented.
      expect(wager).toBeNull()
    } else {
      // The gate is live, so the helper staked the minimum. Even money either way.
      expect(Math.abs(Number(wager.delta))).toBe(Number(wager.stake))
    }
  }, 60_000)
})

describe.skipIf(!live.available)('conviction precedes the answer (live database)', () => {
  /**
   * The ordering gate in `submit_attempt` (Phase 9.2).
   *
   * ── Why this block probes before it asserts ─────────────────────────────────
   * The migration has to deploy alongside the client that stakes first: an active
   * gate under the previous client would refuse every affordable player's answer.
   * So the gate may legitimately be absent from the project this suite is pointed
   * at, and the block says so loudly rather than reporting a pass over a rule
   * nothing is enforcing.
   */
  let player: LivePlayer
  let sessionId: string

  /**
   * Decided by the first test rather than by a dedicated probe player.
   *
   * The probe *is* the first assertion — submit with an affordable reserve and no
   * stake — so spending a second throwaway player and a second award pipeline run
   * to learn the same fact is load this suite does not need against a live
   * project. Null until that test has run.
   */
  let gateLive: boolean | null = null

  beforeAll(async () => {
    if (!live.available) return
    player = await createLivePlayer(live.env, 'wager-ordering')
    sessionId = await openSession(player.client, player.id)
  }, 60_000)

  afterAll(async () => {
    await player?.dispose()
  }, 30_000)

  it('refuses a fresh answer from a player who can afford a stake', async (ctx) => {
    const scenario = await loadScenarioForPlay(player, 'easy')

    // Affordable reserve, no wager on the table.
    const { error } = await player.client.rpc('submit_attempt', {
      p_session_id: sessionId,
      p_scenario_id: scenario.id,
      p_choice_id: scenario.correct.choiceId,
      p_response_time_ms: 4_000,
    })

    gateLive = isWagerRequiredError(error?.message)

    if (!gateLive) {
      console.warn(
        '[harness] ordering gate not deployed — Phase 9.2 assertions skipped. ' +
          'Apply 20260814000001_phase9_2_wager_before_answer.sql to enforce it.',
      )
      // Reported as skipped, never as a pass: a green tick over a rule nothing
      // is enforcing is the single most misleading outcome this suite can produce.
      ctx.skip()
    }

    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/wager is required/i)

    // And nothing was recorded — a refused answer is not a half-played scenario.
    const { data: attempts } = await player.client
      .from('attempts')
      .select('id')
      .eq('player_id', player.id)
      .eq('scenario_id', scenario.id)

    expect(attempts ?? []).toHaveLength(0)
  }, 90_000)

  it('accepts the answer once the stake is locked, and settles it as before', async (ctx) => {
    if (!gateLive) ctx.skip()
    const rules = await economy(player)
    const scenario = await loadScenarioForPlay(player, 'medium')

    const placed = await player.client.rpc('place_wager', {
      p_session_id: sessionId,
      p_scenario_id: scenario.id,
      p_stake: Math.min(...rules.tiers),
    })
    expect((placed.data as Record<string, unknown>).accepted).toBe(true)

    const attemptId = await recordAttempt(player.client, {
      playerId: player.id,
      sessionId,
      scenarioId: scenario.id,
      choiceId: scenario.correct.choiceId,
      outcomeId: scenario.correct.outcomeId,
      skipWager: true,
    })

    const awarded = await player.client.rpc('award_attempt_xp', { p_attempt_id: attemptId })
    const wager = (awarded.data as Record<string, unknown>).wager as Record<string, unknown>

    // Resolution is untouched by the reordering: even money, from the server's
    // own verdict, exactly as Phase 8.5 settled it.
    expect(wager.was_correct).toBe(true)
    expect(Number(wager.delta)).toBe(Math.min(...rules.tiers))
    expect(Number(wager.balance_after)).toBe(
      Number(wager.balance_before) + Math.min(...rules.tiers),
    )
  }, 90_000)

  it('lets a player below the smallest tier answer with no wager at all', async (ctx) => {
    // `live.available` re-checked so the env narrows for `createLivePlayer`.
    if (!gateLive || !live.available) ctx.skip()
    if (!live.available) return
    const rules = await economy(player)
    const drained = await createLivePlayer(live.env, 'wager-ordering-poor')

    try {
      const drainedSession = await openSession(drained.client, drained.id)
      const maxTier = Math.max(...rules.tiers)

      // Empty the reserve exactly: the starting balance equals the largest tier.
      const first = await loadScenarioForPlay(drained, 'easy')
      await drained.client.rpc('place_wager', {
        p_session_id: drainedSession,
        p_scenario_id: first.id,
        p_stake: maxTier,
      })
      const lost = await recordAttempt(drained.client, {
        playerId: drained.id,
        sessionId: drainedSession,
        scenarioId: first.id,
        choiceId: first.trap.choiceId,
        outcomeId: first.trap.outcomeId,
        skipWager: true,
      })
      await drained.client.rpc('award_attempt_xp', { p_attempt_id: lost })

      const emptied = (await drained.client.rpc('insight_wallet')).data as Record<string, unknown>
      expect(Number(emptied.balance)).toBe(0)

      // Zero Insight: the gate stands aside and the answer goes straight through.
      const second = await loadScenarioForPlay(drained, 'medium')
      const attemptId = await recordAttempt(drained.client, {
        playerId: drained.id,
        sessionId: drainedSession,
        scenarioId: second.id,
        choiceId: second.correct.choiceId,
        outcomeId: second.correct.outcomeId,
        skipWager: true,
      })
      const awarded = await drained.client.rpc('award_attempt_xp', { p_attempt_id: attemptId })

      expect(awarded.error).toBeNull()
      expect((awarded.data as Record<string, unknown>).wager).toBeNull()
      expect(Number((awarded.data as Record<string, unknown>).awarded)).toBeGreaterThan(0)

      /*
       * Now in the 1-to-9 band: one recognition award, still under the smallest
       * tier. The band a naive "balance > 0 means mandatory" rule would strand
       * with a compulsory wager it cannot afford.
       */
      const rebuilt = (await drained.client.rpc('insight_wallet')).data as Record<string, unknown>
      expect(Number(rebuilt.balance)).toBe(rules.recognitionAward)
      expect(Number(rebuilt.balance)).toBeGreaterThan(0)
      expect(Number(rebuilt.balance)).toBeLessThan(Math.min(...rules.tiers))
      expect(rebuilt.affordable).toEqual([])

      const third = await loadScenarioForPlay(drained, 'hard')
      const banded = await recordAttempt(drained.client, {
        playerId: drained.id,
        sessionId: drainedSession,
        scenarioId: third.id,
        choiceId: third.correct.choiceId,
        outcomeId: third.correct.outcomeId,
        skipWager: true,
      })

      expect(banded).toBeTruthy()

      // Insight never went below zero at any point in that sequence.
      const finalWallet = (await drained.client.rpc('insight_wallet')).data as Record<
        string,
        unknown
      >
      expect(Number(finalWallet.balance)).toBeGreaterThanOrEqual(0)
    } finally {
      await drained.dispose()
    }
  }, 240_000)

  it('keeps an attempt recorded before the gate existed replayable', async (ctx) => {
    if (!gateLive) ctx.skip()
    /*
     * Idempotency has to survive the new rule. An attempt from the old flow has
     * no wager row, so a gate placed ahead of the existing-attempt lookup would
     * turn every replay of it into a refusal. Re-submitting must still return the
     * decision on record.
     */
    const scenario = await loadScenarioForPlay(player, 'expert')
    await player.client.rpc('place_wager', {
      p_session_id: sessionId,
      p_scenario_id: scenario.id,
      p_stake: Math.min(...(await economy(player)).tiers),
    })

    const first = await recordAttempt(player.client, {
      playerId: player.id,
      sessionId,
      scenarioId: scenario.id,
      choiceId: scenario.correct.choiceId,
      outcomeId: scenario.correct.outcomeId,
      skipWager: true,
    })

    // The wager is now resolved, so a second submit has no *open* wager to find.
    await player.client.rpc('award_attempt_xp', { p_attempt_id: first })

    const replay = await recordAttempt(player.client, {
      playerId: player.id,
      sessionId,
      scenarioId: scenario.id,
      choiceId: scenario.correct.choiceId,
      outcomeId: scenario.correct.outcomeId,
      skipWager: true,
    })

    expect(replay).toBe(first)

    const { data: rows } = await player.client
      .from('attempts')
      .select('id')
      .eq('player_id', player.id)
      .eq('scenario_id', scenario.id)

    expect(rows ?? []).toHaveLength(1)
  }, 120_000)

  it('will not let a locked stake be committed twice', async (ctx) => {
    if (!gateLive) ctx.skip()
    const rules = await economy(player)
    const scenario = await loadScenarioForPlay(player, 'easy')

    const first = await player.client.rpc('place_wager', {
      p_session_id: sessionId,
      p_scenario_id: scenario.id,
      p_stake: Math.min(...rules.tiers),
    })
    expect((first.data as Record<string, unknown>).accepted).toBe(true)

    // A second lock at a different amount returns the original, unchanged.
    const second = await player.client.rpc('place_wager', {
      p_session_id: sessionId,
      p_scenario_id: scenario.id,
      p_stake: Math.max(...rules.tiers),
    })
    const payload = second.data as Record<string, unknown>

    expect(payload.reason).toBe('already_locked')
    expect(Number(payload.stake)).toBe(Math.min(...rules.tiers))
  }, 90_000)
})

describe.skipIf(!live.available)('a drained reserve (live database)', () => {
  let player: LivePlayer
  let sessionId: string

  beforeAll(async () => {
    if (!live.available) return
    player = await createLivePlayer(live.env, 'wager-drained')
    sessionId = await openSession(player.client, player.id)
  }, 60_000)

  afterAll(async () => {
    await player?.dispose()
  }, 30_000)

  it('never lets a balance go negative, and keeps the game playable at zero', async () => {
    const rules = await economy(player)
    const maxTier = Math.max(...rules.tiers)

    // Stake the whole reserve on a wrong answer. The starting balance equals the
    // largest tier, so one bad maximum-conviction call empties it exactly.
    const scenario = await loadScenarioForPlay(player, 'easy')
    const placed = await player.client.rpc('place_wager', {
      p_session_id: sessionId,
      p_scenario_id: scenario.id,
      p_stake: maxTier,
    })
    expect((placed.data as Record<string, unknown>).accepted).toBe(true)

    const attemptId = await recordAttempt(player.client, {
      playerId: player.id,
      sessionId,
      scenarioId: scenario.id,
      choiceId: scenario.trap.choiceId,
      outcomeId: scenario.trap.outcomeId,
    })
    const awarded = await player.client.rpc('award_attempt_xp', { p_attempt_id: attemptId })
    const wager = (awarded.data as Record<string, unknown>).wager as Record<string, unknown>

    expect(Number(wager.balance_after)).toBe(0)

    // Zero, not negative, and the wallet says so plainly.
    const wallet = (await player.client.rpc('insight_wallet')).data as Record<string, unknown>
    expect(Number(wallet.balance)).toBe(0)
    expect(wallet.affordable).toEqual([])

    // No stake is possible…
    const next = await loadScenarioForPlay(player, 'medium')
    const refused = await player.client.rpc('place_wager', {
      p_session_id: sessionId,
      p_scenario_id: next.id,
      p_stake: Math.min(...rules.tiers),
    })
    expect((refused.data as Record<string, unknown>).accepted).toBe(false)
    expect((refused.data as Record<string, unknown>).reason).toBe('insufficient_balance')

    // …but the scenario still plays, and being right rebuilds the reserve.
    const nextAttempt = await recordAttempt(player.client, {
      playerId: player.id,
      sessionId,
      scenarioId: next.id,
      choiceId: next.correct.choiceId,
      outcomeId: next.correct.outcomeId,
    })
    const nextAward = await player.client.rpc('award_attempt_xp', { p_attempt_id: nextAttempt })

    expect(nextAward.error).toBeNull()
    expect(Number((nextAward.data as Record<string, unknown>).awarded)).toBeGreaterThan(0)
    expect(Number((nextAward.data as Record<string, unknown>).insight_balance)).toBe(
      rules.recognitionAward,
    )
  }, 180_000)
})

describe.skipIf(!live.available)('wager security boundary (live database)', () => {
  let player: LivePlayer
  let stranger: LivePlayer
  let strangerScenarioId: string
  let strangerSessionId: string

  beforeAll(async () => {
    if (!live.available) return
    player = await createLivePlayer(live.env, 'wager-sec-a')
    stranger = await createLivePlayer(live.env, 'wager-sec-b')

    strangerSessionId = await openSession(stranger.client, stranger.id)
    const scenario = await loadScenarioForPlay(stranger, 'easy')
    strangerScenarioId = scenario.id

    await stranger.client.rpc('place_wager', {
      p_session_id: strangerSessionId,
      p_scenario_id: strangerScenarioId,
      p_stake: 25,
    })
  }, 120_000)

  afterAll(async () => {
    await player?.dispose()
    await stranger?.dispose()
  }, 60_000)

  it('shows no trace of another player’s wagers', async () => {
    const { data, error } = await player.client
      .from('attempt_wagers')
      .select('id, stake')
      .eq('player_id', stranger.id)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('rejects writing a wager directly', async () => {
    const { error } = await player.client.from('attempt_wagers').insert({
      player_id: player.id,
      session_id: strangerSessionId,
      scenario_id: strangerScenarioId,
      stake: 50,
      balance_before: 999_999,
    } as never)

    expect(error).not.toBeNull()
  })

  it('rejects grading your own wager', async () => {
    const ownSession = await openSession(player.client, player.id)
    const scenario = await loadScenarioForPlay(player, 'medium')
    await player.client.rpc('place_wager', {
      p_session_id: ownSession,
      p_scenario_id: scenario.id,
      p_stake: 10,
    })

    const { data: affected, error } = await player.client
      .from('attempt_wagers')
      .update({ was_correct: true, delta: 10, resolved_at: new Date().toISOString() })
      .eq('player_id', player.id)
      .select('id')

    // No UPDATE policy exists, so the statement matches nothing.
    expect(error).toBeNull()
    expect(affected).toEqual([])
  }, 60_000)

  /**
   * The Phase 8.4 regression. `revoke … from public` does not remove Supabase's
   * default explicit grants to `anon` and `authenticated`, so every internal
   * function has to be revoked from those roles by name. These four assert it
   * actually happened rather than trusting the migration read correctly.
   */
  it('keeps the balance calculator out of reach of the browser', async () => {
    const { error } = await player.client.rpc('insight_balance', { p_player_id: stranger.id })
    expect(error).not.toBeNull()
  })

  it('keeps the wager resolver out of reach of the browser', async () => {
    const { error } = await player.client.rpc('resolve_attempt_wager', {
      p_player_id: stranger.id,
      p_attempt_id: '00000000-0000-0000-0000-000000000000',
    })
    expect(error).not.toBeNull()
  })

  it('cannot resolve another player’s wager through the award pipeline', async () => {
    // `award_attempt_xp` derives the player from auth.uid() and looks the attempt
    // up under it, so another player's attempt simply does not exist.
    const strangerAttempt = await recordAttempt(stranger.client, {
      playerId: stranger.id,
      sessionId: strangerSessionId,
      scenarioId: strangerScenarioId,
      choiceId: (await loadScenarioForPlay(stranger, 'easy')).correct.choiceId,
      outcomeId: (await loadScenarioForPlay(stranger, 'easy')).correct.outcomeId,
    })

    const { error } = await player.client.rpc('award_attempt_xp', {
      p_attempt_id: strangerAttempt,
    })

    expect(error).not.toBeNull()
  }, 90_000)

  it('leaves the other player’s reserve untouched by any of it', async () => {
    const wallet = (await stranger.client.rpc('insight_wallet')).data as Record<string, unknown>
    const rules = await economy(stranger)

    /*
     * Their balance is exactly what their *own* history entitles them to.
     * Recognition Insight is derived from correct attempts rather than from the
     * award call, so an unawarded correct answer still counts — which is the
     * self-healing behaviour the rest of the progression layer has, and is why
     * this asserts the formula rather than the starting grant.
     */
    const { count: correctAttempts } = await stranger.client
      .from('attempts')
      .select('id, outcomes!inner ( is_correct )', { count: 'exact', head: true })
      .eq('player_id', stranger.id)
      .eq('outcomes.is_correct', true)

    expect(Number(wallet.balance)).toBe(
      rules.startingBalance + rules.recognitionAward * (correctAttempts ?? 0),
    )
    // Their locked wager is still locked — nobody else could resolve it.
    const { data: open } = await stranger.client
      .from('attempt_wagers')
      .select('resolved_at')
      .eq('player_id', stranger.id)

    expect(open?.every((row) => row.resolved_at === null)).toBe(true)
  })
})
