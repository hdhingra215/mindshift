import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * The declared attack surface, and the machinery to enumerate the real one.
 *
 * ── Why this is enumerated rather than listed ───────────────────────────────
 * Three privilege defects shipped in three consecutive phases, each caught only
 * because somebody happened to write an adversarial test in the same session.
 * A hand-maintained list of "things to check" would have the same failure mode:
 * it protects what someone remembered.
 *
 * So the sweep derives the *actual* surface from the generated schema and
 * requires every item on it to be classified below. Add a function or a column
 * and the sweep fails until you say, in this file, whether a player may reach
 * it — which is the decision that keeps getting made by accident.
 */

const TYPES_PATH = resolve(process.cwd(), 'src/types/database.types.ts')

function schemaSource(): string {
  return readFileSync(TYPES_PATH, 'utf8')
}

/** The `public` schema's `Functions` block — the last of the two in the file. */
function functionsBlock(source: string): string {
  const blocks = source.match(/\n {4}Functions: \{\n([\s\S]*?)\n {4}\}\n {4}Enums/g)
  const last = blocks?.[blocks.length - 1]
  if (!last) throw new Error('could not locate the public Functions block in database.types.ts')
  return last
}

export type DbFunction = {
  name: string
  /** Argument names, in declaration order. Empty for a no-arg function. */
  args: string[]
}

/**
 * Every function PostgREST exposes on `public`, with its argument names.
 *
 * Read from the generated types rather than from `pg_proc`, because a player
 * cannot read `pg_proc` — and the generated file is the artifact the client is
 * compiled against, so a stale one is itself a defect worth failing on.
 */
export function listDatabaseFunctions(): DbFunction[] {
  /*
   * Scanned line by line rather than matched with one regex, because the
   * generator emits two shapes: a single line for short signatures and an
   * indented block for long ones. A regex written for the block form silently
   * found 23 of 40 functions — under-enumeration is the worst possible bug in a
   * sweep, since it reports success over the subset it happened to see.
   */
  const lines = functionsBlock(schemaSource()).split('\n')
  const functions: DbFunction[] = []

  let name: string | null = null
  let buffer = ''

  const flush = () => {
    if (!name) return
    const argsMatch = buffer.match(/Args:\s*(\{[\s\S]*?\})\s*(?:;|\n)?\s*Returns:/)
    const raw = argsMatch?.[1] ?? '{}'
    functions.push({
      name,
      args: [...raw.matchAll(/([a-z_]+)\??:/g)].map((match) => match[1]!),
    })
    name = null
    buffer = ''
  }

  for (const line of lines) {
    const opener = line.match(/^ {6}([a-z_]+): \{/)

    if (opener) {
      flush()
      name = opener[1]!
      buffer = line
      // Single-line entry: `name: { Args: {...}; Returns: X }`.
      if (/\}\s*$/.test(line) && line.includes('Returns:')) flush()
      continue
    }

    if (name) {
      buffer += `\n${line}`
      if (/^ {6}\}/.test(line)) flush()
    }
  }
  flush()

  return functions
}

/** Column names declared on a table's `Row` type. */
export function listTableColumns(table: string): string[] {
  const source = schemaSource()
  const match = source.match(
    new RegExp(`\\n {6}${table}: \\{\\n {8}Row: \\{\\n([\\s\\S]*?)\\n {8}\\}\\n`),
  )
  if (!match?.[1]) throw new Error(`could not locate Row type for ${table}`)
  return [...match[1].matchAll(/^ {10}([a-z_]+):/gm)].map((entry) => entry[1]!)
}

/**
 * Functions a signed-in player may execute.
 *
 * Each entry states *why* it is safe. There are only three acceptable reasons,
 * and a fourth does not exist:
 *
 *   auth-derived  takes no player id; derives the caller from `auth.uid()`
 *   guarded       accepts a player id but refuses any but `auth.uid()`
 *   pure          touches no player data at all
 *
 * `args` are real values the function will accept, because the sweep asserts
 * these *work* — an entry that quietly started failing for another reason would
 * otherwise look like proof of nothing.
 */
export type ReachableFunction = {
  name: string
  reason: 'auth-derived' | 'guarded' | 'pure'
  args: Record<string, unknown>
  /**
   * True when a well-formed call still errors for a non-privilege reason —
   * `award_attempt_xp` on a nonexistent attempt, for instance. The sweep then
   * asserts only that the failure is *not* a permission failure.
   */
  errorsOnDummyArgs?: boolean
}

