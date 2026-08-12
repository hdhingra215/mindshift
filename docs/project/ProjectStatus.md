# MindShift — Project Status

**Read this first.** This is the handoff document for every session. It records what exists, what does not, and what must not be changed. It is implementation state, not narrative.

**Last updated:** 2026-08-12 · **After:** Phase 8.7 (CI + privilege sweep)

> ## ✅ Verified against the live database
>
> All 25 migrations are applied to `ahychaeoxfyoqodmerud`; types regenerated. `npm run test` runs **182 passing, 0 skipped, 0 failing** — 82 unit and 100 live integration. **CI now runs all of it** (`.github/workflows/ci.yml`, §5.5).
>
> ## 🔒 Privilege defects: three phases, three shapes
>
> Same symptom every time — a `revoke` that reads correctly, runs without error, and does not take effect. Each was caught by a test that *called the thing* rather than trusting the statement (§12.4c), which is now the only acceptable evidence.
>
> | Phase | What failed | Why |
> |---|---|---|
> | 8.4 | `revoke … from public` on functions | Supabase also grants EXECUTE to `anon`/`authenticated` explicitly |
> | 8.5 | `revoke … from anon, authenticated` on functions | PostgreSQL grants EXECUTE to `PUBLIC` by default |
> | 8.6 | `revoke select (col) … from anon, authenticated` | A **table-level** `GRANT SELECT` covers every column; a column-level revoke cannot carve a hole in it |
>
> Functions: `revoke all on function … from public, anon, authenticated`, then grant back by name. Columns: `revoke select on <table>`, then `grant select (safe, columns)` by name.
>
> **Phase 8.7 ended the pattern.** The privilege sweep (§5.6) enumerates the real surface from the generated schema and fails the build on anything unclassified — and it found two more issues on its first run: `bias_mastery_rate` was executable by any signed-in caller since 7.2, and `submit_attempt` refused with SQLSTATE 42501, making a business refusal indistinguishable from a privilege one. Both fixed in `20260812000008`.
>
> ## 🔒 The privilege defect recurred in 8.5 — and the rule is now exact
>
> Phase 8.5 shipped the same class of hole a second time. `20260812000003` revoked its internal functions from `anon, authenticated` but **not from `PUBLIC`**, and PostgreSQL grants `EXECUTE TO PUBLIC` on every new function by default — so `insight_balance(other)` and `resolve_attempt_wager()` stayed callable. A follow-up migration blaming migration ordering (`…0004`) changed nothing; `…0005` fixed it by revoking from all three. **The rule is `revoke all on function … from public, anon, authenticated;` — all three, every time — and it must be proved by a test that calls the function as an ordinary player.** A revoke that runs without error is not evidence. Both times, the migration read as though it were correct.
>
> ## 🔒 A pre-existing security hole was found and closed in 8.4
>
> Supabase's default privileges grant `EXECUTE` on every new `public` function to `anon` and `authenticated`. Every migration since 7.1 ended with `revoke … from public`, which removes the implicit PUBLIC grant and **not** those explicit role grants — so every "internal" `SECURITY DEFINER` helper had been directly callable by any signed-in user, with another player's id as the argument. Verified live before the fix: `refresh_player_progress(other)` returned their XP and level, `achievement_facts(other)` their learning facts, `refresh_player_streak(other)` read *and wrote* their rollup, and `record_xp(other, 9999, …)` reached a CHECK constraint — meaning it had already passed authorization. Closed by `20260812000002`. **Any future migration adding a function must revoke from `anon, authenticated` explicitly** — see §12.31.

---

## 0. Orientation for a new session

Read in this order:

1. This file.
2. [CLAUDE.md](../../CLAUDE.md) — the constitution. Overrides everything except an explicit user instruction.
3. [docs/architecture/MotionSystem.md](../architecture/MotionSystem.md) — before touching any animation, styling or UI primitive.
4. [docs/design/DesignSystem.md](../design/DesignSystem.md) — before touching any colour, spacing or component.
5. [docs/design/InteractionPrinciples.md](../design/InteractionPrinciples.md) — before designing any interaction, copy or feedback moment.
6. Product context as needed: [PRD.md](../product/PRD.md), [GameDesign.md](../product/GameDesign.md), [ContentStrategy.md](../product/ContentStrategy.md).

**Verify before trusting.** This document goes stale. Confirm against the repo: `npm run typecheck`, `npm run lint`, `npm run build`, `git status`, `ls supabase/migrations`.

---

## 1. Completed phases

| Phase | Scope | State |
|---|---|---|
| — | Product + system architecture docs | Committed |
| — | React scaffold (Vite, TS strict, Tailwind v4, TanStack Router) | Committed |
| — | Design foundation (tokens, shadcn/ui, theme provider) | Committed |
| 1 | Layer 1 DB schema — identity + content | Committed |
| 2–4 | Layers 2/3 DB schema — gameplay, progression, RLS | Committed |
| 5 | MVP content library — biases, categories, levels, achievements, 6 packs, 30 scenarios | Committed |
| 6.1 | Authentication foundation | Committed |
| 6.2A/B | Authenticated shell — sidebar, bottom nav, top bar, user menu, page states | Committed |
| 6.2 (game) | Core gameplay loop — session, scenario, attempt, reflection, summary | Committed |
| 6.2C | Experience & Motion Foundation | Committed |
| 6.2D | Landing Page 2.0 | Committed |
| 6.2E | Landing page refinement — hero clarity, accent balance, wordmark period | **Uncommitted** |
| 7.1 | Server-authoritative XP engine — ledger, progress, session rollups, reward UI | **Uncommitted** |
| 7.1b | Scenario load fix — PostgREST one-to-one embed, validated mapper, failure classes | **Uncommitted** |
| 7.2 | Bias mastery engine — derived mastery, tier ladder, reveal meter | **Uncommitted** |
| 7.3 | Achievement engine — criteria evaluator, unlock reveal, session history | **Uncommitted** |
| 8.0 | World building — world layer, observatory dashboard | **Uncommitted** |
| 8.1 | Living streak engine — momentum, world warmth | **Uncommitted** |
| 8.2 | Mind Archive — the player's personal record at `/profile` | **Uncommitted** |
| 8.3 | Apply, verify, cover — 8.1 pushed, types regenerated, 33 live integration tests green | **Uncommitted** |
| 8.4 | Cognitive Twin — server-side prediction engine, in-play cards, Archive chamber | **Uncommitted** |
| 8.4b | Internal-function privilege fix — closed a cross-player data leak | **Uncommitted** |
| 8.5 | Blind Wagers — Insight economy, wager lifecycle, in-play panel and result | **Uncommitted** |
| 8.6 | Decision/reveal boundary — correctness is no longer client-visible or client-supplied | **Uncommitted** |
| 8.7 | CI + privilege sweep — the surface is now enumerated and enforced on every push | **Uncommitted** |

The 6.2A–D work landed in `688acf7 feat: complete gameplay vertical slice and landing experience`. 6.2E and 7.1 are currently in the working tree.

⚠ **8.2 was re-scoped by the owner.** The phase this document previously reserved as 8.2 — *Apply, verify, and cover* — became the Mind Archive; the verification moved to 8.3 and is complete.

---

## 2. Current architecture

Feature-first. Domain logic in `src/features/<name>/`, imported **only** through its `index.ts` barrel.

