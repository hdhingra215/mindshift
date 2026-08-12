import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { probeLiveDatabase } from './support/live-env'
import {
  createLivePlayer,
  openSession,
  recordAttempt,
  type LivePlayer,
} from './support/live-player'
import { playThroughPack, twinThresholds, type PlayableScenario } from './support/twin-fixtures'

/**
 * The Cognitive Twin, against the real database.
 *
 * The Twin is the one system in the product that makes a *claim about the
 * player*, so the properties worth defending are mostly negative: it must not
 * speak below its evidence thresholds, must not predict every scenario, must not
 * grade itself, and must not be able to see anyone else's history.
 *
 * All of that lives in SQL, so all of it is verified here rather than in a unit
 * test. The copy layer is covered separately in `tests/unit/twin.test.ts`.
 */

/** Where the fixture history comes from. Twelve scenarios, one topical setting. */
const HISTORY_PACK = 'money-and-spending'

const live = await probeLiveDatabase()

if (!live.available) {
  console.warn(`[harness] twin suite skipped — ${live.reason}`)
}

describe.skipIf(!live.available)('Cognitive Twin — evidence thresholds (live database)', () => {
  let player: LivePlayer

  beforeAll(async () => {
    if (!live.available) return
    player = await createLivePlayer(live.env, 'twin-sealed')
  }, 60_000)

  afterAll(async () => {
    await player?.dispose()
  }, 30_000)

  it('seals a brand-new player rather than inventing a reading', async () => {
    const { data, error } = await player.client.rpc('twin_state', { p_player_id: player.id })
    const state = data as Record<string, unknown>

    expect(error).toBeNull()
    expect(state.status).toBe('sealed')
    expect(state.reason).toBe('insufficient_history')
    expect(Number(state.attempts)).toBe(0)
    // No patterns key at all while sealed — the interface cannot leak a claim
    // that the thresholds refused to make.
    expect(state.patterns).toBeUndefined()
  })

  it('declines to predict with no history, and says why', async () => {
    const scenario = await firstScenario(player)
    const { data, error } = await player.client.rpc('twin_predict_scenario', {
      p_scenario_id: scenario.id,
    })
    const result = data as Record<string, unknown>

    expect(error).toBeNull()
    expect(result.eligible).toBe(false)
    expect(result.reason).toBe('insufficient_history')
  })

  it('writes no prediction row when it declines', async () => {
    const { count, error } = await player.client
      .from('twin_predictions')
      .select('id', { count: 'exact', head: true })
      .eq('player_id', player.id)

    expect(error).toBeNull()
    expect(count).toBe(0)
  })

  it('stays sealed one decision short of the threshold', async () => {
    const thresholds = await twinThresholds(player.client)
    const sessionId = await openSession(player.client, player.id)
    const scenarios = await loadPack(player, HISTORY_PACK)

    // One short, deliberately: the boundary is where an off-by-one would let the
    // Twin speak before it has the evidence it promises.
    await playThroughPack(player, sessionId, scenarios.slice(0, thresholds.minTotalAttempts - 1), {
      catch: false,
    })

    const { data } = await player.client.rpc('twin_state', { p_player_id: player.id })
    const state = data as Record<string, unknown>

    expect(state.status).toBe('sealed')
    expect(Number(state.attempts)).toBe(thresholds.minTotalAttempts - 1)
  }, 180_000)
})

