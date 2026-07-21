# MindShift — Database Schema Design

**Status:** Draft v1 · **Owner:** Data / Architecture · **Last updated:** 2026-07-21

Translates the approved [Domain Model](../architecture/DomainModel.md) into a production-ready relational design for PostgreSQL (Supabase). **Design only** — no SQL, no migrations, no Supabase code. Column types are described conceptually; exact DDL comes later.

---

## 1. Database Design Philosophy

- **Domain-derived.** Tables map 1:1 to domain entities and use the ubiquitous language verbatim.
- **Content vs. state separation.** Authored global content (biases, scenarios…) lives in read-mostly tables, publicly readable; player-owned state is row-scoped to its owner and RLS-protected.
- **Facts are append-only; rollups are derived.** `attempts` and `xp_transactions` are immutable event logs. `progress`, `bias_mastery`, `statistics` are rebuildable rollups kept for read performance.
- **Normalized core, denormalized rollups.** Normalize to 3NF for integrity; allow deliberate denormalized summary tables for hot read paths.
- **Referential integrity enforced in DB.** Foreign keys, checks, and unique constraints live in the database, not just app code.
- **RLS on every table.** No table ships without a row-security policy. Player tables scope to `auth.uid()`; content tables are read-all / write-team.
- **Stable surrogate keys.** UUID primary keys everywhere; natural keys become unique constraints, never PKs.
- **Enums via reference tables or Postgres enums** for controlled vocabularies (difficulty, notification type, xp source) — favor lookup tables where values evolve.
- **Time-zone-aware timestamps** (`timestamptz`, UTC) throughout.
- **Additive evolution.** New features attach via new tables/nullable columns; existing shapes don't break.

---

## 2. Tables

Convention: every table has `id` (UUID PK) and audit fields (§6) unless noted. FK columns named `<entity>_id`.

### Content (global, authored)

#### `categories`
- **Purpose:** thematic grouping for biases and scenarios (money, work, media…).
- **PK:** `id`.
- **Key columns:** `slug` (unique), `name`, `description`, `icon`, `sort_order`.
- **FKs:** none.
- **Relationships:** referenced by `biases`, `scenarios`.

#### `biases`
- **Purpose:** a teachable cognitive-bias concept.
- **PK:** `id`.
- **Key columns:** `slug` (unique), `name`, `short_description`, `full_explanation`, `counter_strategy`, `difficulty`, `category_id`.
- **FKs:** `category_id` → `categories.id`.
- **Relationships:** M:N with `scenarios` (via `scenario_biases`); 1:N to `bias_mastery`.

#### `scenario_packs`
- **Purpose:** curated, releasable collection of scenarios (unlocks, themed content).
- **PK:** `id`.
- **Key columns:** `slug` (unique), `name`, `description`, `cover_image`, `is_published`, `sort_order`.
- **FKs:** none.
- **Relationships:** M:N with `scenarios` (via `scenario_pack_items`).

#### `scenarios`
- **Purpose:** a single decision situation presented to the player.
- **PK:** `id`.
- **Key columns:** `slug` (unique), `title`, `context`, `stakes`, `difficulty`, `category_id`, `source` (`authored` | `ai_generated`), `status` (`draft` | `published` | `archived`), `version`.
- **FKs:** `category_id` → `categories.id`.
- **Relationships:** 1:N `scenario_choices`; M:N `biases` (via `scenario_biases`); M:N `scenario_packs` (via `scenario_pack_items`); referenced by `attempts`.

#### `scenario_choices`
- **Purpose:** one selectable option within a scenario.
- **PK:** `id`.
- **Key columns:** `scenario_id`, `label`, `body`, `is_trap` (embodies a bias), `bias_id` (nullable — the bias it represents), `sort_order`.
- **FKs:** `scenario_id` → `scenarios.id`; `bias_id` → `biases.id` (nullable).
- **Relationships:** 1:1 `outcomes`; referenced by `attempts.selected_choice_id`.

#### `outcomes`
- **Purpose:** consequence + teaching payload for a choice.
- **PK:** `id`.
- **Key columns:** `choice_id` (unique — enforces 1:1), `result_text`, `explanation`, `is_correct`, `xp_reward`.
- **FKs:** `choice_id` → `scenario_choices.id` (unique).
- **Relationships:** 1:1 with `scenario_choices`.

#### `scenario_biases` (junction)
- **Purpose:** M:N link — which biases a scenario teaches.
- **PK:** composite (`scenario_id`, `bias_id`) or surrogate `id` with unique(`scenario_id`,`bias_id`).
- **FKs:** `scenario_id` → `scenarios.id`; `bias_id` → `biases.id`.