```
src/
  app/            App composition — providers, router, layout, error boundaries
    layout/app-layout.tsx      global canvas; mounts ambient motion layers once
  components/
    ui/           shadcn/ui primitives (radix-nova style)
    layout/       authenticated shell — sidebar, bottom nav, top bar, user menu
    motion/       15 reusable motion + lighting primitives  ← barrel
    world/        environment layer — light, lattice, camera, depth ← barrel
    kokonutui/    migrated third-party components            ← barrel
    charts/       BKLit chart components (installed, UNUSED)
    shared/       Logo
  features/
    auth/         complete
    game/         core loop + XP awarding
    mastery/      tier ladder, helpers, meter — no calculation  ← barrel
    achievements/ card, unlock reveal, history — no criteria     ← barrel
    dashboard/    the observatory — orbital mind field            ← barrel
    streaks/      momentum — no surface of its own                 ← barrel
    marketing/    landing page
    profile/      the Mind Archive + the Cognitive Twin          ← barrel
  lib/
    motion/       the motion system                          ← barrel
    supabase/     client
    utils/        cn()
  routes/         TanStack file-based routing
  styles/globals.css   all design tokens + depth/lighting utilities
supabase/migrations/   22 migrations — schema, seed, XP/mastery/achievements/streaks/twin/wagers
supabase/functions/    EMPTY — no edge functions yet, and the Twin needs none
tests/unit/            Vitest — pure client logic (51 tests)
tests/integration/     Vitest against the live project (54 tests)
```

**Routing.** `(app)` is a pathless group with a single `beforeLoad` guard protecting every child. `(auth)` holds the unauthenticated flows. `/` is the landing page. `routeTree.gen.ts` is generated — never hand-edit it.

**Stack.** React 19 · Vite 8 · TypeScript strict · Tailwind v4 · shadcn/ui · TanStack Router · Anime.js 4 + Motion 12 · Supabase · Vercel.

---

## 3. Database status

**Complete.** 22 migrations, 22 tables, all with RLS enabled. Phases 8.4 and 8.5 added the only new tables since Phase 4 — `twin_predictions` (§4.6) and `attempt_wagers` (§4.7), both select-own with deliberately no insert or update policy.

### 3.1 Applied state — confirmed live in 8.3

`supabase migration list --linked` reported 16 of 17 applied; only `20260726000004_phase8_1_streaks` was local-only. It was pushed in 8.3 and the list now shows **no local-only migrations**.

Earlier revisions of this file claimed 7.2 and 7.3 were unapplied. **That was wrong** — both had been applied long before, which the generated types already showed and the remote list confirmed. Only streaks was ever outstanding.

`src/types/database.types.ts` was regenerated after the push: 20 functions → **23**, gaining `refresh_player_streak`, `streak_state` and `streak_qualifying_days`. A 17-line addition with no removals, so nothing else in the schema moved. **Regenerate after every migration** — the harness's streak tests are the tripwire that catches a stale file.

**Generated types are wired in.** `src/types/database.types.ts` is produced by `npx supabase gen types typescript --linked` and the browser client is `SupabaseClient<Database>`. **Regenerate after every migration** or the client's view of the schema silently goes stale.

**Tables:** `profiles` · `categories` · `biases` · `scenarios` · `scenario_choices` · `outcomes` · `scenario_biases` · `scenario_packs` · `scenario_pack_items` · `levels` · `achievements` · `sessions` · `attempts` · `reflections` · `progress` · `bias_mastery` · `xp_transactions` · `player_achievements` · `streaks` · `statistics`

**Seeded content:** 6 categories · 12 biases · 10 levels · 14 achievements · 6 scenario packs · **72 scenarios** (12 per pack) with 216 choices and outcomes, and 96 scenario→bias links. Every bias is taught by at least two scenarios — which is what makes the mastery ceiling (§4.3) reachable for all twelve. *(An earlier revision of this file said 30; that was wrong.)*

**DB functions:** `public.set_updated_at`, the seven XP-engine functions (§4.1), the four mastery functions (§4.3), the nine achievement functions (§4.4) and the three streak functions (§4.5). There are still **no triggers or RPCs for mastery, streaks or achievements** — those plug into the XP engine (see Section E of its migration) rather than arriving as a parallel system.

**Not done:** no generated TypeScript types from the schema (the client hand-maps snake_case rows to camelCase domain types in `api/` layers). No local Supabase workflow documented. No migration has been verified against a live remote project in-session.

---

## 4. Gameplay status

`src/features/game/` — the loop plays end to end and **awards XP.**

**Implemented** (`api/game-service.ts`, `api/progression-service.ts`, `hooks/use-game-session.ts`):
- `getOrCreateSession` — reuses an open session, so an interrupted session or a second tab recovers rather than duplicating.
- `fetchNextScenario` — one published scenario not yet seen this session.
- `submitAttempt` — immutable attempt row.
- `saveReflection` — immutable reflection row; only written when the player actually types something.
- `finishSession` — writes lifecycle columns only; the session counters belong to the XP engine.
- `awardAttemptXp` / `awardReflectionXp` — RPC calls into the XP engine (§4.1). The client holds **zero** economy logic.
- Phases: `initializing · deciding · submitting · revealed · loadingNext · finishing · summary · empty · error`, with loading, empty and error states authored in product voice.

### 4.1 XP engine (Phase 7.1) — the single progression path

`supabase/migrations/20260726000001_phase7_1_xp_engine.sql`. Functions only — no tables, no schema change, no RLS change.

| Function | Role | Callable by |
|---|---|---|
| `level_for_total_xp(int)` | Resolves lifetime XP against the seeded `levels` ladder. The only interpretation of the curve. | `authenticated` |
| `refresh_player_progress(uuid)` | Recomputes `progress` from the ledger + attempts. Derived, never incremented. | internal |
| `refresh_session_rollups(uuid)` | Recomputes `sessions.total_attempts` / `total_xp_earned`. | internal |
| `record_xp(...)` | The **only** writer of `xp_transactions`. Appends, then refreshes progress. | internal |
| `progression_snapshot(...)` | Builds the payload every award returns. | internal |
| `award_attempt_xp(uuid)` | Awards the authored `outcomes.xp_reward`. Idempotent per attempt. | `authenticated` |
| `award_reflection_xp(uuid)` | Awards the reflection bonus (10 XP, **provisional** — §9). Requires a saved reflection. Idempotent per attempt. | `authenticated` |

Guarantees: `SECURITY DEFINER` + empty `search_path`; the player is re-derived from `auth.uid()` and never accepted from the caller; one transaction per award, so ledger + progress + session commit or roll back together; a per-player advisory lock serializes concurrent awards; every rollup is recomputed from its sources, so it self-heals rather than drifting.

### 4.2 Scenario load contract (Phase 7.1b — the "Nothing to play yet." bug)

`api/scenario-row.ts` owns the select string, a Zod schema for the response, and the mapping into the domain — one file because they are one contract.

**The bug.** `outcomes.choice_id` is `not null unique`, so PostgREST classifies `scenario_choices → outcomes` as **one-to-one** and serialises it as a bare object. The mapper read `choice.outcomes?.[0]`, got `undefined`, dropped every choice, and returned `null` — which the loader reported identically to an empty library. Verified live: PostgREST accepts `order=outcomes(...)` on `scenario_choices` (legal only for to-one) and rejects the same form for `scenario_choices` itself with `PGRST118`.

**What prevents a repeat:**
- `embeddedOne` / `embeddedMany` normalise either wire shape, so a future UNIQUE constraint change cannot reach the mapper.
- The response is *parsed*, not asserted. No `as unknown as` remains on this path.
- `fetchNextScenario` returns a discriminated `ScenarioLoad`. `exhausted` (a product state) is structurally distinct from `failed` (a defect), and `EMPTY` is reachable from exactly one of them.
- `api/load-failure.ts` classifies every defect as `queryFailed` · `permissionDenied` · `malformedData` · `unplayableData`, each with calm player copy and an engineer-facing detail logged under `[game:<kind>]`.

