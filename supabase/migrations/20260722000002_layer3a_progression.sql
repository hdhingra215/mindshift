-- ============================================================================
-- MindShift — Layer 3A: Player Progression Foundation
-- ============================================================================
-- The XP economy: an immutable ledger (xp_transactions) plus a rebuildable
-- per-player rollup (progress). Derived from docs/architecture/DomainModel.md,
-- docs/database/DatabaseSchema.md, docs/database/RLSStrategy.md,
-- docs/product/GameDesign.md, docs/product/PRD.md, and CLAUDE.md.
--
-- Scope (this migration ONLY):
--   progress, xp_transactions
--
-- Conventions (consistent with Layers 1 & 2):
--   * UUID primary keys.
--   * Player-owned rows carry player_id and cascade on account erasure.
--   * RLS is ENABLED on every table. Policies are authored in a later phase.
--   * NO triggers, NO business logic, NO Edge Functions here.
--
-- Ledger integrity:
--   * xp_transactions is append-only: created_at only, no updated_at/deleted_at.
--     Corrections are new compensating rows (signed amount), never edits.
--   * The ledger stores NO running totals. total_xp in progress is a rollup
--     that must always equal SUM(xp_transactions.amount) for the player, so the
--     full history stays reconstructable from the ledger alone.
--   * progress is a mutable rollup; its updated_at is application-maintained
--     (no trigger, per Layer 3A constraints).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums (stable controlled vocabularies)
-- ----------------------------------------------------------------------------
-- Origin of an XP award. Mirrors the reward mechanics in GameDesign.md.
-- attempt-sourced rows reference an attempt directly; achievement/streak/bonus
-- rows reference their source loosely via source_ref_id (those tables land in
-- later layers), keeping this enum stable as the economy grows.
create type public.xp_source as enum ('attempt', 'achievement', 'streak', 'bonus');

-- ============================================================================
-- progress — per-player progression snapshot (rebuildable rollup, 1:1 player)
-- ============================================================================
-- Kept for fast dashboard reads. Fully reconstructable: total_xp from the
-- ledger, current_level/current_xp from total_xp against the levels table.
create table public.progress (
  id                   uuid          primary key default gen_random_uuid(),
  player_id            uuid          not null unique references public.profiles (id) on delete cascade,
  -- Account level reached (matches levels.level_number). Kept as an integer
  -- rather than an FK so a fresh player row never depends on levels seed order.
  current_level        integer       not null default 1 check (current_level >= 1),
  -- XP accumulated toward the next level (resets each level-up).
  current_xp           integer       not null default 0 check (current_xp >= 0),
  -- Lifetime cumulative XP; equals SUM(xp_transactions.amount) for the player.
  total_xp             integer       not null default 0 check (total_xp >= 0),
  -- Lightweight play rollups (per DatabaseSchema.md) — cheap dashboard reads.
  scenarios_completed  integer       not null default 0 check (scenarios_completed >= 0),
  overall_accuracy     numeric(5, 2) not null default 0 check (overall_accuracy between 0 and 100),
  last_activity_at     timestamptz,
  created_at           timestamptz   not null default now(),
  updated_at           timestamptz   not null default now()
);

-- player_id is UNIQUE (index created implicitly) — serves the 1:1 lookup.

-- ============================================================================
-- xp_transactions — immutable XP ledger (append-only)
-- ============================================================================
-- Every XP change is exactly one row. Never updated or deleted; corrections are
-- compensating rows with a signed amount.
create table public.xp_transactions (
  id            uuid            primary key default gen_random_uuid(),
  player_id     uuid            not null references public.profiles (id) on delete cascade,
  -- Present for attempt-sourced awards; null for achievement/streak/bonus.
  attempt_id    uuid            references public.attempts (id) on delete cascade,
  -- Loose reference to a non-attempt source (achievement/streak/bonus id).
  -- Intentionally not an FK — target tables arrive in later layers.
  source_ref_id uuid,
  -- Signed: positive awards, negative compensating corrections. Never zero.
  amount        integer         not null check (amount <> 0),
  source        public.xp_source not null,
  -- Human-readable rationale for auditability (e.g. "Correct: anchoring bias").
  reason        text            not null check (length(btrim(reason)) > 0),
  created_at    timestamptz     not null default now(),
  -- An attempt-sourced award must reference its attempt; attempt_id only ever
  -- accompanies the attempt source. Keeps the ledger's provenance coherent.
  constraint xp_transactions_attempt_ref_ck check (
    (source = 'attempt' and attempt_id is not null)
    or (source <> 'attempt' and attempt_id is null)
  )
);

-- Hot path: XP ledger reads for a player, newest first.
create index xp_transactions_player_created_idx on public.xp_transactions (player_id, created_at desc);

-- FK index (Postgres does not auto-index FKs); serves attempt->XP lookups.
create index xp_transactions_attempt_id_idx
  on public.xp_transactions (attempt_id)
  where attempt_id is not null;

-- ============================================================================
-- Enable Row Level Security on every table (policies added in a later phase).
-- With RLS enabled and no policies, all access is denied by default —
-- secure-by-default, exactly the intended posture.
-- ============================================================================
alter table public.progress        enable row level security;
alter table public.xp_transactions enable row level security;