#### `scenario_pack_items` (junction)
- **Purpose:** M:N link — scenarios within packs, ordered.
- **PK:** surrogate `id`, unique(`pack_id`,`scenario_id`).
- **Key columns:** `sort_order`.
- **FKs:** `pack_id` → `scenario_packs.id`; `scenario_id` → `scenarios.id`.

#### `achievements`
- **Purpose:** catalog of earnable milestones.
- **PK:** `id`.
- **Key columns:** `slug` (unique), `name`, `description`, `icon`, `criteria` (JSONB rule definition), `xp_reward`, `is_active`.
- **FKs:** none.
- **Relationships:** 1:N `player_achievements`.

#### `levels`
- **Purpose:** global XP→tier definitions (thresholds, unlocks).
- **PK:** `id`.
- **Key columns:** `level_number` (unique), `xp_required`, `title`, `unlocks` (JSONB).
- **FKs:** none.
- **Note:** small reference table; derived at read-time for a player, not stored per player.

### Identity & player-owned

#### `profiles`
- **Purpose:** player presentation + preferences; 1:1 extension of the auth user.
- **PK:** `id` (equals `auth.users.id` — shared PK, no separate surrogate).
- **Key columns:** `display_name`, `avatar_url`, `theme`, `locale`, `notification_prefs` (JSONB), `is_public` (leaderboard opt-in), `onboarded_at`.
- **FKs:** `id` → `auth.users.id` (Supabase Auth).
- **Relationships:** root of all player-owned rows.

#### `sessions`
- **Purpose:** a single play sitting grouping attempts.
- **PK:** `id`.
- **Key columns:** `player_id`, `started_at`, `ended_at` (nullable), `summary` (JSONB rollup), `source` (`free_play` | future modes).
- **FKs:** `player_id` → `profiles.id`.
- **Relationships:** 1:N `attempts`.

#### `attempts`
- **Purpose:** immutable record of one scenario play. The atomic fact.
- **PK:** `id`.
- **Key columns:** `player_id`, `session_id`, `scenario_id`, `selected_choice_id`, `is_correct`, `time_taken_ms`, `xp_awarded`, `played_at`.
- **FKs:** `player_id` → `profiles.id`; `session_id` → `sessions.id`; `scenario_id` → `scenarios.id`; `selected_choice_id` → `scenario_choices.id`.
- **Relationships:** 1:0..1 `reflections`; 1:N `xp_transactions`. Append-only (no updates).

#### `reflections`
- **Purpose:** player's takeaway after an attempt.
- **PK:** `id`.
- **Key columns:** `attempt_id` (unique — 1:1), `player_id`, `body`, `prompt`.
- **FKs:** `attempt_id` → `attempts.id` (unique); `player_id` → `profiles.id`.

#### `xp_transactions`
- **Purpose:** immutable ledger of XP awards.
- **PK:** `id`.
- **Key columns:** `player_id`, `amount`, `source` (`attempt` | `achievement` | `streak` | `bonus`), `source_ref_id` (nullable polymorphic ref), `awarded_at`.
- **FKs:** `player_id` → `profiles.id`. (`source_ref_id` intentionally loose — validated by app/source type.)
- **Relationships:** rolled up into `progress`.

#### `progress`
- **Purpose:** per-player running rollup (rebuildable).
- **PK:** `id` (or `player_id` as PK — 1:1 with player).
- **Key columns:** `player_id` (unique), `total_xp`, `current_level`, `scenarios_completed`, `overall_accuracy`, `last_played_at`.
- **FKs:** `player_id` → `profiles.id` (unique).

#### `bias_mastery`
- **Purpose:** per-player, per-bias proficiency signal.
- **PK:** `id`.
- **Key columns:** `player_id`, `bias_id`, `mastery_score`, `correct_count`, `attempt_count`, `distinct_contexts`, `last_seen_at`, `decays_at`.
- **FKs:** `player_id` → `profiles.id`; `bias_id` → `biases.id`. Unique(`player_id`,`bias_id`).

#### `streaks`
- **Purpose:** per-player consistency record.
- **PK:** `id` (or `player_id`).
- **Key columns:** `player_id` (unique), `current_streak`, `longest_streak`, `last_activity_date`, `grace_used`.
- **FKs:** `player_id` → `profiles.id` (unique).

#### `player_achievements` (junction)
- **Purpose:** which player earned which achievement, when.
- **PK:** surrogate `id`, unique(`player_id`,`achievement_id`).
- **Key columns:** `earned_at`, `progress_snapshot` (JSONB, optional).
- **FKs:** `player_id` → `profiles.id`; `achievement_id` → `achievements.id`.