describe.skipIf(!live.available)('Cognitive Twin — prediction (live database)', () => {
  let player: LivePlayer
  let thresholds: Awaited<ReturnType<typeof twinThresholds>>
  let targets: PlayableScenario[]
  let sessionId: string

  beforeAll(async () => {
    if (!live.available) return
    player = await createLivePlayer(live.env, 'twin-predict')
    thresholds = await twinThresholds(player.client)
    sessionId = await openSession(player.client, player.id)
    const history = (await loadPack(player, HISTORY_PACK)).slice(0, thresholds.minTotalAttempts)

    // A deliberately lopsided record: every decision is a miss, so the Twin has
    // an unambiguous pattern to find and predict from.
    await playThroughPack(player, sessionId, history, { catch: false })

    targets = await predictableTargets(player, history.map((scenario) => scenario.id))
  }, 300_000)

  afterAll(async () => {
    await player?.dispose()
  }, 30_000)

  it('wakes up once the history threshold is met', async () => {
    const { data } = await player.client.rpc('twin_state', { p_player_id: player.id })
    const state = data as Record<string, unknown>

    expect(['watching', 'observing']).toContain(state.status)
    expect(Number(state.attempts)).toBe(thresholds.minTotalAttempts)
  })

  it('finds the lopsided context and reports the sample behind it', async () => {
    const { data } = await player.client.rpc('twin_state', { p_player_id: player.id })
    const state = data as Record<string, unknown>
    const patterns = (state.patterns ?? []) as Record<string, unknown>[]

    expect(state.status).toBe('observing')
    expect(patterns.length).toBeGreaterThan(0)

    for (const pattern of patterns) {
      // Every claim carries its own evidence, above the floor, and is lopsided
      // enough to be a pattern rather than a coin flip.
      expect(Number(pattern.sample_size)).toBeGreaterThanOrEqual(thresholds.minContextSample)
      expect(Number(pattern.edge)).toBeGreaterThanOrEqual(thresholds.minEdge)
      expect(['pack', 'category']).toContain(pattern.context_kind)
      expect(String(pattern.context_label).length).toBeGreaterThan(0)
      expect(Number(pattern.observed_rate)).toBeGreaterThanOrEqual(0)
      expect(Number(pattern.observed_rate)).toBeLessThanOrEqual(100)
      expect(Number(pattern.catches)).toBeLessThanOrEqual(Number(pattern.sample_size))
    }
  })

  it('predicts a miss for a player who keeps missing', async () => {
    const next = targets[0]
    if (!next) throw new Error('no predictable scenario left in the fixture')

    const { data, error } = await player.client.rpc('twin_predict_scenario', {
      p_scenario_id: next.id,
    })
    const result = data as Record<string, unknown>

    expect(error).toBeNull()
    expect(result.eligible).toBe(true)
    expect(result.predicted_catch).toBe(false)
    expect(Number(result.sample_size)).toBeGreaterThanOrEqual(thresholds.minContextSample)
  }, 60_000)

  it('returns the same prediction when asked twice, rather than rerolling', async () => {
    const next = targets[0]
    if (!next) throw new Error('no predictable scenario left in the fixture')

    const again = await player.client.rpc('twin_predict_scenario', { p_scenario_id: next.id })
    const result = again.data as Record<string, unknown>

    // A refresh must not let a player reroll until the Twin says something
    // flattering — and must not mint a second row for one scenario.
    expect(result.eligible).toBe(true)

    const { count } = await player.client
      .from('twin_predictions')
      .select('id', { count: 'exact', head: true })
      .eq('player_id', player.id)
      .eq('scenario_id', next.id)

    expect(count).toBe(1)
  }, 60_000)

  it('records the prediction before the player has answered', async () => {
    const { data, error } = await player.client
      .from('twin_predictions')
      .select('predicted_catch, sample_size, observed_rate, attempt_id, was_correct, resolved_at')
      .eq('player_id', player.id)
      .is('attempt_id', null)

    expect(error).toBeNull()
    expect(data?.length).toBe(1)
    // Unresolved means genuinely unresolved: no outcome, no grade, no timestamp.
    expect(data?.[0]?.was_correct).toBeNull()
    expect(data?.[0]?.resolved_at).toBeNull()
  })

  it('stays quiet on the very next scenario — cadence, not commentary', async () => {
    const other = targets[1]
    if (!other) throw new Error('no predictable scenario left in the fixture')

    const { data } = await player.client.rpc('twin_predict_scenario', {
      p_scenario_id: other.id,
    })
    const result = data as Record<string, unknown>

    expect(result.eligible).toBe(false)
    expect(result.reason).toBe('cooldown')
  }, 60_000)
})