### 4.3 Mastery engine (Phase 7.2) — the primary progression metric

`supabase/migrations/20260726000002_phase7_2_bias_mastery.sql`. Functions only.

XP measures activity; mastery measures learning. They are separate systems and must stay separate (GameDesign §6).

| Function | Role |
|---|---|
| `bias_mastery_ceiling(int)` | Ceiling from distinct recognised contexts: `min(100, 50 + 25 × contexts)`. The anti-grind mechanism. |
| `bias_mastery_rate(...)` | What one encounter teaches. **The single tuning surface** — every coefficient lives here. |
| `refresh_bias_mastery(player, bias)` | Recomputes one row from attempt history. The single mastery calculation. |
| `refresh_attempt_mastery(player, attempt)` | Refreshes every bias the attempt's scenario teaches; returns per-bias before/after. |

**The model.** `mastery = ceiling(distinct_contexts) × (1 − Π(1 − rateᵢ))` over the player's attempts with that bias. Bounded, diminishing and rebuildable fall out of the shape rather than being enforced. Mastery is **derived, never incremented** — same contract as `progress`.

**Mastery attaches to the bias the scenario teaches** (`scenario_biases`), not to `attempts.bias_id`. That column is null when the player answers correctly; using it would have credited mastery only to players who fell for the trap.

`award_attempt_xp` and `award_reflection_xp` were replaced (not supplemented) to add the mastery step. Pipeline: attempt → XP ledger → progress → **mastery** → session rollup → snapshot. The payload gained a `mastery` array; nothing else changed.

### 4.4 Achievement engine (Phase 7.3)

`supabase/migrations/20260726000003_phase7_3_achievements.sql`. Functions only.

**No achievement is defined in code.** All fourteen were seeded in Phase 5B with a `criteria` JSONB rule DSL; this migration implements an evaluator for the thirteen rule types they use. Adding an achievement is a seed row, not a deploy.

| Function | Role |
|---|---|
| `mastery_tier_floor(text)` | Mastery tier boundaries in SQL. ⚠ **Mirrors `MASTERY_TIERS`** in `src/features/mastery/constants.ts` — change both together. |
| `achievement_facts(uuid)` | One jsonb snapshot of the parameter-free learning facts. Computed once per evaluation. |
| `achievement_criteria_met(...)` | The only place the DSL is interpreted. Coalesces to **false**, so malformed criteria fail closed. |
| `achievement_difficulty_clears` · `achievement_active_days` · `achievement_day_streak` · `achievement_calibrated_outcomes` · `achievement_recovery_run` | One parameterised question each. |
| `evaluate_achievements(uuid)` | Unlocks everything newly earned; awards XP through `record_xp`. |

**Idempotency and anti-cheat.** Criteria are derived from history, so re-evaluation on unchanged history unlocks nothing. Double-unlock is impossible at two layers: the `player_achievements` unique constraint, and `on conflict do nothing … returning` which is also how "newly unlocked" is detected — so XP is granted exactly once even under a concurrent double-submit. `player_achievements` has no client write policy.

Pipeline: attempt → XP → progress → mastery → **achievements** → progress (refreshed again, since an unlock may have added XP) → session rollup → snapshot. Evaluated on both award paths, because writing a reflection can itself be the earning act.

⚠ `achievement_day_streak` is the **only** definition of a day streak in the product. When streaks land (7.4), `advance_streak` must call it rather than compute its own.

### 4.5 Streak engine (Phase 8.1) — momentum

`supabase/migrations/20260726000004_phase8_1_streaks.sql`. Functions only.

| Function | Role |
|---|---|
| `streak_qualifying_days(uuid)` | **The only definition of a counting day**: ≥2 decisions, or ≥1 reflection. |
| `streak_state(uuid, boolean)` | Gaps-and-islands over those days → current run, longest run, grace spent, whether today counts. **The single day-run implementation.** |
| `refresh_player_streak(uuid)` | Recomputes `streaks` and returns the client snapshot. Grace is hard-wired on. |

`achievement_day_streak` was **replaced with a thin delegation** to `streak_state`, honouring the warning left in the 7.3 migration. There is now exactly one answer to "how long is this run", read by both the streak surface and the Steady Mind achievement.

⚠ Deliberate behaviour change: Steady Mind now counts *qualifying* days rather than any day with a single attempt. Strictly harder, strictly more honest, and it cannot regress anyone — `player_achievements` is append-only.

Run length is a **span**, not a count, so a forgiven day stays inside the run it belongs to. `current_streak <= longest_streak` holds by construction rather than by clamping.

Pipeline is now complete: attempt → XP → progress → mastery → achievements → **streak** → snapshot. Refreshed on both award paths, because a reflection alone can make a day count.

**Not implemented — this is the gap:**
- **Player timezone.** Days are bucketed in UTC, so a player far from UTC has a day boundary that is not their own midnight. The fix is a timezone on `profiles` plus one `at time zone` change; the rest of the engine only compares dates.
- **Mastery decay.** `decays_at` is populated; nothing reads it. Because mastery is derived, decay must be a term in the formula, not a subtraction from the stored value — see Section E of the migration.
- **No statistics.** The `statistics` table exists; nothing writes it. Section E of the migration records exactly where each one plugs into `award_attempt_xp`.
- **No adaptive difficulty.** `fetchNextScenario` orders by `difficulty` then `slug` — a deterministic ramp, identical for every player, ignoring mastery. GameDesign §7 requires mastery-gated adaptation.
- **No spaced repetition.** Scenarios are excluded only within the current session; nothing resurfaces a weak bias.
- **No AI explanations.** `supabase/functions/` is empty. Only authored explanations exist. PRD requires a graceful fallback to authored copy — right now the fallback *is* the whole feature, which is acceptable for MVP but must be a conscious decision, not an oversight.

### 4.6 Cognitive Twin (Phase 8.4)

`supabase/migrations/20260812000001_phase8_4_cognitive_twin.sql`. One table plus functions.

**What it is.** A model of how the player actually decides, built from their own recorded decisions. It makes exactly one kind of claim: *"in situations like this one, you have historically caught the trap / missed it."* That is a statement about a record, and the record is stored to back it. It never describes a personality and never diagnoses.

**Why the inference is in SQL.** Same reason as the economy: a prediction computed in the browser could be recomputed after the fact to always look right, and the player's whole history would have to be shipped to the client to do it. The client holds **no** thresholds, scoring or eligibility logic.

**Two context axes, both already in the content.** `pack` (topical — Money & Spending, At Work…) and `category` (bias family — Decision & Framing…). ⚠ **No per-choice framing taxonomy exists.** The original brief's example copy ("you'll choose the safer-framed option", "loss-framed options when money is involved") would need a `frame` label on all 216 seeded choices. That was **not** invented — the Twin predicts on the axis the data supports: catch versus miss, within a real context.

**Why "caught" is `outcomes.is_correct`.** Not `scenario_choices.is_trap`: thirteen seeded scenarios carry two trap choices and one carries two correct ones, so trap and correct are not complements and only one of them is a clean binary. `is_correct` is also what XP, accuracy and mastery already use.

| Function | Role |
|---|---|
| `twin_min_total_attempts` · `twin_min_context_sample` · `twin_min_edge` · `twin_cooldown_attempts` | The four thresholds, as functions so every caller *and the tests* read one value. 12 / 5 / 0.68 / 3. |
| `twin_attempt_facts(player)` | Every decision projected onto both axes. The single source of evidence. |
| `twin_patterns(player)` | Contexts lopsided enough to be a pattern, strongest first. Reports strength in **both** directions — reliably resisting a trap is as real a finding as falling for one. |
| `twin_predict_scenario(scenario)` | Mints a prediction, or returns a named refusal (`insufficient_history` · `cooldown` · `no_pattern`). Player from `auth.uid()`. |
| `resolve_twin_prediction(player, attempt)` | Grades an open prediction. Internal — called inside the award transaction so resolution cannot be skipped. |
| `twin_state(player)` | The Archive's view. Guards on `auth.uid()`. |

