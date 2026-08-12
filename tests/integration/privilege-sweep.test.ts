import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { probeLiveDatabase } from './support/live-env'
import {
  createLivePlayer,
  loadScenarioForPlay,
  openSession,
  recordAttempt,
  type LivePlayer,
} from './support/live-player'
import {
  EXPECTED_FUNCTION_COUNT_FLOOR,
  PLAYER_OWNED_TABLES,
  READABLE_CHOICE_COLUMNS,
  REACHABLE_FUNCTIONS,
  isPermissionRefusal,
  listDatabaseFunctions,
  listTableColumns,
} from './support/surface'

/**
 * The privilege sweep.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 * Three privilege defects shipped in three consecutive phases — 8.4, 8.5, 8.6 —
 * with three different causes and one identical symptom: a `revoke` that reads
 * correctly, runs without error, and does nothing. Every one was caught by
 * chance, because somebody wrote an adversarial test in the same session.
 *
 * This suite removes the chance. It enumerates the real surface from the
 * generated schema and requires every item to be *classified* — so the next
 * function or answer-carrying column fails the build until someone states, in
 * `support/surface.ts`, whether a player may reach it. That decision is exactly
 * the one that kept being made by accident.
 *
 * Everything here runs as an ordinary signed-in player. A sweep that used the
 * service role would prove the schema works for a superuser and nothing else.
 */

const live = await probeLiveDatabase()

if (!live.available) {
  console.warn(`[harness] privilege sweep skipped — ${live.reason}`)
}

/** Call an RPC the generated types may not permit, to observe the refusal. */
async function probeRpc(
  player: LivePlayer,
  name: string,
  args: Record<string, unknown>,
): Promise<{ code?: string; message?: string } | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the sweep
  // deliberately calls functions the typed client refuses to name.
  const rpc = (player.client as any).rpc.bind(player.client)
  const { error } = await rpc(name, args)
  return error ?? null
}

/** Plausible values by argument name, so a refusal is about privilege, not shape. */
function dummyArgs(names: readonly string[]): Record<string, unknown> {
  const NIL_UUID = '00000000-0000-0000-0000-000000000000'
  const value = (arg: string): unknown => {
    if (arg.endsWith('_id')) return NIL_UUID
    if (arg === 'p_allow_grace') return true
    if (arg === 'p_difficulty') return 'easy'
    if (arg === 'p_tier') return 'aware'
    if (arg === 'p_source') return 'attempt'
    if (arg === 'p_reason') return 'sweep'
    if (arg === 'p_criteria' || arg === 'p_facts' || arg === 'p_progress') return {}
    if (arg.startsWith('p_is_') || arg.startsWith('p_awarded_')) return false
    return 0
  }
  return Object.fromEntries(names.map((arg) => [arg, value(arg)]))
}

