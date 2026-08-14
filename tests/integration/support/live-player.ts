import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database.types'

import type { LiveEnv } from './live-env'

/**
 * A throwaway player, and the two clients the harness talks through.
 *
 * ── The rule this file exists to enforce ────────────────────────────────────
 * Every read, write and RPC **under test** goes through `client`, which holds
 * the anon key and a real signed-in session — so the harness exercises the same
 * code path and the same RLS policies the product does. A harness that ran as
 * service role would prove the SQL works for a superuser and nothing about
 * whether a player can reach it.
 *
 * `admin` (service role) is permitted three things, all of them setup or
 * teardown and none of them an assertion:
 *   1. creating the test player,
 *   2. deleting it,
 *   3. backdating fixture rows for the streak tests — a run spanning several
 *      days is otherwise impossible, and grace cannot be verified without one,
 *   4. reading which choice is correct, which as of Phase 8.6 a player cannot
 *      see before answering. A fixture that needs to answer *correctly on
 *      purpose* has to know the answer; the player under test still does not.
 * Nothing the harness *asserts* is ever produced by the admin client.
 *
 * The player is deleted in `afterAll`. `profiles.id` cascades from
 * `auth.users`, and every progression table cascades from `profiles`, so
 * removing the auth user removes the entire footprint — no orphan rows are left
 * in a live project.
 */

export type LivePlayer = {
  /** Anon-key client, signed in as the test player. Use this for everything. */
  client: SupabaseClient<Database>
  /** Service-role client. Creation and deletion only. */
  admin: SupabaseClient<Database>
  id: string
  email: string
  dispose: () => Promise<void>
}

/** Marks every account this harness makes, so a stray one is identifiable. */
const TEST_EMAIL_PREFIX = 'harness+phase83'