**Honesty is structural, not a flag.** Below the evidence floor `twin_state` returns `sealed` with **no patterns key at all**, so the interface cannot leak a claim the thresholds refused to make. Three states: `sealed` (too little history) · `watching` (enough history, nothing lopsided) · `observing` (has patterns).

**Cadence.** Deliberately not every scenario. A prediction requires ≥12 total decisions, ≥5 in the scenario's own context, an edge ≥0.68, and ≥3 decisions since the last prediction. Fully deterministic — no randomness, which is what makes the cadence testable. Asking twice for the same scenario returns the prediction already on record rather than minting a second: a refresh must not let a player reroll until the Twin says something flattering.

**Integrity.** The prediction row is written *before* the player decides and resolved *after*, inside `award_attempt_xp`. `twin_predictions` has a select-own policy and no insert/update policy, and a CHECK constraint keeps the four resolution columns moving together. Accuracy over time is meaningful precisely because the Twin cannot revise what it said once it has seen the answer.

**Pipeline is now:** attempt → XP → progress → mastery → achievements → streak → **twin** → session rollup → snapshot. The payload gained a `twin` key. `award_reflection_xp` is untouched — a reflection is not a decision, so it cannot resolve a prediction about one.

**No AI API was introduced.** Deterministic templating over typed server facts produces the shipping copy. `TwinPattern.narration` is the declared, always-null boundary for a future narration layer, and `describePattern` renders the deterministic sentence whenever it is absent — the Twin can never depend on a model to be able to speak, and no shipped copy is model-authored.

---

### 4.7 Blind Wagers (Phase 8.5)

`20260812000003` (table + functions), `…0004` and `…0005` (privileges — see the banner). One table, seven functions, `award_attempt_xp` replaced to add the resolution step.

**The mechanic.** Two decisions before the outcome: *what do I think is right*, and *how much do I trust that*. Confidence already existed as a reflection slider that costs nothing, so it measures a feeling; a wager measures a commitment. Both are kept — `confidence_before` is untouched — which gives two distinct signals: **calibration** (stated confidence vs correctness) and **conviction** (stake size vs correctness).

**Insight is not XP, and that is the load-bearing decision.** XP is lifetime and monotonic and `current_level` is derived from it, so a losing wager that subtracted XP could *de-level* a player — punishing a wrong answer, which §12.20 forbids. Insight is its own quantity: earned by play, spent only on conviction, never convertible, **no real-world value**, cannot be purchased, transferred or withdrawn.

| Number | Value | Why |
|---|---|---|
| Starting balance | 50 | One maximum-conviction wager, or several careful ones |
| Stakes | 10 / 25 / 50 | Three is enough for hunch / confident / certain |
| Recognition award | 5 per correct decision | Earned whether or not wagered — **this is the recovery path** |
| Payout | ±stake (even money) | See below |

**Why even money.** Symmetric payout is the rule under which staking big is optimal exactly when you are genuinely more likely than not to be right — it rewards *calibration*, not nerve. A 2× payout would reward reckless betting; a rake would tax participation.

**Balance is derived, never stored.** `starting + recognition × (correct decisions) + Σ delta over resolved wagers`. No ledger table needed — every term is already recorded, so it self-heals like `progress` and `streaks`. Because a stake can never exceed the balance at lock time and the only negative term is bounded by that stake, **a negative balance is unreachable by construction**, enforced again by a CHECK constraint.

**Zero balance is a designed state, not a wall.** No stake is offered, the scenario plays exactly as before, and every correct answer rebuilds the reserve by 5. No stipend, no hand-out, no pressure copy.

**Lifecycle** — read from the row, same shape as `twin_predictions`: absent = *unwagered* · present with `attempt_id` null = *locked* · otherwise *resolved*.

⚠ **Keyed on (session, scenario), not on the attempt.** An `attempts` row already carries the chosen answer, so a wager keyed on `attempt_id` could only be created after the outcome was settled. Keying on session+scenario means the row provably exists before the attempt does.

| Function | Role |
|---|---|
| `insight_starting_balance` · `insight_recognition_award` · `insight_wager_tiers` | The economy's constants. Pure; read by the client and the tests so nothing is hardcoded twice. |
| `insight_balance(player)` | Derived balance. **Internal.** |
| `insight_wallet()` | Balance + affordable tiers. Player from `auth.uid()`. |
| `place_wager(session, scenario, stake)` | Validates tier, ownership and affordability server-side; takes a per-player advisory lock so two tabs cannot overdraw. Re-entrant: returns the locked wager rather than replacing it. |
| `resolve_attempt_wager(player, attempt)` | Grades from the authored outcome. **Internal** — called inside the award transaction so resolution cannot be skipped. |

**Pipeline** is now: attempt → **wager** → XP → progress → mastery → achievements → streak → twin → session rollup → snapshot. The wager settles first because it is the last part of the *decision* rather than part of the reward; it has no dependency in either direction, so the position is a readability choice. The payload gained `wager` and `insight_balance`.

**Twin independence.** The Twin's prediction is visible before the player stakes but is never wired into the wager — no defaulting, no nudging, no shared state. After resolution the wager result renders above the Twin verdict: the player's own commitment settles before the model's opinion of it.

**Analytics groundwork only.** `attempt_wagers` stores stake, `balance_before`, correctness and delta per scenario, which is enough for future work on wager accuracy, accuracy by stake size, and confidence-vs-conviction. **No Archive or analytics UI was built** — that is a later phase, and the existing sample-size discipline (§4.6) applies when it lands.

---

### 4.8 The decision/reveal boundary (Phase 8.6)

`20260812000006` (policy + RPC), `…0007` (column grants — see the banner).

**The defect.** `fetchNextScenario` shipped the answer key with the question. Five tells: `outcomes.is_correct`, `outcomes.xp_reward` (20 vs 5), `outcomes.result_text`, `outcomes.explanation`, `scenario_choices.is_trap`, and `scenario_choices.bias_id` (non-null only on trap choices). All six readable **directly** — trimming the select string would have fixed nothing. The Phase 4 RLS migration says so in its own comment: the gate was deferred to "the attempt/content edge layer", which had never been built.

Harmless until Phase 8.5 put Insight on the line. A scripted client could then win every wager, making the conviction measurement meaningless.

**Three changes, in order of importance.**

1. **Attempts can no longer be inserted directly.** `attempts_insert_own` is dropped. This was the real hole: the client supplied `outcome_id`, so it could record a *trap* choice against the *correct* outcome and collect the XP, mastery credit and wager payout for an answer it did not give. `submit_attempt(session, scenario, choice, response_time)` now derives the outcome from the choice server-side and returns the reveal in the same round trip.
2. **Outcomes became a reveal.** `outcomes_read_authenticated` → `outcomes_read_after_attempt`: readable only for a scenario this player has already attempted. Scoped to the scenario rather than the single chosen choice, so a future "here's what the other options would have done" needs no policy change.
3. **Column grants on `scenario_choices`.** Table-level SELECT revoked, then granted back for `id, scenario_id, label, body, sort_order` and the timestamps. `is_trap` and `bias_id` are withheld — and so is anything added to that table in future, which is the right default for a table that holds the answer.

