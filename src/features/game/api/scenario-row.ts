import { z } from 'zod'

import { DIFFICULTIES, type GameChoice, type GameScenario } from '../types'

/**
 * The scenario read: its PostgREST select, its response schema, and the mapping
 * into the domain — kept in one file because they are one contract. A column
 * added to the select without a matching field here is the bug this file
 * exists to prevent.
 *
 * ── Why the response is validated rather than asserted ──────────────────────
 * There are no generated Supabase types yet, so `supabase-js` hands back a
 * loosely-typed row. The previous mapper bridged that gap with
 * `data as unknown as RawScenario` — a promise to the compiler that nobody
 * checked at runtime. The promise turned out to be false (see `embeddedOne`),
 * the compiler had been told to stop caring, and the whole gameplay loop failed
 * silently. Parsing makes the same claim *verifiable*: if the shape is not what
 * we think, we find out at the boundary, with a message, instead of shipping
 * `undefined` into a mapper.
 */

// --- Embed cardinality ------------------------------------------------------

/**
 * A PostgREST embed that should yield at most one row.
 *
 * PostgREST decides an embed's cardinality from **constraints, not join
 * direction**: a reverse embed whose foreign key carries a UNIQUE constraint is
 * classified one-to-one and serialised as a bare object, while every other
 * reverse embed is an array. `outcomes.choice_id` is `not null unique`, so
 * `scenario_choices → outcomes` is an object — verified against the live
 * project, which accepts `order=outcomes(...)` on `scenario_choices` (legal
 * only for to-one) and rejects the same form for `scenario_choices` itself.
 *
 * Accepting both shapes is not defensive vagueness: cardinality here is a
 * property of a constraint that a future migration can flip, and this combinator
 * makes that flip a non-event. The union is declared, so the narrowing is
 * type-checked rather than cast.
 */
function embeddedOne<TSchema extends z.ZodTypeAny>(schema: TSchema) {
  return z
    .union([schema, z.array(schema)])
    .nullish()
    .transform((value): z.output<TSchema> | null => {
      if (value === null || value === undefined) return null
      return Array.isArray(value) ? (value[0] ?? null) : value
    })
}

/**
 * A PostgREST embed that should yield a list.
 *
 * The mirror of `embeddedOne`, for the same reason: adding a unique constraint
 * to `scenario_choices.scenario_id` would silently turn this array into an
 * object. Normalising both directions means no future constraint change can
 * reach the mapper.
 */
function embeddedMany<TSchema extends z.ZodTypeAny>(schema: TSchema) {
  return z
    .union([schema, z.array(schema)])
    .nullish()
    .transform((value): z.output<TSchema>[] => {
      if (value === null || value === undefined) return []
      return Array.isArray(value) ? value : [value]
    })
}

/** Nullable text column — PostgREST omits some nulls entirely. */
const nullableText = z
  .string()
  .nullish()
  .transform((value) => value ?? null)

// --- Row schemas ------------------------------------------------------------
//
// Ids are validated as non-empty strings rather than UUIDs on purpose. This
// layer guards *shape*, and a stricter format check would only invent new ways
// for a perfectly playable scenario to be rejected.

/**
 * A choice, as the player is allowed to see it before answering.
 *
 * ── What is deliberately absent ─────────────────────────────────────────────
 * `is_trap`, `bias_id` and the whole `outcomes` embed. Each of those identifies
 * the right answer, and a scenario that arrives carrying its own answer key is
 * not a question (Phase 8.6). They are not merely omitted from the select
 * string: column privileges and RLS make them unreadable, so requesting them
 * here would fail rather than quietly succeed.
 */
const choiceRowSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  body: nullableText,
  sort_order: z.number().int(),
})

const biasRowSchema = z.object({
  slug: z.string(),
  name: z.string(),
  short_description: nullableText,
  counter_strategy: nullableText,
})

const scenarioRowSchema = z.object({
  id: z.string().min(1),
  slug: z.string(),
  title: z.string(),
  context: z.string(),
  stakes: nullableText,
  difficulty: z.enum(DIFFICULTIES),
  categories: embeddedOne(z.object({ name: z.string() })),
  scenario_choices: embeddedMany(choiceRowSchema),
  scenario_biases: embeddedMany(z.object({ biases: embeddedOne(biasRowSchema) })),
  scenario_pack_items: embeddedMany(
    z.object({ scenario_packs: embeddedOne(z.object({ name: z.string() })) }),
  ),
})

type ScenarioRow = z.infer<typeof scenarioRowSchema>

/**
 * The columns and embeds `scenarioRowSchema` expects. Kept adjacent to the
 * schema so the two are edited together.
 */
export const SCENARIO_SELECT = `
  id, slug, title, context, stakes, difficulty,
  categories ( name ),
  scenario_choices ( id, label, body, sort_order ),
  scenario_biases ( biases ( slug, name, short_description, counter_strategy ) ),
  scenario_pack_items ( scenario_packs ( name ) )
`

// --- Parsing + mapping ------------------------------------------------------

/** The minimum number of answerable choices a scenario needs to be played. */
export const MIN_PLAYABLE_CHOICES = 2

export type ScenarioParse =
  | { status: 'ok'; scenario: GameScenario }
  | { status: 'malformed'; detail: string }
  | { status: 'unplayable'; detail: string }

/**
 * Validate one PostgREST row and map it into the domain.
 *
 * Returns a discriminated result rather than `null`, because "this row is not
 * the shape we expect" and "this row is fine but has too few playable choices"
 * are different defects with different fixes, and the caller has to be able to
 * tell them apart.
 */
export function parseScenarioRow(row: unknown): ScenarioParse {
  const parsed = scenarioRowSchema.safeParse(row)

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('; ')
    return { status: 'malformed', detail: issues }
  }

  const scenario = toGameScenario(parsed.data)

  if (scenario.choices.length < MIN_PLAYABLE_CHOICES) {
    return {
      status: 'unplayable',
      detail:
        `scenario "${parsed.data.slug}" returned ${scenario.choices.length} choice(s) — ` +
        `${MIN_PLAYABLE_CHOICES} are required. Whether each is answerable is now ` +
        `settled by the server on submit, so this only catches an empty scenario`,
    }
  }

  return { status: 'ok', scenario }
}

function toGameChoice(choice: ScenarioRow['scenario_choices'][number]): GameChoice {
  return {
    id: choice.id,
    label: choice.label,
    body: choice.body,
    sortOrder: choice.sort_order,
  }
}

function toGameScenario(row: ScenarioRow): GameScenario {
  const choices = row.scenario_choices
    .map(toGameChoice)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const bias = row.scenario_biases[0]?.biases ?? null

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    context: row.context,
    stakes: row.stakes,
    difficulty: row.difficulty,
    categoryName: row.categories?.name ?? null,
    packName: row.scenario_pack_items[0]?.scenario_packs?.name ?? null,
    choices,
    primaryBias: bias
      ? {
          slug: bias.slug,
          name: bias.name,
          shortDescription: bias.short_description,
          counterStrategy: bias.counter_strategy,
        }
      : null,
  }
}