export async function createLivePlayer(env: LiveEnv, label: string): Promise<LivePlayer> {
  const admin = createClient<Database>(env.url, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Unique per run so two harness runs can never collide on the same account.
  const email = `${TEST_EMAIL_PREFIX}.${label}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@mindshift.test`
  const password = `Harness!${Math.random().toString(36).slice(2)}Aa1`

  const created = await admin.auth.admin.createUser({
    email,
    password,
    // Confirmed on creation: the harness is testing progression, not the
    // verification email flow, which has its own coverage in the auth feature.
    email_confirm: true,
    user_metadata: { display_name: 'Harness Player' },
  })

  if (created.error || !created.data.user) {
    throw new Error(`could not create test player: ${created.error?.message ?? 'no user returned'}`)
  }

  const id = created.data.user.id

  const client = createClient<Database>(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const signedIn = await client.auth.signInWithPassword({ email, password })
  if (signedIn.error) {
    await admin.auth.admin.deleteUser(id)
    throw new Error(`could not sign in as test player: ${signedIn.error.message}`)
  }

  /*
   * Bootstrap the profile exactly the way the product does — an upsert through
   * the anon client under `profiles_insert_own`. There is no trigger on
   * `auth.users`, so this is a real dependency rather than setup convenience,
   * and running it here means the harness would catch the policy regressing.
   */
  const profile = await client
    .from('profiles')
    .upsert({ id, display_name: 'Harness Player' }, { onConflict: 'id', ignoreDuplicates: true })

  if (profile.error) {
    await admin.auth.admin.deleteUser(id)
    throw new Error(`profile bootstrap failed: ${profile.error.message}`)
  }

  return {
    client,
    admin,
    id,
    email,
    dispose: async () => {
      await client.auth.signOut()
      // Cascades through profiles into every progression table.
      await admin.auth.admin.deleteUser(id)
    },
  }
}

/**
 * A published scenario, with the answer key, for a fixture that needs to answer
 * a particular way on purpose.
 *
 * ── Why this reads as service role ──────────────────────────────────────────
 * As of Phase 8.6 a player cannot see `is_trap` or any outcome before answering
 * — that is the property under test. A fixture still has to know which choice is
 * correct in order to construct "answer correctly" and "answer wrongly" cases,
 * so it asks the admin client. The player under test learns nothing: every
 * assertion still runs through `player.client`, and the blindness of the player
 * path is itself asserted in `reveal.test.ts`.
 */
export async function loadScenarioForPlay(
  player: LivePlayer,
  difficulty: Database['public']['Enums']['difficulty_level'] = 'easy',
) {
  const { data, error } = await player.admin
    .from('scenarios')
    .select(
      'id, slug, title, difficulty, scenario_choices ( id, is_trap, outcomes ( id, is_correct, xp_reward ) ), scenario_biases ( bias_id )',
    )
    .eq('status', 'published')
    .eq('difficulty', difficulty)
    .is('deleted_at', null)
    .order('slug', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`scenario load failed: ${error.message}`)
  if (!data) throw new Error(`no published ${difficulty} scenario is seeded`)

  const correct = data.scenario_choices.find((choice) => choice.outcomes?.is_correct === true)
  const trap = data.scenario_choices.find((choice) => choice.outcomes?.is_correct === false)

  if (!correct?.outcomes || !trap?.outcomes) {
    throw new Error(`scenario ${data.slug} lacks both a correct and an incorrect outcome`)
  }

  return {
    id: data.id,
    slug: data.slug,
    difficulty: data.difficulty,
    biasIds: data.scenario_biases.map((link) => link.bias_id),
    correct: { choiceId: correct.id, outcomeId: correct.outcomes.id, xp: correct.outcomes.xp_reward },
    trap: { choiceId: trap.id, outcomeId: trap.outcomes.id, xp: trap.outcomes.xp_reward },
  }
}

/** Opens a session the way `getOrCreateSession` does. */
export async function openSession(
  client: SupabaseClient<Database>,
  playerId: string,
): Promise<string> {
  const { data, error } = await client
    .from('sessions')
    .insert({ player_id: playerId, source: 'free_play' })
    .select('id')
    .single()

  if (error) throw new Error(`session insert failed: ${error.message}`)
  return data.id
}

/** How `submit_attempt`'s ordering gate names a missing wager. */
const WAGER_REQUIRED = /wager is required/i

/**
 * Lock the smallest affordable stake, if the reserve can cover one.
 *
 * Returns whether a stake is now on the table. `place_wager` is re-entrant, so a
 * scenario the caller already staked on keeps its original stake rather than
 * being overwritten — which is what lets this run unconditionally.
 */
async function stakeMinimum(
  client: SupabaseClient<Database>,
  sessionId: string,
  scenarioId: string,
): Promise<boolean> {
  const wallet = (await client.rpc('insight_wallet')).data as { affordable?: unknown } | null
  const affordable = Array.isArray(wallet?.affordable)
    ? wallet.affordable.map(Number).sort((a, b) => a - b)
    : []

  if (affordable.length === 0) return false

  const placed = await client.rpc('place_wager', {
    p_session_id: sessionId,
    p_scenario_id: scenarioId,
    p_stake: affordable[0]!,
  })
  return (placed.data as { accepted?: boolean } | null)?.accepted === true
}

/**
 * Record a decision through the only path that exists.
 *
 * Direct inserts into `attempts` were removed in Phase 8.6 — the client used to
 * supply `outcome_id`, which let it record one choice against another's outcome.
 * The harness goes through `submit_attempt` for the same reason the product
 * does, so these tests exercise the real submission path.
 *
 * `outcomeId` is still accepted so existing call sites read unchanged, but it is
 * deliberately ignored: the server derives the outcome from the choice, and a
 * fixture that could override it would not be testing the product.
 *
 * ── Why this retries rather than always staking first ───────────────────────
 * Phase 9.2 requires a locked wager before an affordable player may answer. This
 * helper is used by every suite, most of which care nothing about the economy, so
 * it plays the scenario the way a player now has to: submit, and if the ordering
 * gate declines, lock the smallest affordable stake and submit again.
 *
 * Reacting to the refusal rather than pre-emptively staking keeps the suites
 * honest on either side of that deployment — no wager is invented on a server
 * that does not ask for one, so the tests that assert an *unwagered* attempt
 * still describe something real. `skipWager` opts out entirely, for the tests
 * whose subject is the gate itself.
 */
export async function recordAttempt(
  client: SupabaseClient<Database>,
  params: {
    playerId: string
    sessionId: string
    scenarioId: string
    choiceId: string
    outcomeId?: string
    responseTimeMs?: number
    /** Never pre-stake, so a refusal surfaces as a thrown error. */
    skipWager?: boolean
  },
): Promise<string> {
  const submit = () =>
    client.rpc('submit_attempt', {
      p_session_id: params.sessionId,
      p_scenario_id: params.scenarioId,
      p_choice_id: params.choiceId,
      p_response_time_ms: params.responseTimeMs ?? 9_000,
    })

  let { data, error } = await submit()

  if (error && !params.skipWager && WAGER_REQUIRED.test(error.message)) {
    const staked = await stakeMinimum(client, params.sessionId, params.scenarioId)
    if (!staked) {
      throw new Error(
        `submit_attempt demanded a wager the reserve could not cover: ${error.message}`,
      )
    }
    ;({ data, error } = await submit())
  }

  if (error) throw new Error(`submit_attempt failed: ${error.message}`)

  const attemptId = (data as { attempt_id?: string } | null)?.attempt_id
  if (!attemptId) throw new Error('submit_attempt returned no attempt id')
  return attemptId
}

/**
 * Does this error message mean the Phase 9.2 ordering gate declined?
 *
 * Exported so a suite can tell "the gate refused me" from a genuine failure, and
 * so the string is matched in exactly one place. The gate has to be detected
 * rather than assumed: the migration ships *with* the client that stakes first,
 * because an active gate under the previous client would refuse every affordable
 * player's answer. A suite whose subject is the gate says so loudly and stops
 * when it is absent — a silent pass over an unenforced rule is the one outcome
 * worth ruling out.
 */
export function isWagerRequiredError(message: string | undefined): boolean {
  return message !== undefined && WAGER_REQUIRED.test(message)
}