#### `statistics`
- **Purpose:** per-player aggregated metrics for dashboards (rebuildable rollup).
- **PK:** `id` (or `player_id`).
- **Key columns:** `player_id` (unique), `metrics` (JSONB: per-category/bias breakdowns, trends), `computed_at`.
- **FKs:** `player_id` → `profiles.id` (unique).
- **Note:** can start as a materialized view; promoted to a table if write cost warrants.

#### `notifications`
- **Purpose:** nudges/messages to a player.
- **PK:** `id`.
- **Key columns:** `player_id`, `type`, `title`, `body`, `payload` (JSONB), `read_at` (nullable), `expires_at`.
- **FKs:** `player_id` → `profiles.id`.

_Tables added beyond the prompt list: `levels`, `scenario_biases`, `scenario_pack_items`, `statistics` — required by the M:N and rollup relationships in the domain model._

---

## 3. Relationships

**One-to-one**
- `profiles` ↔ `auth.users` (shared PK).
- `scenario_choices` ↔ `outcomes` (`outcomes.choice_id` unique).
- `attempts` ↔ `reflections` (`reflections.attempt_id` unique).
- `profiles` ↔ `progress` / `streaks` / `statistics` (each `player_id` unique).

**One-to-many**
- `categories` → `biases`, `scenarios`.
- `scenarios` → `scenario_choices`.
- `profiles` → `sessions` → `attempts`.
- `profiles` → `attempts`, `xp_transactions`, `bias_mastery`, `notifications`.
- `attempts` → `xp_transactions`.
- `achievements` → `player_achievements`.

**Many-to-many**
- `scenarios` ↔ `biases` via `scenario_biases`.
- `scenarios` ↔ `scenario_packs` via `scenario_pack_items`.
- `profiles` ↔ `achievements` via `player_achievements`.

---

## 4. Constraints

**Uniqueness**
- `slug` unique on `categories`, `biases`, `scenarios`, `scenario_packs`, `achievements`.
- `outcomes.choice_id`, `reflections.attempt_id` unique (enforce 1:1).
- `player_id` unique on `progress`, `streaks`, `statistics`.
- Composite unique: `scenario_biases`, `scenario_pack_items`, `bias_mastery`(player,bias), `player_achievements`(player,achievement).
- `levels.level_number` unique.

**Required (NOT NULL)**
- All FKs that define existence: `scenario_choices.scenario_id`, `outcomes.choice_id`, `attempts.player_id/scenario_id/selected_choice_id`, `xp_transactions.player_id/amount/source`, etc.
- Core content fields: names, slugs, explanations.

**Nullable (intentional)**
- `sessions.ended_at` (open session), `notifications.read_at`/`expires_at`, `scenario_choices.bias_id` (non-trap choices), `attempts.session_id` only if guest/standalone play is later allowed, `xp_transactions.source_ref_id`.

**Cascading deletes**
- Content: `scenarios` delete → cascade `scenario_choices` → cascade `outcomes`; junctions cascade. But content is **archived, not deleted** in practice (see §7), so cascades are a safety net, not a workflow.
- Player: deleting a `profile` cascades ALL player-owned rows (`sessions`, `attempts`, `reflections`, `xp_transactions`, `progress`, `bias_mastery`, `streaks`, `player_achievements`, `statistics`, `notifications`) — supports account deletion / right-to-erasure.
- FKs into content from player rows (`attempts.scenario_id`) use **RESTRICT / archive** — never let content deletion destroy player history.

**Check constraints**
- `xp` amounts and counts ≥ 0; `mastery_score` within bounds (e.g., 0–100); `difficulty` within allowed set; enums restricted to valid values.

---

## 5. Indexing Strategy

- **Primary keys:** UUID PK indexed by default.
- **All FK columns indexed** — Postgres does not auto-index FKs; required for join and cascade performance (`attempts.player_id`, `attempts.scenario_id`, `attempts.session_id`, `xp_transactions.player_id`, `bias_mastery.player_id`, `notifications.player_id`, etc.).
- **Hot query composites:**
  - `attempts(player_id, played_at desc)` — player history/timeline.
  - `xp_transactions(player_id, awarded_at desc)` — XP ledger reads.
  - `bias_mastery(player_id, bias_id)` — already unique; serves lookups.
  - `notifications(player_id, read_at)` — unread badge (partial index `WHERE read_at IS NULL`).
  - `sessions(player_id, started_at desc)`.
- **Unique-slug indexes** double as content lookup indexes.
- **Partial indexes** for filtered reads: published content `WHERE status='published'`, active achievements `WHERE is_active`.
- **JSONB GIN indexes** only where queried (e.g., `achievements.criteria`, `statistics.metrics` if filtered).
- Avoid over-indexing write-heavy append tables beyond what read paths need.

