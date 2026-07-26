# MindShift — Project Status

**Read this first.** This is the handoff document for every session. It records what exists, what does not, and what must not be changed. It is implementation state, not narrative.

**Last updated:** 2026-07-26 · **After:** Phase 7.2 (Bias Mastery Engine)

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

The 6.2A–D work landed in `688acf7 feat: complete gameplay vertical slice and landing experience`. 6.2E and 7.1 are currently in the working tree.

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
    kokonutui/    migrated third-party components            ← barrel
    charts/       BKLit chart components (installed, UNUSED)
    shared/       Logo
  features/
    auth/         complete
    game/         core loop + XP awarding
    mastery/      tier ladder, helpers, meter — no calculation  ← barrel
    marketing/    landing page
    dashboard/    types + barrel only — no implementation
    profile/      types + barrel only — no implementation
  lib/
    motion/       the motion system                          ← barrel
    supabase/     client
    utils/        cn()
  routes/         TanStack file-based routing
  styles/globals.css   all design tokens + depth/lighting utilities
supabase/migrations/   15 migrations — schema + seed + XP engine + mastery engine
supabase/functions/    EMPTY — no edge functions yet
```

**Routing.** `(app)` is a pathless group with a single `beforeLoad` guard protecting every child. `(auth)` holds the unauthenticated flows. `/` is the landing page. `routeTree.gen.ts` is generated — never hand-edit it.

**Stack.** React 19 · Vite 8 · TypeScript strict · Tailwind v4 · shadcn/ui · TanStack Router · Anime.js 4 + Motion 12 · Supabase · Vercel.

---

## 3. Database status

**Complete.** 15 migrations, 20 tables, all with RLS enabled (26 policies in `20260722000004_phase4_rls_policies.sql`). The two newest migrations add progression **functions** only (§4.1, §4.3) — no table or policy has changed since Phase 4.

**Generated types are wired in.** `src/types/database.types.ts` is produced by `npx supabase gen types typescript --linked` and the browser client is `SupabaseClient<Database>`. **Regenerate after every migration** or the client's view of the schema silently goes stale.

**Tables:** `profiles` · `categories` · `biases` · `scenarios` · `scenario_choices` · `outcomes` · `scenario_biases` · `scenario_packs` · `scenario_pack_items` · `levels` · `achievements` · `sessions` · `attempts` · `reflections` · `progress` · `bias_mastery` · `xp_transactions` · `player_achievements` · `streaks` · `statistics`

**Seeded content:** 6 categories · 12 biases · 10 levels · 14 achievements · 6 scenario packs · **72 scenarios** (12 per pack) with 216 choices and outcomes, and 96 scenario→bias links. Every bias is taught by at least two scenarios — which is what makes the mastery ceiling (§4.3) reachable for all twelve. *(An earlier revision of this file said 30; that was wrong.)*

**DB functions:** `public.set_updated_at`, the seven XP-engine functions (§4.1) and the four mastery functions (§4.3). There are still **no triggers or RPCs for mastery, streaks or achievements** — those plug into the XP engine (see Section E of its migration) rather than arriving as a parallel system.

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

**Not implemented — this is the gap:**
- **Mastery decay.** `decays_at` is populated; nothing reads it. Because mastery is derived, decay must be a term in the formula, not a subtraction from the stored value — see Section E of the migration.
- **No streaks, no achievements, no statistics.** Tables exist; nothing writes them. Section E of the migration records exactly where each one plugs into `award_attempt_xp`.
- **No adaptive difficulty.** `fetchNextScenario` orders by `difficulty` then `slug` — a deterministic ramp, identical for every player, ignoring mastery. GameDesign §7 requires mastery-gated adaptation.
- **No spaced repetition.** Scenarios are excluded only within the current session; nothing resurfaces a weak bias.
- **No AI explanations.** `supabase/functions/` is empty. Only authored explanations exist. PRD requires a graceful fallback to authored copy — right now the fallback *is* the whole feature, which is acceptable for MVP but must be a conscious decision, not an oversight.

---

## 5. UI status

| Surface | State |
|---|---|
| Landing page (`/`) | **Complete** — Phase 6.2D, refined 6.2E. Four chapters, playable framing-effect teaser, cursor lens, blind-spot constellation. The hero states the product plainly (`HERO_LEAD` / `HERO_SUPPORT` in `features/marketing/constants.ts`) above the lens demonstration; chapter markers and the loop rail are lit by the accent that owns each beat's meaning. |
| Auth screens | **Complete** — login, signup, forgot password, reset password, verify email. |
| Authenticated shell | **Complete** — responsive sidebar/bottom nav, top bar, user menu, skip link, page skeleton, page error, page transition. |
| `/play` | **Functional** — full loop UI, the mastery meter (`features/mastery`) and the XP reward strip. Mastery renders above XP on the reveal, because it is the metric the player is there for. Achievement surfaces still to come. |
| `/dashboard` | **Placeholder** — greeting + "Start playing" button. No progress, no stats, no next-action logic. |
| `/profile` | **Placeholder** — avatar, name, email, "coming in a later phase". |
| `/settings` | **Placeholder** — text only. No preferences, no theme control, no data controls. |

**Theme.** Dark only. `defaultTheme="dark"`, `enableSystem={false}` in `app/providers/theme-provider.tsx`. Light-theme tokens are fully authored in `globals.css` but no UI switches to them.

**Charts.** `src/components/charts/` (BKLit) is installed and token-themed but **imported by nothing.** It exists for the future analytics/profile work. Do not delete it; do not use it on marketing surfaces.

---

## 6. Motion system

**Complete.** Fully documented in [MotionSystem.md](../architecture/MotionSystem.md) — read that file, not this section, before writing animation code.

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

1. **Zero tests.** `tests/unit`, `tests/integration`, `tests/e2e` contain only `.gitkeep`. No test runner is installed. Note that the XP math is deliberately *not* in TypeScript — it lives in SQL, so covering it needs a database harness (pgTAP or a Vitest integration suite against a local Supabase), not a unit test. CLAUDE.md mandates testing XP calculation, progress tracking, achievement logic, scenario evaluation, auth and DB policies — none of which are covered. Progression and mastery logic now exist untested. The mastery formula in particular has properties worth asserting (bounded, monotonic, order-independent); close this before achievements read mastery as input.
2. **PostgREST embed cardinality is an invisible schema coupling.** Adding or dropping a UNIQUE constraint on a foreign key silently changes an embed between an object and an array. `scenario-row.ts` is immune (`embeddedOne`/`embeddedMany` accept both), but any future query written elsewhere is not. Prefer those combinators over hand-typed embeds.
3. **35 lint warnings, 0 errors.** Almost all `react/only-export-components`, split between TanStack route files (unavoidable — a route module must export `Route`) and vendored BKLit chart code. Do not "fix" the route files. Do not let the count grow from new hand-written code.
4. **Motion tokens are duplicated** between `src/lib/motion/tokens.ts` (source of truth for JS) and `globals.css` (CSS mirror). Intentional, but they can drift. Change both together.
5. **`auth` bundle chunk is 390 kB** (107 kB gzip), the largest by far — it carries the Supabase client. Not addressed; revisit when performance work begins.
6. **No CI.** `.github/` exists but no workflow enforces typecheck/lint/build.
7. **A failed award is never retried later.** `awardAttemptXp` retries twice in-request, then gives up and hides the reward strip. The attempt row survives and the award is idempotent, so nothing is lost — but nothing reclaims it either. A reconciliation pass (award any attempt with no ledger row, on session start) is the fix.
8. **Generated types must be regenerated by hand.** `src/types/database.types.ts` is checked in and the client is typed against it, but nothing enforces that it matches the migrations. A CI step running `supabase gen types` and failing on a diff would close this.
9. **`docs/decisions/` is empty.** Architectural decisions are recorded in prose inside docs and code comments rather than as ADRs.

**Recently cleaned (do not reintroduce):** a stray literal `@/` directory and a duplicate `src/lib/utils.ts` — both created by `shadcn add` writing to an unresolved alias. After any `shadcn add`, run `git status` and check for a top-level `@/` directory.

---

## 9. Open decisions

Unresolved. Do not silently pick one — surface it.

- **XP economy.** Play XP is authored in content (`outcomes.xp_reward`: 20 correct / 5 miss) and the level ladder is seeded, so the curve is decided in practice: ~5 correct catches to level 2. The one **provisional** number is the 10 XP reflection bonus in `award_reflection_xp` — it is deliberately in exactly one place, pending a tuning pass. Achievement and streak XP are still undecided.
- **Mastery model.** *Decided in 7.2 (§4.3).* "Recognition across contexts" = distinct scenarios in which the player answered correctly, and it sets the ceiling. Growth is a product of per-encounter rates, all tunable in `bias_mastery_rate`. **Still open:** the decay rate, and the mastery→difficulty mapping that adaptive difficulty will need.
- **AI explanations at MVP.** PRD lists them in scope; nothing is built and no provider/edge-function pattern is chosen. Cost, latency and accuracy guardrails are open (PRD "Open Questions").
- **Guest play before signup.** PRD open question. The landing-page teaser is currently the entire unauthenticated play experience.
- **Streaks in MVP.** PRD scopes them out but lists retention risk; the `streaks` table exists.
- **Light theme.** Tokens are authored; shipping it is not scheduled.
- **Reflection prompts.** `reflections.prompt` is persisted but no prompt library is authored.

---

## 10. Remaining roadmap

Ordered by dependency, not by ambition.

1. **Progression & reward systems** — XP and levels ✅ (7.1), mastery ✅ (7.2). Streaks, achievements and statistics remain. *Next; see §11.*
2. **Dashboard** — real progress, next-action clarity, empty states from InteractionPrinciples §4.
3. **Profile** — mastery map, achievements trophy case, stats. First real consumer of `components/charts/`.
4. **Settings** — preferences, reduced-motion toggle, theme, data controls (export/delete).
5. **Adaptive difficulty + spaced repetition** — replaces the deterministic scenario ordering.
6. **AI explanation layer** — edge function, authored fallback, guardrails.
7. **Testing + CI** — pull earlier if progression logic lands untested.
8. **Post-MVP** (PRD phases 2–7): daily challenges, story mode, AI-generated scenarios, coach, leaderboards, monetization.

---

## 11. Exact next phase

### Phase 7.3 — Achievements & Streaks

**Goal.** Close the reward layer. Both systems plug into `award_attempt_xp` at the seams documented in Section E of the two progression migrations; neither is a new pipeline.

**Preconditions.**
1. **Apply `20260726000002_phase7_2_bias_mastery.sql`** and run the gameplay harness. Achievements read mastery as input, so mastery must be observed working first.
2. Regenerate `src/types/database.types.ts` after applying it.
3. Stand up a database test harness (§8.1) — achievement criteria are exactly the logic CLAUDE.md says must be covered.

**Scope.**
- `evaluate_achievements(player)` at the end of `award_attempt_xp`, after progress and mastery settle. The seeded `criteria` JSONB is already a small rule DSL; implement an evaluator for it rather than a switch per achievement. Transfer criteria read `bias_mastery.distinct_contexts` directly.
- Achievement XP goes through `record_xp` with source `'achievement'` and `source_ref_id` = the achievement id. No second XP path.
- `advance_streak(player, date)` — forgiving, with grace/repair per GameDesign §5. Never a guilt mechanic (InteractionPrinciples §13).
- Reward UI extends the existing reveal surfaces. Celebration is `motion-celebrate`, sequenced, dismissible, never simultaneous, never full-screen.

**Out of scope.** Dashboard, profile, analytics, settings, adaptive difficulty, mastery decay, AI.

**Done when.** An attempt unlocks a deserved achievement and advances the streak, both persist, and neither can be minted twice. Typecheck, lint and build clean.

---

## 12. Implementation decisions that must not be violated

These are settled. Changing one requires explicit user agreement, and any request that conflicts with one must be surfaced before work begins.

### Security
1. **RLS on every table, always.** No service-role key in client code, ever.
2. **Secrets are never `VITE_`-prefixed.** AI and provider keys live in edge functions only. The guard in `src/config/env.ts` exists to enforce this — do not weaken it.
3. **Progression is awarded server-side.** The client proposes; the database decides.
4. **Schema changes are migrations** in `supabase/migrations/`. Dashboard edits are never the source of truth.

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
