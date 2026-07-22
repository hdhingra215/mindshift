-- ============================================================================
-- MindShift — Layer 2: Gameplay Schema
-- ============================================================================
-- Records the act of play. Derived from docs/architecture/DomainModel.md,
-- docs/database/DatabaseSchema.md, docs/database/RLSStrategy.md, and the
-- Project Constitution (CLAUDE.md).
--
-- Scope (this migration ONLY):
--   sessions, attempts, reflections
--
-- Conventions (consistent with Layer 1):
--   * UUID primary keys.
--   * Player-owned rows carry player_id and cascade on account erasure.
--   * FKs into global content (scenarios/choices/outcomes/biases) use RESTRICT:
--     content is archived, never destroyed, so player history stays valid.
--   * RLS is ENABLED on every table. Policies are authored in a later phase.
--
-- Append-only architecture:
--   * attempts and reflections are immutable historical facts: they carry
--     created_at (+ a domain timestamp) but NO updated_at / deleted_at.
--   * Immutability is enforced later via RLS (no player UPDATE/DELETE). Per the
--     Layer 2 constraints there are NO triggers and NO business logic here.
--   * sessions is a mutable rollup (opens, accumulates, closes); its updated_at
--     is application-maintained (no trigger, per Layer 2 constraints).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums (stable controlled vocabularies)
-- ----------------------------------------------------------------------------
-- Play mode that produced a session. Free play ships first; future modes
-- (story, daily challenge, multiplayer) extend this enum without schema change.
create type public.session_source as enum ('free_play');

-- ============================================================================
-- sessions — one play sitting, groups many attempts
-- ============================================================================
create table public.sessions (
  id               uuid primary key default gen_random_uuid(),
  player_id        uuid                  not null references public.profiles (id) on delete cascade,
  source           public.session_source not null default 'free_play',
  started_at       timestamptz           not null default now(),
  ended_at         timestamptz,
  completed        boolean               not null default false,
  total_attempts   integer               not null default 0 check (total_attempts >= 0),
  total_xp_earned  integer               not null default 0 check (total_xp_earned >= 0),
  summary          jsonb                 not null default '{}'::jsonb,
  created_at       timestamptz           not null default now(),
  updated_at       timestamptz           not null default now(),
  -- A session cannot end before it began; open sessions have a null ended_at.
  constraint sessions_ended_after_started check (ended_at is null or ended_at >= started_at)
);

-- Player session history, newest first.
create index sessions_player_started_idx on public.sessions (player_id, started_at desc);

-- Hot path: find a player's currently-open session.
create index sessions_open_idx
  on public.sessions (player_id)
  where ended_at is null;

-- ============================================================================
-- attempts — immutable record of one scenario play (the atomic fact)
-- ============================================================================
-- Append-only: no updated_at / deleted_at. Corrections are compensating
-- records; removal only via account erasure (cascade from profiles/sessions).
create table public.attempts (
  id                 uuid primary key default gen_random_uuid(),
  session_id         uuid        not null references public.sessions (id)         on delete cascade,
  player_id          uuid        not null references public.profiles (id)         on delete cascade,
  scenario_id        uuid        not null references public.scenarios (id)        on delete restrict,
  selected_choice_id uuid        not null references public.scenario_choices (id) on delete restrict,
  outcome_id         uuid        not null references public.outcomes (id)         on delete restrict,
  -- The bias the selected choice embodied, if any (non-trap choices have none).
  bias_id            uuid        references public.biases (id)                    on delete restrict,
  response_time_ms   integer     not null check (response_time_ms >= 0),
  hints_used         integer     not null default 0 check (hints_used >= 0),
  -- Whether the player reflected as part of this play. Set at insert time to
  -- keep the row immutable; the canonical record of a reflection is a row in
  -- reflections (attempt_id unique).
  reflected          boolean     not null default false,
  completed_at       timestamptz not null default now(),
  created_at         timestamptz not null default now()
);

-- All FK columns indexed (Postgres does not auto-index FKs).
create index attempts_session_id_idx on public.attempts (session_id);
create index attempts_scenario_id_idx on public.attempts (scenario_id);
create index attempts_selected_choice_id_idx on public.attempts (selected_choice_id);
create index attempts_outcome_id_idx on public.attempts (outcome_id);
create index attempts_bias_id_idx on public.attempts (bias_id);

-- Hot path: player history / timeline, newest first.
create index attempts_player_completed_idx on public.attempts (player_id, completed_at desc);

-- ============================================================================
-- reflections — player's takeaway after an attempt (1:1 with attempt)
-- ============================================================================
-- Immutable once created (per Layer 2 spec): no updated_at / deleted_at.
create table public.reflections (
  id                uuid        primary key default gen_random_uuid(),
  attempt_id        uuid        not null unique references public.attempts (id) on delete cascade,
  player_id         uuid        not null references public.profiles (id)        on delete cascade,
  reflection_text   text        not null check (length(btrim(reflection_text)) > 0),
  -- Optional prompt the player was reflecting against (coaching / guided flow).
  prompt            text,
  -- Self-rated confidence 0–100, before and after seeing the outcome.
  confidence_before smallint    check (confidence_before between 0 and 100),
  confidence_after  smallint    check (confidence_after between 0 and 100),
  created_at        timestamptz not null default now()
);

-- attempt_id already indexed by its UNIQUE constraint; index the other FK.
create index reflections_player_id_idx on public.reflections (player_id);

-- ============================================================================
-- Enable Row Level Security on every table (policies added in a later phase).
-- With RLS enabled and no policies, all access is denied by default —
-- secure-by-default, exactly the intended posture.
-- ============================================================================
alter table public.sessions    enable row level security;
alter table public.attempts    enable row level security;
alter table public.reflections enable row level security;
