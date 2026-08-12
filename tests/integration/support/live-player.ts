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
  },
): Promise<string> {
  const { data, error } = await client.rpc('submit_attempt', {
    p_session_id: params.sessionId,
    p_scenario_id: params.scenarioId,
    p_choice_id: params.choiceId,
    p_response_time_ms: params.responseTimeMs ?? 9_000,
  })

  if (error) throw new Error(`submit_attempt failed: ${error.message}`)

  const attemptId = (data as { attempt_id?: string } | null)?.attempt_id
  if (!attemptId) throw new Error('submit_attempt returned no attempt id')
  return attemptId
}
