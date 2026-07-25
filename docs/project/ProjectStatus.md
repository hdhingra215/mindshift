# MindShift — Project Status

**Read this first.** This is the handoff document for every session. It records what exists, what does not, and what must not be changed. It is implementation state, not narrative.

**Last updated:** 2026-07-25 · **After:** Phase 6.2D (Landing Page 2.0)

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
| 6.2A/B | Authenticated shell — sidebar, bottom nav, top bar, user menu, page states | **Uncommitted** |
| 6.2 (game) | Core gameplay loop — session, scenario, attempt, reflection, summary | **Uncommitted** |
| 6.2C | Experience & Motion Foundation | **Uncommitted** |
| 6.2D | Landing Page 2.0 | **Uncommitted** |

### ⚠️ The working tree is large and uncommitted

`git log` ends at `8f984c3 feat: implement authentication foundation`. Everything from the authenticated shell onward — gameplay, motion system, landing page — exists only in the working tree.

**First action of the next session: propose committing this work in logical slices** (shell → gameplay → motion foundation → landing page). Do not start new feature work on top of an uncommitted mountain.

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
    game/         core loop, no progression
    marketing/    landing page
    dashboard/    types + barrel only — no implementation
    profile/      types + barrel only — no implementation
  lib/
    motion/       the motion system                          ← barrel
    supabase/     client
    utils/        cn()
  routes/         TanStack file-based routing
  styles/globals.css   all design tokens + depth/lighting utilities