describe.skipIf(!live.available)('Cognitive Twin — resolution and accuracy (live database)', () => {
  let player: LivePlayer
  let thresholds: Awaited<ReturnType<typeof twinThresholds>>
  let targets: PlayableScenario[]
  let sessionId: string

  beforeAll(async () => {
    if (!live.available) return
    player = await createLivePlayer(live.env, 'twin-resolve')
    thresholds = await twinThresholds(player.client)
    sessionId = await openSession(player.client, player.id)
    const history = (await loadPack(player, HISTORY_PACK)).slice(0, thresholds.minTotalAttempts)
    await playThroughPack(player, sessionId, history, { catch: false })

    targets = await predictableTargets(player, history.map((scenario) => scenario.id))
  }, 300_000)

  afterAll(async () => {
    await player?.dispose()
  }, 30_000)

  it('grades a correct prediction inside the award transaction', async () => {
    const target = targets[0]
    if (!target) throw new Error('no predictable scenario left in the fixture')

    const predicted = await player.client.rpc('twin_predict_scenario', {
      p_scenario_id: target.id,
    })
    const prediction = predicted.data as Record<string, unknown>
    expect(prediction.eligible).toBe(true)
    expect(prediction.predicted_catch).toBe(false)

    // Miss it, as predicted.
    const attemptId = await recordAttempt(player.client, {
      playerId: player.id,
      sessionId,
      scenarioId: target.id,
      choiceId: target.trap.choiceId,
      outcomeId: target.trap.outcomeId,
    })

    const awarded = await player.client.rpc('award_attempt_xp', { p_attempt_id: attemptId })
    const award = awarded.data as Record<string, unknown>
    const twin = award.twin as Record<string, unknown> | null

    // The verdict rides the award payload — the client never resolves it, and
    // therefore can never decline to record a miss.
    expect(twin).not.toBeNull()
    expect(twin?.was_correct).toBe(true)
    expect(twin?.predicted_catch).toBe(false)
    expect(twin?.actual_catch).toBe(false)
  }, 90_000)

  it('grades a missed prediction as a miss, not as an error', async () => {
    // Wait out the cooldown, then break the pattern.
    const filler = targets.slice(1, 1 + thresholds.cooldownAttempts)
    expect(filler.length).toBe(thresholds.cooldownAttempts)
    await playThroughPack(player, sessionId, filler, { catch: false })

    const target = targets[1 + thresholds.cooldownAttempts]
    if (!target) throw new Error('no predictable scenario left in the fixture')

    const predicted = await player.client.rpc('twin_predict_scenario', {
      p_scenario_id: target.id,
    })
    const prediction = predicted.data as Record<string, unknown>
    expect(prediction.eligible).toBe(true)
    expect(prediction.predicted_catch).toBe(false)

    // Catch it this time — the Twin should be wrong, and say so.
    const attemptId = await recordAttempt(player.client, {
      playerId: player.id,
      sessionId,
      scenarioId: target.id,
      choiceId: target.correct.choiceId,
      outcomeId: target.correct.outcomeId,
    })

    const awarded = await player.client.rpc('award_attempt_xp', { p_attempt_id: attemptId })
    const twin = (awarded.data as Record<string, unknown>).twin as Record<string, unknown> | null

    expect(twin?.was_correct).toBe(false)
    expect(twin?.predicted_catch).toBe(false)
    expect(twin?.actual_catch).toBe(true)
  }, 120_000)

  it('never regrades a resolved prediction, however often the award is retried', async () => {
    const before = await player.client
      .from('twin_predictions')
      .select('id, was_correct, resolved_at')
      .eq('player_id', player.id)
      .not('was_correct', 'is', null)
      .order('resolved_at', { ascending: true })

    const attempts = await player.client
      .from('twin_predictions')
      .select('attempt_id')
      .eq('player_id', player.id)
      .not('attempt_id', 'is', null)

    for (const row of attempts.data ?? []) {
      if (row.attempt_id) {
        await player.client.rpc('award_attempt_xp', { p_attempt_id: row.attempt_id })
      }
    }

    const after = await player.client
      .from('twin_predictions')
      .select('id, was_correct, resolved_at')
      .eq('player_id', player.id)
      .not('was_correct', 'is', null)
      .order('resolved_at', { ascending: true })

    expect(after.data).toEqual(before.data)
  }, 90_000)

  it('reports accuracy from what was actually recorded', async () => {
    const { data } = await player.client.rpc('twin_state', { p_player_id: player.id })
    const state = data as Record<string, unknown>

    const resolved = Number(state.predictions_resolved)
    const correct = Number(state.predictions_correct)

    expect(resolved).toBe(2)
    expect(correct).toBe(1)
    expect(correct).toBeLessThanOrEqual(resolved)

    const recent = (state.recent ?? []) as Record<string, unknown>[]
    expect(recent.length).toBe(2)
    // Every recent entry is fully resolved — the readout never shows a pending
    // prediction as though it had been graded.
    for (const entry of recent) {
      expect(entry.was_correct).not.toBeNull()
      expect(entry.resolved_at).not.toBeNull()
    }
  })
})