**`submit_attempt` also closes two adjacent holes.** It rejects a choice belonging to a different scenario (which would otherwise sail past mastery, since mastery reads the scenario and XP reads the outcome), and it rejects submitting into someone else's session. It is idempotent per session+scenario: a resubmission returns the recorded decision rather than writing a second, so attempts stay immutable (§12.9) and a double-submit cannot overwrite an answer.

**The award pipeline is unchanged.** `attempt → wager → XP → progress → mastery → achievements → streak → twin → rollup` runs exactly as before, now from an attempt row that is trustworthy.

**Client contract.** `GameChoice` lost `outcome`, `isTrap` and `biasId` — it is now just an answerable option. `AttemptRecord` gained `outcome`, which is the first moment the player is entitled to it. `OutcomeReveal` reads `attempt.outcome`; the UI is otherwise untouched.

⚠ **The harness now reads the answer key as service role.** `loadScenarioForPlay` and the twin's `loadPack` take the admin client, because a fixture that must answer wrongly *on purpose* has to know which choice does that. Every assertion still runs through the player's client, and the blindness of the player path is itself asserted in `reveal.test.ts`.

---

---

## 5. UI status

| Surface | State |
|---|---|
| Landing page (`/`) | **Complete** — Phase 6.2D, refined 6.2E. Four chapters, playable framing-effect teaser, cursor lens, blind-spot constellation. The hero states the product plainly (`HERO_LEAD` / `HERO_SUPPORT` in `features/marketing/constants.ts`) above the lens demonstration; chapter markers and the loop rail are lit by the accent that owns each beat's meaning. |
| Auth screens | **Complete** — login, signup, forgot password, reset password, verify email. |
| Authenticated shell | **Complete** — responsive sidebar/bottom nav, top bar, user menu, skip link, page skeleton, page error, page transition. |
| `/play` | **Functional** — full loop UI, mastery meter, XP strip, the achievement unlock reveal, a session-end achievement history, the Cognitive Twin's occasional prediction + verdict (§5.3), and the Blind Wager panel + result (§5.4). |
| `/dashboard` | **The observatory** — one hero object: a lit core with the twelve biases in orbit, where **distance from the core is mastery**. Etched instrument readouts, collected achievement marks, one primary action. Momentum warms the key light and deepens the core's breath — the streak has no card of its own. Read-only against progression; geometry in `features/dashboard/lib/orbit.ts`. |
| `/profile` | **The Mind Archive** — the player's personal record. Masthead plus five numbered plates: the observatory embedded, evidence of decisions, the full discovery catalogue, reflections as written, and the **live** Cognitive Twin chamber. Read-only. See §5.1 and §5.3. |
| `/settings` | **Placeholder** — text only. No preferences, no theme control, no data controls. |

Primary nav labels `/profile` as **Archive** (`nav-items.ts`, `user-menu.tsx`). The path stays `/profile` — renaming a route is a redirect problem, not a naming one.

### 5.1 Mind Archive (Phase 8.2)

`src/features/profile/`. The empty barrel became the implementation; no new feature was created.

**What it is.** The place the evidence of a player's thinking is kept — deliberately *not* a profile page. No avatar block, no editable fields, no account furniture; those belong to `/settings`. Structure, top to bottom: `00` masthead · `01` Mind Observatory · `02` evidence of decisions · `03` discoveries · `04` reflections · `05` Cognitive Twin. The order moves from the system's account of the player to the player's own.

**It reuses rather than re-derives.**
- `fetchObservatoryScene` and `MindObservatory` are imported from the dashboard barrel (newly exported for this). The archive's mastery plate *is* the dashboard's instrument, seen up close — one read, one geometry, two vantage points. A second set of near-identical queries would have produced two pictures of mastery that could disagree.
- Accuracy, XP, level, mastery, achievements and momentum are read from the server-owned tables and never recomputed.
- Momentum is declared through the existing `useWorldWarmth`, so the world does not cool between the dashboard and the archive.
- `InstrumentFrame` gained one optional prop, `legendAs`, so a frame can be a `<dt>` inside a description list. Appearance unchanged.

**The one thing it derives** is `lib/evidence.ts` — median deliberation, reflection rate, per-difficulty clears, calibration, family standings, tier distribution. All descriptive, none of it feeds back into the game, and it is the only tested client logic in the feature. Accuracy is deliberately *absent* from `summariseDecisions`: `progress.overall_accuracy` is the server's number and the only one shown.

**Calibration** pairs `reflections.confidence_before` with the outcome of the same attempt. Below `MIN_CALIBRATION_SAMPLE` (5) it reports `insufficient` rather than a direction, and the copy states the gap as a fact about two numbers ("85% sure, right 60% of the time — confidence ran ahead"), never as a claim about the person.

**Cognitive Twin — not implemented, and honestly so.** `CognitiveTwinSlot` is a one-variant discriminated union and `TwinChamber` renders a sealed, visibly-empty housing with a true count of the material on file. `ArchiveRecord` is the input contract the twin will read. Building it means a new slot variant plus a renderer — not new plumbing, and **never a client-side inference**. No fabricated analysis exists anywhere on this surface; the chamber says it is not running rather than guessing.

**Reads** (`api/archive-service.ts`): the observatory scene, `profiles.created_at`, up to `DECISION_WINDOW` = 400 recent attempts (with `outcomes.is_correct` and `scenarios.difficulty`), 12 recent reflections plus an exact count, the active achievement catalogue, and the player's unlocks. Only the observatory and the decision/catalogue reads are hard failures; the rest degrade to the empty state the screen already draws for a new player. When the 400 cap bites, `decisionsTruncated` is set and the copy narrows to "your most recent N decisions" — an archive that silently changes its own scope is lying.

**Cost.** No new animation loop. The observatory brings the same two Anime.js timelines it already runs on the dashboard; every other entrance is a scroll-held `RevealContainer` on the shared Motion path, and the depth planes read the camera variables `WorldCanvas` already publishes. One read on mount, no polling, no realtime subscription — same contract as `useObservatory`.

**Empty states are the design, not a fallback.** A brand-new player sees the full room: twelve biases at the rim, an evidence plate that explains what will be recorded, all fourteen discoveries listed as unfound, an invitation to write the first reflection, and the same sealed twin chamber. Nothing reads as missing data.

**Theme.** Dark only. `defaultTheme="dark"`, `enableSystem={false}` in `app/providers/theme-provider.tsx`. Light-theme tokens are fully authored in `globals.css` but no UI switches to them.

**Charts.** `src/components/charts/` (BKLit) is installed and token-themed but **imported by nothing.** It exists for the future analytics/profile work. Do not delete it; do not use it on marketing surfaces.

### 5.3 The Twin's two surfaces (Phase 8.4)

Both live in `features/profile` and are exported through its barrel; `/play` imports them. The Twin is the Archive's inhabitant even when it speaks during a game.

**In play** — `TwinPredictionCard` above the scenario, `TwinVerdictCard` under the outcome reveal and above the reward.

- The prediction is fetched **after** the scenario renders and is never awaited. It speaks on a minority of scenarios, so blocking a decision on a round trip that usually returns "nothing to say" would be paying for silence. A late arrival is dropped by a scenario-id guard in the reducer.
- Two lines only. More would be coaching, which would both spoil the scenario and corrupt the Twin's own evidence — a prediction that changes the decision it predicts is worthless as a measurement. The card states explicitly *"I'm reading your record, not this scenario"*, without which a player could reasonably infer the Twin has seen the answer.
- **A miss is not an error state.** Hit and miss get the same housing, weight and space. A hit is etched in `info` (the token documented for AI coaching); a miss in `brand`, the colour reserved for genuine milestones — a player who broke their own pattern did the thing the game exists to teach. Nothing is red and nothing apologises. Which happened is carried by the eyebrow text, so it survives colour removal.