supabase/migrations/   13 migrations, schema + seed
supabase/functions/    EMPTY — no edge functions yet
```

**Routing.** `(app)` is a pathless group with a single `beforeLoad` guard protecting every child. `(auth)` holds the unauthenticated flows. `/` is the landing page. `routeTree.gen.ts` is generated — never hand-edit it.

**Stack.** React 19 · Vite 8 · TypeScript strict · Tailwind v4 · shadcn/ui · TanStack Router · Anime.js 4 + Motion 12 · Supabase · Vercel.

---

## 3. Database status

**Complete and committed.** 13 migrations, 20 tables, all with RLS enabled (26 policies in `20260722000004_phase4_rls_policies.sql`).

**Tables:** `profiles` · `categories` · `biases` · `scenarios` · `scenario_choices` · `outcomes` · `scenario_biases` · `scenario_packs` · `scenario_pack_items` · `levels` · `achievements` · `sessions` · `attempts` · `reflections` · `progress` · `bias_mastery` · `xp_transactions` · `player_achievements` · `streaks` · `statistics`

**Seeded content:** 6 categories · 12 biases · 10 levels · achievements · 6 scenario packs · 30 scenarios (5 per pack) with choices and outcomes.

**Only DB function:** `public.set_updated_at`. There are **no triggers or RPCs for XP, mastery, levelling, streaks or achievements.** That logic does not exist anywhere yet — not in SQL, not in the client.

**Not done:** no generated TypeScript types from the schema (the client hand-maps snake_case rows to camelCase domain types in `api/` layers). No local Supabase workflow documented. No migration has been verified against a live remote project in-session.

---

## 4. Gameplay status

`src/features/game/` — the loop plays end to end, but **awards nothing.**

**Implemented** (`api/game-service.ts`, `hooks/use-game-session.ts`):
- `getOrCreateSession` — reuses an open session, so an interrupted session or a second tab recovers rather than duplicating.
- `fetchNextScenario` — one published scenario not yet seen this session.
- `submitAttempt` — immutable attempt row.
- `saveReflection` — immutable reflection row; only written when the player actually types something.
- `finishSession`.
- Phases: `initializing · deciding · submitting · revealed · loadingNext · finishing · summary · empty · error`, with loading, empty and error states authored in product voice.

**Not implemented — this is the gap:**
- **XP is never awarded.** `outcomes.xp_reward` is seeded and read into the domain type, but nothing writes `xp_transactions` or `progress`.
- **No mastery tracking.** `bias_mastery` is never written.
- **No levelling.** `levels` is seeded; nothing computes or displays a level.
- **No streaks, no achievements, no statistics.** Tables exist; nothing writes them.
- **No adaptive difficulty.** `fetchNextScenario` orders by `difficulty` then `slug` — a deterministic ramp, identical for every player, ignoring mastery. GameDesign §7 requires mastery-gated adaptation.
- **No spaced repetition.** Scenarios are excluded only within the current session; nothing resurfaces a weak bias.
- **No AI explanations.** `supabase/functions/` is empty. Only authored explanations exist. PRD requires a graceful fallback to authored copy — right now the fallback *is* the whole feature, which is acceptable for MVP but must be a conscious decision, not an oversight.

---

## 5. UI status

| Surface | State |
|---|---|
| Landing page (`/`) | **Complete** — Phase 6.2D. Four chapters, playable framing-effect teaser, cursor lens, blind-spot constellation. |
| Auth screens | **Complete** — login, signup, forgot password, reset password, verify email. |
| Authenticated shell | **Complete** — responsive sidebar/bottom nav, top bar, user menu, skip link, page skeleton, page error, page transition. |
| `/play` | **Functional** — full loop UI. Will need reward surfaces once progression exists. |
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

1. **Everything since auth is uncommitted.** Highest risk item in the repo. See §1.
2. **Zero tests.** `tests/unit`, `tests/integration`, `tests/e2e` contain only `.gitkeep`. No test runner is installed. CLAUDE.md mandates testing XP calculation, progress tracking, achievement logic, scenario evaluation, auth and DB policies — none of which are covered. This debt compounds the moment progression logic is written, so install Vitest **before** Phase 7, not after.
3. **No generated Supabase types.** Every `api/` layer hand-maps raw rows and casts through `as unknown as RawX`. A schema change fails silently at runtime instead of at compile time.
4. **38 lint warnings, 0 errors.** Almost all `react/only-export-components`, split between TanStack route files (unavoidable — a route module must export `Route`) and vendored BKLit chart code. Do not "fix" the route files. Do not let the count grow from new hand-written code.
5. **Motion tokens are duplicated** between `src/lib/motion/tokens.ts` (source of truth for JS) and `globals.css` (CSS mirror). Intentional, but they can drift. Change both together.
6. **`auth` bundle chunk is 390 kB** (107 kB gzip), the largest by far — it carries the Supabase client. Not addressed; revisit when performance work begins.
7. **No CI.** `.github/` exists but no workflow enforces typecheck/lint/build.
8. **`docs/decisions/` is empty.** Architectural decisions are recorded in prose inside docs and code comments rather than as ADRs.

**Recently cleaned (do not reintroduce):** a stray literal `@/` directory and a duplicate `src/lib/utils.ts` — both created by `shadcn add` writing to an unresolved alias. After any `shadcn add`, run `git status` and check for a top-level `@/` directory.

---

## 9. Open decisions

Unresolved. Do not silently pick one — surface it.

- **XP economy.** No numbers exist. Levels.md deliberately defers thresholds to "economy tuning". Required before Phase 7 can be finished.
- **Mastery model.** Decay rate, what counts as "recognition across contexts", and the mastery→difficulty mapping are all unspecified.
- **AI explanations at MVP.** PRD lists them in scope; nothing is built and no provider/edge-function pattern is chosen. Cost, latency and accuracy guardrails are open (PRD "Open Questions").
- **Guest play before signup.** PRD open question. The landing-page teaser is currently the entire unauthenticated play experience.
- **Streaks in MVP.** PRD scopes them out but lists retention risk; the `streaks` table exists.
- **Light theme.** Tokens are authored; shipping it is not scheduled.
- **Reflection prompts.** `reflections.prompt` is persisted but no prompt library is authored.

---

## 10. Remaining roadmap

Ordered by dependency, not by ambition.

1. **Progression & reward systems** — XP, levels, mastery, streaks, achievements, statistics. *Next; see §11.*
2. **Dashboard** — real progress, next-action clarity, empty states from InteractionPrinciples §4.
3. **Profile** — mastery map, achievements trophy case, stats. First real consumer of `components/charts/`.
4. **Settings** — preferences, reduced-motion toggle, theme, data controls (export/delete).
5. **Adaptive difficulty + spaced repetition** — replaces the deterministic scenario ordering.
6. **AI explanation layer** — edge function, authored fallback, guardrails.
7. **Testing + CI** — pull earlier if progression logic lands untested.
8. **Post-MVP** (PRD phases 2–7): daily challenges, story mode, AI-generated scenarios, coach, leaderboards, monetization.

---

## 11. Exact next phase

### Phase 7 — Progression & Reward Systems

*(Numbering is inferred; 6.2x was the UI/experience track. Confirm the label with the user.)*

**Goal.** Make the loop reward learning. The player finishes a scenario and something durable happens — XP recorded, mastery moved, level and streak updated, achievements evaluated. This is the single largest gap between the current build and the MVP defined in the PRD.

**Preconditions.**
1. Commit the existing working tree in logical slices (§1).
2. Get the XP economy numbers decided (§9) — or state explicit provisional values and flag them as tuning placeholders.
3. Install Vitest and cover the progression math as it is written (§8.2).

**Scope.**
- **Server-side awarding.** Write progression in a Postgres function invoked on attempt submission, not in the client. The client must never be the authority on XP — RLS protects rows, but only server logic can protect the *rules*. This is a security boundary, not a preference.
- `xp_transactions` — append-only ledger; XP is derived, never a mutable counter.
- `progress` — total XP, current level, derived from the ledger.
- `bias_mastery` — per-bias rating updated on each attempt; decay deferred to a later pass but the column shape must support it.
- `streaks` — advance on a day with meaningful reps; forgiving, with grace/repair per GameDesign §5.
- `player_achievements` — evaluate seeded criteria after each attempt.
- `statistics` — aggregate rollup.
- **Extend `src/features/game/`** — do not create a parallel `progression` feature. The reward is part of the loop.
- **Reward UI**, using existing primitives only: `countTo` for XP, `ParticleButtonWrapper` for the reward beat, `RevealContainer` for the reveal. Celebration is `motion-celebrate`, sequenced, dismissible, never simultaneous, never full-screen (InteractionPrinciples §7, §13).
- **Tests** for XP calculation, level thresholds, mastery updates and achievement criteria.

**Out of scope.** Adaptive difficulty, spaced repetition, dashboard, profile, AI. Do not expand.

**Done when.** A player completes a scenario, sees a proportionate reward, and the XP, mastery, streak and achievement state persist correctly and are visible on return. Typecheck, lint and build clean. Progression math covered by tests.

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