describe.skipIf(!live.available)('Cognitive Twin — privacy and integrity (live database)', () => {
  let player: LivePlayer
  let stranger: LivePlayer

  beforeAll(async () => {
    if (!live.available) return
    player = await createLivePlayer(live.env, 'twin-privacy')
    stranger = await createLivePlayer(live.env, 'twin-stranger')
  }, 90_000)

  afterAll(async () => {
    await player?.dispose()
    await stranger?.dispose()
  }, 60_000)

  it('refuses to read another player’s Twin', async () => {
    const { data, error } = await player.client.rpc('twin_state', {
      p_player_id: stranger.id,
    })
    const state = data as Record<string, unknown>

    // Sealed with `forbidden` rather than an error: the caller learns nothing
    // about the other player, not even whether they have a Twin.
    expect(error).toBeNull()
    expect(state.status).toBe('sealed')
    expect(state.reason).toBe('forbidden')
    expect(state.patterns).toBeUndefined()
    expect(state.attempts).toBeUndefined()
  })

  it('shows no prediction rows belonging to another player', async () => {
    const { data, error } = await player.client
      .from('twin_predictions')
      .select('id')
      .eq('player_id', stranger.id)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('rejects writing a prediction directly', async () => {
    const { error } = await player.client.from('twin_predictions').insert({
      player_id: player.id,
      scenario_id: '00000000-0000-0000-0000-000000000000',
      predicted_catch: true,
      context_kind: 'pack',
      context_label: 'Money & Spending',
      sample_size: 99,
      observed_rate: 100,
    } as never)

    expect(error).not.toBeNull()
  })

  it('rejects grading your own prediction', async () => {
    const { data: affected, error } = await player.client
      .from('twin_predictions')
      .update({ was_correct: true })
      .eq('player_id', player.id)
      .select('id')

    // No UPDATE policy exists, so the statement matches nothing.
    expect(error).toBeNull()
    expect(affected).toEqual([])
  })

  it('keeps the evidence functions out of reach of the browser', async () => {
    // These take a player id as an argument, so they are granted to nobody.
    const facts = await player.client.rpc('twin_attempt_facts', { p_player_id: stranger.id })
    const patterns = await player.client.rpc('twin_patterns', { p_player_id: stranger.id })

    expect(facts.error).not.toBeNull()
    expect(patterns.error).not.toBeNull()
  })
})

/** The first playable scenario, for the "no history" checks. */
async function firstScenario(player: LivePlayer): Promise<PlayableScenario> {
  const [scenario] = await loadPack(player, HISTORY_PACK)
  if (!scenario) throw new Error('no playable scenario seeded')
  return scenario
}

/**
 * Every playable scenario in one pack.
 *
 * The Twin needs evidence concentrated on a single context, and a pack holds
 * twelve scenarios — exactly the history threshold, with none left over. So the
 * history comes from one pack and the prediction targets come from elsewhere,
 * matched on whichever context the Twin actually found (see `predictableTargets`).
 */
async function loadPack(player: LivePlayer, packSlug: string): Promise<PlayableScenario[]> {
  // Service role: the answer key is not player-readable as of Phase 8.6, and a
  // fixture that must miss twelve scenarios on purpose has to know which choice
  // does that. Every assertion still runs through `player.client`.
  const { data, error } = await player.admin
    .from('scenario_pack_items')
    .select(
      'sort_order, scenario_packs!inner ( slug ), scenarios!inner ( id, slug, status, deleted_at, scenario_choices ( id, is_trap, outcomes ( id, is_correct ) ) )',
    )
    .eq('scenario_packs.slug', packSlug)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`pack load failed: ${error.message}`)

  return (data ?? []).flatMap((row) => toPlayable(row.scenarios))
}

/**
 * Unplayed scenarios the Twin could legitimately predict on.
 *
 * Driven by what the Twin itself reports rather than by a hardcoded guess: the
 * suite reads its patterns, then finds scenarios in those same contexts. A
 * fixture that assumed which context would emerge would break the moment the
 * seeded content was rebalanced, and would be testing the fixture's assumption
 * rather than the Twin.
 */
async function predictableTargets(
  player: LivePlayer,
  playedIds: readonly string[],
): Promise<PlayableScenario[]> {
  const { data } = await player.client.rpc('twin_state', { p_player_id: player.id })
  const patterns = ((data as Record<string, unknown>).patterns ?? []) as Record<string, unknown>[]

  const categoryLabels = patterns
    .filter((pattern) => pattern.context_kind === 'category')
    .map((pattern) => String(pattern.context_label))

  if (categoryLabels.length === 0) return []

  // Service role, same reason as `loadPack`.
  const { data: rows, error } = await player.admin
    .from('scenarios')
    .select(
      'id, slug, status, deleted_at, categories!inner ( name ), scenario_choices ( id, is_trap, outcomes ( id, is_correct ) )',
    )
    .in('categories.name', categoryLabels)
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('slug', { ascending: true })

  if (error) throw new Error(`target load failed: ${error.message}`)

  const played = new Set(playedIds)
  return (rows ?? []).flatMap((row) => (played.has(row.id) ? [] : toPlayable(row)))
}

type ScenarioRow = {
  id: string
  slug: string
  status: string
  deleted_at: string | null
  scenario_choices: { id: string; is_trap: boolean; outcomes: { id: string; is_correct: boolean } | null }[]
} | null

/** A scenario is playable only if it offers both a correct and an incorrect way out. */
function toPlayable(scenario: ScenarioRow): PlayableScenario[] {
  if (!scenario || scenario.status !== 'published' || scenario.deleted_at) return []

  const correct = scenario.scenario_choices.find((choice) => choice.outcomes?.is_correct === true)
  const trap = scenario.scenario_choices.find((choice) => choice.outcomes?.is_correct === false)
  if (!correct?.outcomes || !trap?.outcomes) return []

  return [
    {
      id: scenario.id,
      slug: scenario.slug,
      correct: { choiceId: correct.id, outcomeId: correct.outcomes.id },
      trap: { choiceId: trap.id, outcomeId: trap.outcomes.id },
    },
  ]
}