---

## 6. Audit Fields

Standard on every table:
- `created_at` — `timestamptz`, default now, not null.
- `updated_at` — `timestamptz`, maintained on update (trigger later).

Where mutable and soft-deletable:
- `deleted_at` — `timestamptz`, nullable; presence = soft-deleted.

Append-only tables (`attempts`, `xp_transactions`, `player_achievements`) carry `created_at` (or the domain timestamp: `played_at`, `awarded_at`, `earned_at`) but **no** `updated_at`/`deleted_at` — they are never modified.

Optional provenance on content: `created_by` / `updated_by` referencing the authoring user.

---

## 7. Soft Delete Strategy

**Soft delete (via `deleted_at`) — recoverable, preserves references:**
- Content: `scenarios`, `scenario_choices`, `biases`, `categories`, `scenario_packs`, `achievements`. Use `status='archived'` and/or `deleted_at` so historical `attempts` remain valid. Content is **retired, not destroyed.**
- `profiles`: soft-delete/anonymize option before hard erasure, to preserve aggregate integrity where legally allowed.
- `reflections`, `notifications`: soft delete (player may recover / audit).

**Hard delete only:**
- Full account erasure (right-to-be-forgotten) cascades and hard-deletes player-owned data intentionally.
- Junctions (`scenario_biases`, `scenario_pack_items`) — hard delete when a link is genuinely removed.

**Never deleted (append-only, immutable):**
- `attempts`, `xp_transactions`, `player_achievements` — corrected only by compensating records, removed only via full account erasure.

Rollups (`progress`, `statistics`, `bias_mastery`, `streaks`) are not soft-deleted — they're recomputable and tied 1:1 to a living player.

All read queries on soft-deletable tables filter `deleted_at IS NULL` by default.

---

## 8. UUID Strategy

- **UUID surrogate PK on every table.** Chosen over serial ints for: no enumerable IDs exposed to clients, safe merge/replication, client-side generation, and alignment with Supabase Auth UUIDs.
- **Prefer UUID v7** (time-ordered) where available — near-sequential for better index locality than random v4, without leaking identity. Fall back to v4 if v7 unsupported.
- **`profiles.id` = `auth.users.id`** — reuse the Auth-issued UUID as PK; no separate key, clean 1:1.
- Natural/business keys (`slug`, `level_number`) are **unique constraints**, never primary keys — decouples identity from mutable business values.
- Composite junctions may use a surrogate UUID PK + composite unique, for simpler FK references.
- UUIDs generated in-DB by default; client generation allowed for offline/optimistic flows.

---

## 9. Future Compatibility

Additive-only paths for planned features:

- **Story Mode:** new `storylines` and `chapters` tables sequencing existing `scenarios`; `attempts` gains nullable `chapter_id`. Core untouched.
- **Daily Challenges:** new `challenges` table (date, scenario_id/generated); `attempts.challenge_id` nullable. `streaks` already present.
- **AI Coach:** new `recommendations` / `coach_messages` tables derived from `statistics` + `bias_mastery`, surfaced through `notifications`. Read-only over existing data.
- **AI-generated scenarios:** already supported via `scenarios.source='ai_generated'` — no schema change.
- **Leaderboards:** derived from `xp_transactions`/`statistics`; `profiles.is_public` already gates opt-in. Optionally add a `leaderboard_snapshots` table for periodic ranking caches.
- **Teams / Multiplayer:** new `teams`, `team_members` tables; `attempts`/`sessions` gain nullable `team_id` or stay player-scoped with team rollups. No changes to existing columns.

Principle: every new feature is **new tables + nullable FKs**, never a change to an existing non-null shape.

---

## 10. Database Principles

Every future table must follow:

1. **UUID PK + audit fields** (`created_at`, `updated_at`; `deleted_at` only where soft-deletable).
2. **RLS enabled, no exceptions** — player tables scope to owner; content read-all, write-team.
3. **Domain-named** — table and column names match the domain model's ubiquitous language.
4. **Content vs. player-state separation** — never mix authored global data and per-player state in one table.
5. **FKs enforced and indexed** — integrity in the DB; every FK column has an index.
6. **Append-only facts stay immutable** — no `updated_at`/`deleted_at`; correct via compensating rows.
7. **Rollups are rebuildable** — derived tables must be reconstructable from source facts.
8. **Reference, don't duplicate** — link by FK; never copy canonical values.
9. **Additive evolution** — extend via new tables/nullable columns; never break existing shapes.
10. **Constraints encode invariants** — uniqueness, checks, and null rules express business rules, not just app hopes.
11. **Timestamps are `timestamptz` in UTC.**

This design is the blueprint for the migrations and RLS policies to be authored next.