const NIL_UUID = '00000000-0000-0000-0000-000000000000'

export const REACHABLE_FUNCTIONS: readonly ReachableFunction[] = [
  // — Progression entry points. All derive the player from auth.uid(). —
  { name: 'award_attempt_xp', reason: 'auth-derived', args: { p_attempt_id: NIL_UUID }, errorsOnDummyArgs: true },
  { name: 'award_reflection_xp', reason: 'auth-derived', args: { p_attempt_id: NIL_UUID }, errorsOnDummyArgs: true },
  { name: 'submit_attempt', reason: 'auth-derived', args: { p_session_id: NIL_UUID, p_scenario_id: NIL_UUID, p_choice_id: NIL_UUID, p_response_time_ms: 0 }, errorsOnDummyArgs: true },

  /*
   * Guarded: accepts a player id and refuses anyone but the caller.
   *
   * Only one function is in this class. `evaluate_achievements`,
   * `refresh_player_streak` and `achievement_day_streak` were documented as
   * belonging here after Phase 8.4, but the sweep found that 20260812000002 had
   * actually revoked all three — the documentation was wrong, not the schema.
   * They are internal, and the harness drives them through the award pipeline.
   */
  { name: 'twin_state', reason: 'guarded', args: { p_player_id: NIL_UUID } },

  // — Twin + wager entry points. —
  { name: 'twin_predict_scenario', reason: 'auth-derived', args: { p_scenario_id: NIL_UUID } },
  { name: 'insight_wallet', reason: 'auth-derived', args: {} },
  { name: 'place_wager', reason: 'auth-derived', args: { p_session_id: NIL_UUID, p_scenario_id: NIL_UUID, p_stake: 25 } },

  // — Pure: no player data. Read by the interface so rules live in one place. —
  { name: 'level_for_total_xp', reason: 'pure', args: { p_total_xp: 0 } },
  { name: 'mastery_tier_floor', reason: 'pure', args: { p_tier: 'aware' } },
  { name: 'bias_mastery_ceiling', reason: 'pure', args: { p_distinct_contexts: 1 } },
  { name: 'twin_min_total_attempts', reason: 'pure', args: {} },
  { name: 'twin_min_context_sample', reason: 'pure', args: {} },
  { name: 'twin_min_edge', reason: 'pure', args: {} },
  { name: 'twin_cooldown_attempts', reason: 'pure', args: {} },
  { name: 'insight_starting_balance', reason: 'pure', args: {} },
  { name: 'insight_recognition_award', reason: 'pure', args: {} },
  { name: 'insight_wager_tiers', reason: 'pure', args: {} },

  /*
   * `graphql` is pg_graphql's, exposed on another schema and not callable as a
   * bare RPC. It classifies as internal and refuses with PGRST202, which is the
   * correct outcome — it is listed here only to record that it was considered.
   */
] as const

/**
 * Columns of `scenario_choices` a player may read.
 *
 * Everything needed to render and answer a choice, and nothing that identifies
 * which one is right. Enumerated as an allowlist because the failure mode worth
 * catching is a *new* column: `is_trap` and `bias_id` were the tells last time,
 * and the next one will have a different name (ProjectStatus §12.4d/e).
 */
export const READABLE_CHOICE_COLUMNS: readonly string[] = [
  'id',
  'scenario_id',
  'label',
  'body',
  'sort_order',
  'created_at',
  'updated_at',
  'deleted_at',
] as const

/**
 * Tables holding one player's record. A player may read their own rows and
 * write none of them — every one is written by the award pipeline.
 *
 * `reflections` is deliberately absent: the player authors those, so an insert
 * policy exists by design.
 */
export const PLAYER_OWNED_TABLES: readonly string[] = [
  'xp_transactions',
  'progress',
  'bias_mastery',
  'player_achievements',
  'streaks',
  'statistics',
  'twin_predictions',
  'attempt_wagers',
  'attempts',
] as const

/** A permission refusal, however PostgREST chose to phrase it. */
export function isPermissionRefusal(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  // 42501 = insufficient_privilege. PGRST202 = not exposed to this role at all,
  // which is what a revoked function looks like through the schema cache.
  return error.code === '42501' || error.code === 'PGRST202'
}

/**
 * The sweep is only as good as its enumeration, so the count is asserted too.
 * A parser that silently found half the functions would report a clean sweep.
 */
export const EXPECTED_FUNCTION_COUNT_FLOOR = 38