describe.skipIf(!live.available)('privilege sweep — functions (live database)', () => {
  let player: LivePlayer
  let stranger: LivePlayer

  beforeAll(async () => {
    if (!live.available) return
    player = await createLivePlayer(live.env, 'sweep-a')
    stranger = await createLivePlayer(live.env, 'sweep-b')
  }, 120_000)

  afterAll(async () => {
    await player?.dispose()
    await stranger?.dispose()
  }, 60_000)

  /**
   * The gate that makes this a sweep rather than a checklist.
   *
   * A new function is unclassified until someone adds it to `REACHABLE_FUNCTIONS`
   * or to the internal set by omission — and this test forces that to be a
   * deliberate act rather than a default.
   */
  it('classifies every function the schema exposes', () => {
    const actual = listDatabaseFunctions().map((fn) => fn.name)
    const reachable = new Set(REACHABLE_FUNCTIONS.map((fn) => fn.name))

    /*
     * The sweep is only as good as its enumeration. The first version of the
     * parser silently found 23 of 40 functions and reported a clean sweep over
     * the subset it happened to see — so the count is asserted before anything
     * is concluded from it.
     */
    expect(
      actual.length,
      'the function parser is under-enumerating — the sweep would pass over a subset',
    ).toBeGreaterThanOrEqual(EXPECTED_FUNCTION_COUNT_FLOOR)
    expect(new Set(actual).size, 'duplicate function names parsed').toBe(actual.length)

    // Every declared-reachable function must still exist. A stale allowlist is
    // a silent hole: it stops asserting anything about a renamed function.
    for (const declared of reachable) {
      expect(actual, `${declared} is declared reachable but no longer exists`).toContain(declared)
    }
  })

  it('refuses every internal function to an ordinary player', async () => {
    const reachable = new Set(REACHABLE_FUNCTIONS.map((fn) => fn.name))
    const internal = listDatabaseFunctions().filter((fn) => !reachable.has(fn.name))

    expect(internal.length).toBeGreaterThan(0)

    const leaked: string[] = []
    for (const fn of internal) {
      // Correct argument *names*, so a refusal cannot be a shape mismatch
      // masquerading as security.
      const error = await probeRpc(player, fn.name, dummyArgs(fn.args))
      if (!isPermissionRefusal(error)) {
        leaked.push(`${fn.name} → ${error ? `${error.code}: ${error.message}` : 'NO ERROR (executed!)'}`)
      }
    }

    expect(leaked, `internal functions reachable by an authenticated player:\n${leaked.join('\n')}`)
      .toEqual([])
  }, 180_000)

  it('keeps every declared-reachable function actually reachable', async () => {
    const broken: string[] = []

    for (const fn of REACHABLE_FUNCTIONS) {
      const error = await probeRpc(player, fn.name, fn.args)

      if (isPermissionRefusal(error)) {
        broken.push(`${fn.name} → ${error?.code}: ${error?.message}`)
        continue
      }
      // A function declared to work on dummy arguments must actually work —
      // otherwise the entry proves nothing and would hide a later revoke.
      if (!fn.errorsOnDummyArgs && error) {
        broken.push(`${fn.name} unexpectedly errored → ${error.code}: ${error.message}`)
      }
    }

    expect(broken, `declared-reachable functions that are not:\n${broken.join('\n')}`).toEqual([])
  }, 180_000)

  /**
   * Guarded functions accept a player id. Passing someone else's must be
   * refused — a grant alone is not a security boundary for these.
   */
  it('refuses guarded functions another player’s id', async () => {
    const guarded = REACHABLE_FUNCTIONS.filter((fn) => fn.reason === 'guarded')
    expect(guarded.length).toBeGreaterThan(0)

    const leaked: string[] = []
    for (const fn of guarded) {
      const { data, error } = await (
        player.client as unknown as {
          rpc: (n: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>
        }
      ).rpc(fn.name, { ...fn.args, p_player_id: stranger.id })

      // Either a hard refusal, or a sealed/empty answer that reveals nothing.
      const refused = error !== null
      const sealed =
        typeof data === 'object' &&
        data !== null &&
        (data as Record<string, unknown>).status === 'sealed'
      const empty = data === null || (Array.isArray(data) && data.length === 0) || data === 0

      if (!refused && !sealed && !empty) {
        leaked.push(`${fn.name} → ${JSON.stringify(data)?.slice(0, 120)}`)
      }
    }

    expect(leaked, `guarded functions answered for another player:\n${leaked.join('\n')}`).toEqual(
      [],
    )
  }, 120_000)
})

describe.skipIf(!live.available)('privilege sweep — answer-identifying columns (live database)', () => {
  let player: LivePlayer
  let unseenScenarioId: string

  beforeAll(async () => {
    if (!live.available) return
    player = await createLivePlayer(live.env, 'sweep-columns')
    const scenario = await loadScenarioForPlay(player, 'easy')
    unseenScenarioId = scenario.id
  }, 90_000)

  afterAll(async () => {
    await player?.dispose()
  }, 30_000)

  /**
   * The column equivalent of the function gate. `is_trap` and `bias_id` were the
   * tells last time; the next one will have a different name, and this fails the
   * build the moment it appears rather than the moment someone notices.
   */
  it('withholds every scenario_choices column not on the allowlist', async () => {
    const declared = new Set(READABLE_CHOICE_COLUMNS)
    const withheld = listTableColumns('scenario_choices').filter((col) => !declared.has(col))

    expect(withheld.length, 'no columns are withheld — the allowlist has gone stale').toBeGreaterThan(0)

    const leaked: string[] = []
    for (const column of withheld) {
      const { error } = await player.client
        .from('scenario_choices')
        .select(column)
        .eq('scenario_id', unseenScenarioId)
        .limit(1)

      if (!isPermissionRefusal(error)) leaked.push(`${column} → ${error?.code ?? 'readable'}`)
    }

    expect(leaked, `answer-identifying columns readable by a player:\n${leaked.join('\n')}`).toEqual(
      [],
    )
  }, 120_000)

  it('still exposes every column needed to answer', async () => {
    const { error } = await player.client
      .from('scenario_choices')
      .select(READABLE_CHOICE_COLUMNS.join(', '))
      .eq('scenario_id', unseenScenarioId)

    expect(error).toBeNull()
  })

  it('exposes no outcome before the decision is recorded', async () => {
    const { data, error } = await player.client
      .from('outcomes')
      .select('id, is_correct, xp_reward, result_text, explanation')
      .limit(500)

    expect(error).toBeNull()
    // This player has attempted nothing. 216 outcomes exist.
    expect(data).toEqual([])
  })
})

describe.skipIf(!live.available)('privilege sweep — player-owned tables (live database)', () => {
  let player: LivePlayer
  let stranger: LivePlayer

  beforeAll(async () => {
    if (!live.available) return
    player = await createLivePlayer(live.env, 'sweep-tables-a')
    stranger = await createLivePlayer(live.env, 'sweep-tables-b')

    // Give the stranger a real footprint, so "reads nothing" is a meaningful
    // assertion rather than a statement about an empty account.
    const sessionId = await openSession(stranger.client, stranger.id)
    const scenario = await loadScenarioForPlay(stranger, 'easy')
    await stranger.client.rpc('place_wager', {
      p_session_id: sessionId,
      p_scenario_id: scenario.id,
      p_stake: 10,
    })
    const attemptId = await recordAttempt(stranger.client, {
      playerId: stranger.id,
      sessionId,
      scenarioId: scenario.id,
      choiceId: scenario.correct.choiceId,
    })
    await stranger.client.rpc('award_attempt_xp', { p_attempt_id: attemptId })
  }, 180_000)

  afterAll(async () => {
    await player?.dispose()
    await stranger?.dispose()
  }, 60_000)

  it('shows no row of another player’s record, on any table', async () => {
    const leaked: string[] = []

    for (const table of PLAYER_OWNED_TABLES) {
      const { data, error } = await player.client
        .from(table as 'attempts')
        .select('id')
        .eq('player_id', stranger.id)

      if (error) {
        leaked.push(`${table} → unexpected error ${error.code}: ${error.message}`)
      } else if ((data ?? []).length > 0) {
        leaked.push(`${table} → ${data!.length} row(s) of another player visible`)
      }
    }

    expect(leaked, `cross-player reads succeeded:\n${leaked.join('\n')}`).toEqual([])
  }, 120_000)

  /**
   * Every one of these is written by the award pipeline. A client that could
   * write any of them could mint the thing it measures.
   */
  it('refuses a direct write to every player-owned table', async () => {
    const leaked: string[] = []

    for (const table of PLAYER_OWNED_TABLES) {
      const { error } = await player.client
        .from(table as 'attempts')
        .insert({ player_id: player.id } as never)

      // Any error is acceptable — RLS refusal or a not-null violation both mean
      // the row did not land. Success is the only failure.
      if (!error) leaked.push(`${table} accepted a direct insert`)
    }

    expect(leaked, `direct writes succeeded:\n${leaked.join('\n')}`).toEqual([])
  }, 120_000)

  it('refuses to update another player’s record', async () => {
    const leaked: string[] = []

    for (const table of PLAYER_OWNED_TABLES) {
      const { data, error } = await player.client
        .from(table as 'attempts')
        .update({ player_id: player.id } as never)
        .eq('player_id', stranger.id)
        .select('id')

      // No UPDATE policy exists on these, so the statement must match nothing.
      if (!error && (data ?? []).length > 0) {
        leaked.push(`${table} → ${data!.length} row(s) of another player updated`)
      }
    }

    expect(leaked, `cross-player writes succeeded:\n${leaked.join('\n')}`).toEqual([])
  }, 120_000)
})
