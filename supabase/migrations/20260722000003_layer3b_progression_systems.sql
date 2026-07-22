-- ============================================================================
-- MindShift — Layer 3B: Player Progression Systems
-- ============================================================================
-- Per-player learning signals and rollups layered on the Layer 3A economy.
-- Derived from docs/architecture/DomainModel.md, docs/database/DatabaseSchema.md,
-- docs/database/RLSStrategy.md, docs/product/GameDesign.md, and CLAUDE.md.
--
-- Scope (this migration ONLY):
--   bias_mastery, streaks, player_achievements, statistics
--
-- Conventions (consistent with Layers 1–3A):
--   * UUID primary keys.
--   * Player-owned rows carry player_id and cascade on account erasure.
--   * FKs into global content (biases/achievements) use RESTRICT — content is
--     archived, never destroyed, so player history/rollups stay valid.
--   * RLS is ENABLED on every table. Policies are authored in a later phase.
--   * NO triggers, NO business logic, NO Edge Functions here. Mutable rollups
--     carry an application-maintained updated_at (no trigger, per constraints).
--
-- Table nature:
--   * bias_mastery, streaks, statistics — rebuildable rollups (mutable):
--     created_at + updated_at, no deleted_at.
--   * player_achievements — append-only fact (immutable once unlocked):
--     created_at only, no updated_at/deleted_at. Removed only via erasure.
-- ============================================================================

-- ============================================================================
-- bias_mastery — per-player, per-bias proficiency signal (rebuildable rollup)
-- ============================================================================
-- Mastery rises with correct recognition across varied contexts and decays
-- gently if untouched (GameDesign.md §Mastery). distinct_contexts + decays_at
-- back the "recognition across many contexts" and spaced-review mechanics.
create table public.bias_mastery (
  id                uuid          primary key default gen_random_uuid(),
  player_id         uuid          not null references public.profiles (id) on delete cascade,
  bias_id           uuid          not null references public.biases (id)   on delete restrict,
  -- 0–100 proficiency; the true measure of learning (not raw XP).
  mastery_level     numeric(5, 2) not null default 0 check (mastery_level between 0 and 100),
  total_attempts    integer       not null default 0 check (total_attempts >= 0),
  correct_attempts  integer       not null default 0 check (correct_attempts >= 0),
  -- Distinct scenario contexts in which the player recognized this bias.
  distinct_contexts integer       not null default 0 check (distinct_contexts >= 0),
  last_practiced_at timestamptz,
  -- When mastery is scheduled to decay next / becomes due for review.
  decays_at         timestamptz,
  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now(),
  -- Correct attempts can never exceed total attempts.
  constraint bias_mastery_correct_lte_total_ck check (correct_attempts <= total_attempts),
  -- One mastery row per player per bias.
  constraint bias_mastery_player_bias_uk unique (player_id, bias_id)
);

-- FK index (the composite unique serves player-first lookups; index bias_id).
create index bias_mastery_bias_id_idx on public.bias_mastery (bias_id);

-- Spaced-review read path: a player's biases due for review, soonest first.
create index bias_mastery_review_due_idx
  on public.bias_mastery (player_id, decays_at)
  where decays_at is not null;

-- ============================================================================
-- streaks — per-player consistency record (rebuildable rollup, 1:1 player)
-- ============================================================================
-- Encouraging, never punishing (GameDesign.md §Streaks): grace_used supports
-- forgiving missed days without a guilt mechanic.
create table public.streaks (
  id                 uuid        primary key default gen_random_uuid(),
  player_id          uuid        not null unique references public.profiles (id) on delete cascade,
  current_streak     integer     not null default 0 check (current_streak >= 0),
  longest_streak     integer     not null default 0 check (longest_streak >= 0),
  last_activity_date date,
  -- Grace/repair days consumed in the current window (forgiving mechanic).
  grace_used         integer     not null default 0 check (grace_used >= 0),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- Current streak can never exceed the longest ever recorded.
  constraint streaks_current_lte_longest_ck check (current_streak <= longest_streak)
);

-- player_id is UNIQUE (index created implicitly) — serves the 1:1 lookup.

-- ============================================================================
-- player_achievements — junction: which player earned which achievement
-- ============================================================================
-- Append-only fact: immutable once unlocked. No updated_at/deleted_at.
create table public.player_achievements (
  id                uuid        primary key default gen_random_uuid(),
  player_id         uuid        not null references public.profiles (id)     on delete cascade,
  achievement_id    uuid        not null references public.achievements (id) on delete restrict,
  unlocked_at       timestamptz not null default now(),
  -- Optional snapshot of the state that satisfied the criteria (audit/replay).
  progress_snapshot jsonb       not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  -- An achievement is earned at most once per player.
  constraint player_achievements_player_achievement_uk unique (player_id, achievement_id)
);

-- FK index (the composite unique serves player-first lookups; index achievement_id).
create index player_achievements_achievement_id_idx on public.player_achievements (achievement_id);

-- ============================================================================
-- statistics — denormalized per-player dashboard metrics (rebuildable rollup)
-- ============================================================================
-- Fast dashboard reads; fully reconstructable from sessions/attempts/reflections.
create table public.statistics (
  id                       uuid        primary key default gen_random_uuid(),
  player_id                uuid        not null unique references public.profiles (id) on delete cascade,
  total_sessions           integer     not null default 0 check (total_sessions >= 0),
  total_attempts           integer     not null default 0 check (total_attempts >= 0),
  total_play_time_ms       bigint      not null default 0 check (total_play_time_ms >= 0),
  average_response_time_ms integer     not null default 0 check (average_response_time_ms >= 0),
  total_reflections        integer     not null default 0 check (total_reflections >= 0),
  -- Extensible breakdowns/trends (per-category, per-bias, time series).
  metrics                  jsonb       not null default '{}'::jsonb,
  last_played_at           timestamptz,
  -- When this rollup was last recomputed.
  computed_at              timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- player_id is UNIQUE (index created implicitly) — serves the 1:1 lookup.

-- ============================================================================
-- Enable Row Level Security on every table (policies added in a later phase).
-- With RLS enabled and no policies, all access is denied by default —
-- secure-by-default, exactly the intended posture.
-- ============================================================================
alter table public.bias_mastery        enable row level security;
alter table public.streaks             enable row level security;
alter table public.player_achievements enable row level security;
alter table public.statistics          enable row level security;