**In the Archive** — `TwinChamber` on plate 05, with three faces matching the three states. Every pattern ships its sample size in the same breath as the claim, never behind a tooltip: *"In Money & Spending you've caught 2 of 9"* is an argument the player can weigh, where a confidence bar is one they must take on faith. Accuracy withholds a percentage below `MIN_ACCURACY_SAMPLE` (4) and shows the raw tally instead — "100% accurate" off one prediction is true and completely misleading.

`lib/twin.ts` is the whole copy layer, pure and tested. Four rules every line follows: evidence never diagnosis; prediction never certainty; silence is a real answer; a miss is a good moment. The unit suite asserts the negatives directly — no trait language, no certainty words, no rebuke in the miss copy.

---

### 5.4 The wager's two surfaces (Phase 8.5)

`features/game/components/wager-panel.tsx` and `wager-result.tsx`. Both internal to the game feature — the wager is a decision mechanic, not a record, so no new feature was created.

**The panel**, under the scenario, enabled only once an answer is selected. An instrument the player commits against: *"locking in a decision"*, never *"placing a bet"*. There is no randomness in the mechanic and there is none in the styling — no chips, no odds, no glow on the largest stake, nothing that rewards the act of staking over the judgement behind it.

- **Both outcomes are always shown before the lock.** Selecting a stake states where the balance lands if right *and* if wrong. Hiding the downside of a commitment is the dark pattern this would otherwise become.
- **The whole explanation is inline**, one caption, no modal and no tour: what Insight is, that it has no real-world value, what happens either way, and that a correct answer always earns some back.
- **Accessibility.** A real `radiogroup` of real buttons — arrow keys and tab both work. Selection is carried by `aria-checked`, a border weight *and* a check mark; never by colour. The projected consequence is a polite live region so it is heard while moving between stakes. The lock is a `<button>`. The empty-reserve state is stated in words.

**The result**, above the Twin verdict. A win reads in `success`, a shortfall in `warning` — deliberately **not** `error`: nothing went wrong, the player learned their confidence outran their judgement, which is the most useful thing the mechanic teaches. Red would frame a lesson as a failure. Which happened is in the eyebrow text, so it survives colour removal, and the signed movement is always spelled out.

One animation: the reserve counts from before to after. Time-driven, so Anime.js owns it, routed through the reduced-motion gate — under reduced motion the final number is simply present. It is a value moving, not a payout.

`lib/wager.ts` holds the whole client rule set, pure and tested. Its unit suite asserts the negatives: no scolding vocabulary in the losing copy, no gambling vocabulary in either, and a projected balance that can never go negative.

---

### 5.5 CI (Phase 8.7)

`.github/workflows/ci.yml`. Runs on every push to any branch and every pull request.

| Job | Runs | Gate |
|---|---|---|
| `static` | typecheck · lint · build · `npm run test:unit` | Always, forks included — no secrets needed |
| `integration` | `npm run test:integration` (live harness + privilege sweep) | Skipped on forked PRs, which cannot see secrets by design |

**Secrets** (repository secrets, never in the repo): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. `live-env.ts` reads `process.env` before `.env.local`, so nothing is written to disk.

**Two guards keep the live job honest.** The suites deliberately skip themselves when the project is unreachable — right for a developer with a paused project, and a silent lie in CI. So on `main`: missing secrets fail the job outright, and a JSON-reporter audit fails the build if *any* live test skipped or if zero executed. Verified by pointing the harness at an unreachable host: 0 passed, 100 skipped, guard fires.

Unit and integration are separate jobs rather than one `npm run test`, because a self-skipping suite inside a passing job is exactly the failure mode this workflow exists to prevent.

### 5.6 The privilege sweep (Phase 8.7)

`tests/integration/privilege-sweep.test.ts` + `support/surface.ts`. Ten tests, all as an ordinary signed-in player.

**It enumerates rather than lists.** The surface is derived from `database.types.ts` — every function with its argument names, every column of `scenario_choices`. A hand-maintained checklist protects what someone remembered; three phases proved that is not enough.

| Check | What fails the build |
|---|---|
| Classification gate | A function exists that is neither declared reachable nor internal |
| Internal refusal | Any internal function executes for an authenticated player |
| Reachability | A declared-reachable function has become permission-denied |
| Guarded functions | One answers for another player's id |
| Column allowlist | Any `scenario_choices` column outside the allowlist is readable |
| Answer exposure | Any outcome is readable before the player has attempted |
| Cross-player reads | Any of 9 player-owned tables returns another player's rows |
| Direct writes | Any of those tables accepts a direct insert |
| Cross-player writes | Any update touches another player's rows |

**Reachable functions are classified by *why* they are safe** — `auth-derived` (no player id, derived from `auth.uid()`), `guarded` (takes one, refuses any other), or `pure` (no player data). There is no fourth reason. Each entry carries real arguments and is asserted to *work*, so an entry that quietly broke would not sit there proving nothing.

⚠ **The sweep asserts its own enumeration.** The first parser silently found 23 of 40 functions and reported a clean sweep over the subset it happened to see. `EXPECTED_FUNCTION_COUNT_FLOOR` and a duplicate check now guard against that — under-enumeration is the worst possible bug in a sweep.

**Two findings on the first run**, both fixed in `20260812000008`:
- `bias_mastery_rate` executable by any signed-in caller since Phase 7.2. No player data, but it is the mastery model's tuning surface and every coefficient was probeable.
- `submit_attempt` raised SQLSTATE `42501` for "this session is not yours" — a business refusal wearing a privilege code, which would let a sweep read a *reachable* function as locked down. Application refusals now raise `P0001`.

It also corrected a documentation error: `evaluate_achievements`, `refresh_player_streak` and `achievement_day_streak` were recorded as reachable-and-guarded after Phase 8.4, but that migration had actually revoked all three. The schema was right; the docs were wrong.

---

---

## 6. Motion system

**Complete.** Fully documented in [MotionSystem.md](../architecture/MotionSystem.md) — read that file, not this section, before writing animation code.

Extended in Phase 8.0 by the **world layer** (`src/components/world/`), which composes it and never re-implements it: `WorldCanvas` (one key light, a light-revealed lattice, a viewport vignette, and the camera), `DepthPlane`, `InstrumentFrame`.

The camera is the load-bearing idea: `WorldCanvas` holds **one** pointer subscription and publishes `--world-parallax-x/y` plus `--world-drift-x/y`; every `.world-plane` reads them in CSS with its own depth multiplier. N parallax layers therefore cost one rAF callback and zero React renders. The observatory's orbit works the same way — one Anime.js animation drives `--orbit-turn` (registered via `@property`) and twelve nodes derive their transforms from it in CSS.

The single rule that must not erode:

> Time-driven motion → **Anime.js**. Scroll-, viewport- or gesture-driven motion → **Motion**. Never implement the same effect in both. No third animation library.

- `src/lib/motion/` — tokens, reduced-motion gate, Anime.js adapter, Motion adapter, shared cursor engine (one rAF loop for all cursor effects), React lifecycle hooks.
- `src/components/motion/` — 15 primitives (buttons, reveals, text, lighting, parallax, page transition).
- `src/styles/globals.css` — depth (`depth-*`) and lighting (`glow-*`, `sheen-top`, `glass`, `spotlight`) utilities.
- Ambient layers (`FloatingBackground`, `MouseFollower`) are mounted **once** in `app/layout/app-layout.tsx`. Never mount them per page.

Reduced motion is enforced in two layers — CSS for declarative animation, `lib/motion/reduced-motion.ts` for scripted animation. Both are required; neither is sufficient alone.

---

## 7. Authentication status

**Complete** (`src/features/auth/`). Supabase Auth, email + password.

- Sign up (with email verification), sign in, sign out, password reset request, password update, resend verification.
- Session persistence and rehydration via `AuthProvider`; status is `loading | authenticated | unauthenticated`.
- Route guards `requireAuth` / `redirectIfAuthenticated` are injected through the router context so `beforeLoad` reads a resolved session synchronously.
- Zod validation schemas, human error mapping (`lib/auth-errors.ts`) in product voice — no raw Supabase codes surface to the player.
- `src/config/env.ts` validates client env on load and **refuses to start** if a `VITE_`-prefixed variable matches `SERVICE_ROLE|SECRET`.

**Not done:** no OAuth providers, no account deletion or data export (PRD requires these before launch), no profile row bootstrapping verified against a live project, no session-expiry UX beyond the guard redirect.

---

## 8. Technical debt

Ordered by how much it will cost to leave.

1. **Three phases of progression SQL have never run.** 7.1 (XP) is deployed and verified live; **7.2 (mastery) and 7.3 (achievements) are authored but unapplied** — no Docker for a local Postgres, and pushing to the live project is the owner's call. Apply them, regenerate types, and run the gameplay harness before building on top. Everything client-side is verified; the SQL is not.
2. **No CI, and no e2e.** 105 tests pass and nothing runs them automatically, so they protect only the developer who remembers to type `npm run test`. This is now the single highest-value piece of work left — the 8.4 security fix in particular is the kind of thing a regression would silently undo. `tests/e2e` is still empty. Pair with debt #7.
3. **PostgREST embed cardinality is an invisible schema coupling.** Adding or dropping a UNIQUE constraint on a foreign key silently changes an embed between an object and an array. `scenario-row.ts` is immune (`embeddedOne`/`embeddedMany` accept both), but any future query written elsewhere is not. Prefer those combinators over hand-typed embeds.
4. **33 lint warnings, 0 errors.** Almost all `react/only-export-components`, split between TanStack route files (unavoidable — a route module must export `Route`) and vendored BKLit chart code. Do not "fix" the route files. Do not let the count grow from new hand-written code — 8.2 added none.
5. **Two deliberate duplications, both documented in place.** Motion tokens (`src/lib/motion/tokens.ts` ↔ `globals.css`) and the mastery tier ladder (`src/features/mastery/constants.ts` ↔ `public.mastery_tier_floor`). Both are intentional — the alternative is a round trip per rendered meter — and both can drift. Change each pair together.
6. **`auth` bundle chunk is 390 kB** (107 kB gzip), the largest by far — it carries the Supabase client. Not addressed; revisit when performance work begins.
7. **No CI.** `.github/` exists but no workflow enforces typecheck/lint/build.
8. **A failed award is never retried later.** `awardAttemptXp` retries twice in-request, then gives up and hides the reward strip. The attempt row survives and the award is idempotent, so nothing is lost — but nothing reclaims it either. A reconciliation pass (award any attempt with no ledger row, on session start) is the fix.
9. **Generated types must be regenerated by hand.** `src/types/database.types.ts` is checked in and the client is typed against it, but nothing enforces that it matches the migrations. A CI step running `supabase gen types` and failing on a diff would close this.
10. **Achievement XP is absent from session XP.** `refresh_session_rollups` traces ledger rows to a session through an attempt, and an achievement is not attached to one. Total XP is correct; the session strip understates. Linking them is a schema change and was deliberately not made.
11. **The Twin has no per-choice framing axis.** Predictions are catch-vs-miss within a pack or bias family. Predicting *which kind of option* a player picks ("the loss-framed one") needs a `frame` label on all 216 seeded choices — a content-authoring job, deliberately not faked in 8.4. Until then the Twin cannot make framing claims, and the copy must not imply it can.
12. **Twin predictions and wagers accumulate without bound.** `twin_predictions` has no retention policy. Harmless at MVP scale; revisit alongside the decision-window rollup (#13).
13. **`docs/decisions/` is empty.** Architectural decisions are recorded in prose inside docs and code comments rather than as ADRs.
14. **The archive's decision window is a client-side cap, not pagination.** `DECISION_WINDOW = 400` in `api/archive-service.ts` bounds the pattern summaries. It is honest (`decisionsTruncated` drives the copy) but it is still 400 rows over the wire for a heavy player. The real fix is a server-side rollup — which is what `refresh_player_statistics` was always going to be, so fold it in there rather than paginating the client.
15. **Achievement XP is invisible to the session strip — now measured.** A first correct answer unlocks *First Insight* (50 XP) and *Caught in the Act* (75 XP), so a 20 XP attempt produces a 145 XP total across three ledger rows. `progress.total_xp` is correct; `sessions.total_xp_earned` shows 20, because `refresh_session_rollups` reaches the ledger through an attempt and an achievement has none (debt #10). Both behaviours are now asserted, so the gap cannot widen silently.
16. **No profile bootstrap trigger.** There is no trigger on `auth.users`; `profiles` rows are created client-side by `ensureProfile` on sign-in. Every progression table FKs to `profiles`, so a player whose bootstrap silently failed cannot record an attempt at all. The harness exercises the same upsert path, so a broken `profiles_insert_own` policy would now surface — but a trigger would be strictly more robust than a swallowed client retry.

**Recently cleaned (do not reintroduce):** a stray literal `@/` directory and a duplicate `src/lib/utils.ts` — both created by `shadcn add` writing to an unresolved alias. After any `shadcn add`, run `git status` and check for a top-level `@/` directory.

---

## 9. Open decisions

Unresolved. Do not silently pick one — surface it.

- **XP economy.** Play XP is authored in content (`outcomes.xp_reward`: 20 correct / 5 miss) and the level ladder is seeded, so the curve is decided in practice: ~5 correct catches to level 2. The one **provisional** number is the 10 XP reflection bonus in `award_reflection_xp` — it is deliberately in exactly one place, pending a tuning pass. Achievement and streak XP are still undecided.
- **Mastery model.** *Decided in 7.2 (§4.3).* "Recognition across contexts" = distinct scenarios in which the player answered correctly, and it sets the ceiling. Growth is a product of per-encounter rates, all tunable in `bias_mastery_rate`. **Still open:** the decay rate, and the mastery→difficulty mapping that adaptive difficulty will need.
- **AI explanations at MVP.** PRD lists them in scope; nothing is built and no provider/edge-function pattern is chosen. Cost, latency and accuracy guardrails are open (PRD "Open Questions").
- **Guest play before signup.** PRD open question. The landing-page teaser is currently the entire unauthenticated play experience.
- **Streaks in MVP.** *Resolved in 8.1.* Shipped as **momentum** — no counter, no badge, no calendar. A day counts on ≥2 decisions or ≥1 reflection; grace is always on; the run warms the world rather than appearing as a number. **Still open:** whether the qualifying bar (2 decisions) is right, and player timezone.
- **Light theme.** Tokens are authored; shipping it is not scheduled.
- **Reflection prompts.** `reflections.prompt` is persisted but no prompt library is authored.
- **Whether BKLit charts ship at all.** The Mind Archive was the surface they were installed for, and 8.2 did not use them: the archive's readings are etched instrument lines and hairline tracks, which fit the world layer where a charting library would have imported a second visual language. `src/components/charts/` is therefore still dead weight in the tree (~7 files, imported by nothing). Either a future analytics surface justifies it or it gets deleted — do not resolve this by retrofitting charts into the archive.
- **The Cognitive Twin's source of truth.** `ArchiveRecord` is its input contract, but nothing is decided about *where the inference runs*. It must not be a client-side derivation (that would make the archive assert something nothing computed). Edge function versus a stored, server-computed analysis is open, and it shares the unresolved provider/guardrail questions with AI explanations above.

---

## 10. Remaining roadmap

Ordered by dependency, not by ambition.

1. **Progression & reward systems** — XP and levels ✅ (7.1), mastery ✅ (7.2), achievements ✅ (7.3), streaks ✅ (8.1). Only `statistics` remains unwritten.
2. **Dashboard** ✅ (8.0) — the observatory.
3. **Profile / Mind Archive** ✅ (8.2) — mastery, evidence, discoveries, reflections, twin slot. Note it did **not** consume `components/charts/`: BKLit is still imported by nothing, because the archive's readings are etched instrument lines rather than charts. That remains a deliberate open question, not an oversight.
4. **Settings** — preferences, reduced-motion toggle, theme, data controls (export/delete).
5. **Adaptive difficulty + spaced repetition** — replaces the deterministic scenario ordering.
6. **AI explanation layer** — edge function, authored fallback, guardrails.
7. **Testing + CI** — pull earlier if progression logic lands untested.
8. **Post-MVP** (PRD phases 2–7): daily challenges, story mode, AI-generated scenarios, coach, leaderboards, monetization.

---

## 11. Exact next phase

**8.3 is done.** Every progression system runs correctly on the live database, the Archive reads true numbers from it, and the RLS boundary holds. The product is verified end to end for the first time.

**`refresh_player_statistics` was deliberately not written.** The Archive does not need it — every number it shows comes from `progress`, `bias_mastery`, `player_achievements`, `streaks` or its own descriptive summaries. Writing it now would be an analytics rollup nothing consumes. Revisit only when the 400-row decision window (§8.12) actually hurts.

### Phase 8.8 — Archive surfaces for wager and Twin

**8.7 is done.** CI runs typecheck, lint, build, 82 unit and 100 live tests on every push, and the privilege sweep enumerates the surface so the defect class that shipped three times cannot ship a fourth time silently.

Next is the first phase in a while that is purely product. Two systems are collecting data nothing reads:

- **Wager conviction.** `attempt_wagers` holds stake, `balance_before`, correctness and delta per scenario — enough for accuracy by stake size, and for the confidence-vs-conviction comparison the Archive was designed around (§4.7). The sample-size discipline of §4.6 applies: no claim below the floor.
- **Twin narration.** `TwinPattern.narration` is the declared, always-null boundary for a language layer (§4.6). It would be the first genuine use of an edge function, and the open decision in §9 — *where the inference runs* — has to be settled first. It must not be a client-side derivation.

**Then.** `frame` labels on choices (debt #11) · Settings · adaptive difficulty · e2e coverage (debt #2).

**Out of scope.** Sound/game feel, Phase 9.

**Before starting.** Run `npm run test`. If the sweep fails on something you added, classify it — that is the sweep working.

---

## 12. Implementation decisions that must not be violated

These are settled. Changing one requires explicit user agreement, and any request that conflicts with one must be surfaced before work begins.

### Security
1. **RLS on every table, always.** No service-role key in client code, ever.
2. **Secrets are never `VITE_`-prefixed.** AI and provider keys live in edge functions only. The guard in `src/config/env.ts` exists to enforce this — do not weaken it.
3. **Progression is awarded server-side.** The client proposes; the database decides.
4. **Schema changes are migrations** in `supabase/migrations/`. Dashboard edits are never the source of truth.
4b. **Every new function must `revoke all on function … from public, anon, authenticated`** unless a signed-in player genuinely needs to call it. **All three roles.** There are two independent grants: PostgreSQL's default `EXECUTE TO PUBLIC`, and Supabase's default explicit grant to `anon` and `authenticated`. Removing either alone leaves the function reachable — that is how the same defect shipped in both 8.4 and 8.5. A reachable function must derive the player from `auth.uid()` or guard on it internally; never both accept a player id and trust the caller.
4c. **Prove it with a test.** A `revoke` that runs without error is not evidence. The privilege sweep (§5.6) does this automatically — **any new function or `scenario_choices` column fails the build until it is classified in `tests/integration/support/surface.ts`.** Do not weaken the sweep to make it pass; classify the item, or revoke it.
4f. **Never raise a privilege SQLSTATE for a business refusal.** `42501` and `PGRST202` mean "this role may not do that". An application saying no raises `P0001`. Reusing a privilege code makes a reachable function look locked down and blinds the sweep (Phase 8.7).
4d. **To withhold a column: `revoke select on <table>`, then `grant select (safe, columns)` by name.** A bare column-level revoke is a no-op against Supabase's table-wide `grant select`. Withholding by default is also the right shape — a column added later is hidden until someone grants it deliberately.
4e. **Correctness is never client-supplied and never client-visible before the decision.** Scenario loads carry no outcome, no `is_trap` and no `bias_id`; attempts are recorded only through `submit_attempt`, which derives the outcome from the chosen choice. Any new content column that identifies the right answer must be withheld the same way (§12.4d).

### Architecture
5. **Feature-first.** Import a feature only through its `index.ts` barrel.
6. **Never create a parallel system.** Extend what exists. This applies especially to the motion system, the game feature and the token layer.
7. **`routeTree.gen.ts` is generated.** Never hand-edit.
8. **`(app)` is guarded once** in its layout route. Do not add per-route auth guards.
9. **Attempts and reflections are immutable.** Insert only; never update a recorded decision.

### Design
10. **Deep black canvas, five accents, one role each** — purple brand, orange reward, yellow warning, blue success, red error, violet info. Never use an accent outside its semantic role.
11. **`--primary` (`#7C3AED`) is for fills; `--brand` (`#8B5CF6`) is for glow, rings and graphics.** They are different values because white-on-`#8B5CF6` fails WCAG AA at body size. Do not collapse them.
12. **Components read semantic tokens. Zero raw hex, zero magic numbers.**
13. **Glow is a depth cue, not decoration.** On black, light is the primary elevation signal — but a screen with many glowing elements has no focal point.
14. **One primary action per screen.**

### Motion
15. **Anime.js for time-driven, Motion for scroll/viewport/gesture. No third library, no duplicated effect.**
16. **Every scripted animation routes through the reduced-motion gate.** CSS alone is not sufficient — a media query cannot stop a timeline.
17. **Motion never carries meaning alone.** Remove all animation and the interface must still tell the whole story.
18. **Every animation reverts on unmount.** A timeline that outlives its element is a leak.
19. **Ambient layers mount once,** in `app-layout.tsx`.

### Product & interaction
20. **A wrong answer is a discovery, never a verdict.** No "Incorrect", no penalty, no lives, no blocking. A miss still earns XP.
21. **Feedback names the reasoning, never the person's intelligence.**
22. **No dark patterns.** No confetti, no fake urgency, no streak guilt, no manipulative notifications, no engagement bait. This is non-negotiable and is a brand value, not a style preference.
23. **Never colour-only, never motion-only, never hover-only** for anything that carries meaning.
24. **WCAG 2.1 AA minimum.** Keyboard operable, visible focus, ≥44px touch targets, semantic HTML.
25. **No bare spinners and no dead "No data".** Skeletons and on-brand thinking copy; every empty state teaches and points forward.
26. **One voice everywhere** — the sharp, witty mentor. Same voice in an error as in an achievement.

### Process
27. **Surface conflicts with CLAUDE.md before proceeding** — do not quietly resolve them.
28. **Update the docs that a change invalidates.** DesignSystem.md, MotionSystem.md and this file are treated as source of truth; a stale source of truth is worse than none.
29. **Conventional Commits, small and focused.** Never commit secrets.
30. **`npm run typecheck && npm run lint && npm run build` must pass before a phase is called done.** Zero TypeScript errors, zero lint errors.
