-- ============================================================================
-- MindShift — Layer 1: Identity & Content
-- ============================================================================
-- Implements the authored/global content tables plus the player identity
-- extension (profiles). Derived from docs/architecture/DomainModel.md and
-- docs/database/DatabaseSchema.md.
--
-- Scope (this migration ONLY):
--   profiles, categories, biases, levels, achievements, scenario_packs,
--   scenarios, scenario_choices, outcomes, scenario_biases,
--   scenario_pack_items
--
-- Conventions:
--   * UUID primary keys (profiles reuses auth.users.id).
--   * Audit fields: created_at, updated_at everywhere; deleted_at only on
--     soft-deletable content/identity tables. Junctions are hard-delete.
--   * RLS is ENABLED on every table. Policies are authored in a later phase.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums (stable controlled vocabularies)
-- ----------------------------------------------------------------------------
create type public.difficulty_level as enum ('easy', 'medium', 'hard', 'expert');
create type public.content_status as enum ('draft', 'published', 'archived');
create type public.scenario_source as enum ('authored', 'ai_generated');

-- ----------------------------------------------------------------------------
-- Shared trigger: maintain updated_at
-- (empty search_path to satisfy the function_search_path_mutable lint)
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- profiles — player identity extension (1:1 with auth.users)
-- ============================================================================
create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  display_name       text,
  avatar_url         text,
  theme              text        not null default 'dark',
  locale             text        not null default 'en',
  notification_prefs jsonb       not null default '{}'::jsonb,
  is_public          boolean     not null default false,
  onboarded_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================================
-- categories — thematic grouping for biases and scenarios
-- ============================================================================
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text        not null unique,
  name        text        not null,
  description text,
  icon        text,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ============================================================================
-- biases — a teachable cognitive-bias concept
-- ============================================================================
create table public.biases (
  id                uuid primary key default gen_random_uuid(),
  slug              text                   not null unique,
  name              text                   not null,
  short_description text,
  full_explanation  text,
  counter_strategy  text,
  difficulty        public.difficulty_level not null default 'medium',
  category_id       uuid references public.categories (id) on delete set null,
  created_at        timestamptz            not null default now(),
  updated_at        timestamptz            not null default now(),
  deleted_at        timestamptz
);

create index biases_category_id_idx on public.biases (category_id);

create trigger biases_set_updated_at
  before update on public.biases
  for each row execute function public.set_updated_at();

-- ============================================================================
-- levels — global XP -> tier definitions (reference table, no soft delete)
-- ============================================================================
create table public.levels (
  id           uuid primary key default gen_random_uuid(),
  level_number integer     not null unique check (level_number >= 1),
  xp_required  integer     not null check (xp_required >= 0),
  title        text        not null,
  unlocks      jsonb       not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger levels_set_updated_at
  before update on public.levels
  for each row execute function public.set_updated_at();

-- ============================================================================
-- achievements — catalog of earnable milestones
-- ============================================================================
create table public.achievements (
  id          uuid primary key default gen_random_uuid(),
  slug        text        not null unique,
  name        text        not null,
  description text,
  icon        text,
  criteria    jsonb       not null default '{}'::jsonb,
  xp_reward   integer     not null default 0 check (xp_reward >= 0),
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- Hot path: list active, non-deleted achievements.
create index achievements_active_idx
  on public.achievements (is_active)
  where deleted_at is null;

create trigger achievements_set_updated_at
  before update on public.achievements
  for each row execute function public.set_updated_at();

-- ============================================================================
-- scenario_packs — curated, releasable collection of scenarios
-- ============================================================================
create table public.scenario_packs (
  id           uuid primary key default gen_random_uuid(),
  slug         text        not null unique,
  name         text        not null,
  description  text,
  cover_image  text,
  is_published boolean     not null default false,
  sort_order   integer     not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create trigger scenario_packs_set_updated_at
  before update on public.scenario_packs
  for each row execute function public.set_updated_at();

-- ============================================================================
-- scenarios — a single decision situation
-- ============================================================================
create table public.scenarios (
  id          uuid primary key default gen_random_uuid(),
  slug        text                    not null unique,
  title       text                    not null,
  context     text                    not null,
  stakes      text,
  difficulty  public.difficulty_level not null default 'medium',
  category_id uuid references public.categories (id) on delete set null,
  source      public.scenario_source  not null default 'authored',
  status      public.content_status   not null default 'draft',
  version     integer                 not null default 1 check (version >= 1),
  created_at  timestamptz             not null default now(),
  updated_at  timestamptz             not null default now(),
  deleted_at  timestamptz
);

create index scenarios_category_id_idx on public.scenarios (category_id);

-- Hot path: browse published, non-deleted scenarios.
create index scenarios_status_idx
  on public.scenarios (status)
  where deleted_at is null;

create trigger scenarios_set_updated_at
  before update on public.scenarios
  for each row execute function public.set_updated_at();

-- ============================================================================
-- scenario_choices — one selectable option within a scenario
-- ============================================================================
create table public.scenario_choices (
  id          uuid primary key default gen_random_uuid(),
  scenario_id uuid        not null references public.scenarios (id) on delete cascade,
  label       text        not null,
  body        text,
  is_trap     boolean     not null default false,
  bias_id     uuid references public.biases (id) on delete set null,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index scenario_choices_scenario_id_idx on public.scenario_choices (scenario_id);
create index scenario_choices_bias_id_idx on public.scenario_choices (bias_id);

create trigger scenario_choices_set_updated_at
  before update on public.scenario_choices
  for each row execute function public.set_updated_at();

-- ============================================================================
-- outcomes — consequence + teaching payload for a choice (1:1 with choice)
-- ============================================================================
create table public.outcomes (
  id          uuid primary key default gen_random_uuid(),
  choice_id   uuid        not null unique references public.scenario_choices (id) on delete cascade,
  result_text text        not null,
  explanation text        not null,
  is_correct  boolean     not null default false,
  xp_reward   integer     not null default 0 check (xp_reward >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create trigger outcomes_set_updated_at
  before update on public.outcomes
  for each row execute function public.set_updated_at();

-- ============================================================================
-- scenario_biases — M:N link: which biases a scenario teaches (hard-delete)
-- ============================================================================
create table public.scenario_biases (
  id          uuid primary key default gen_random_uuid(),
  scenario_id uuid        not null references public.scenarios (id) on delete cascade,
  bias_id     uuid        not null references public.biases (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (scenario_id, bias_id)
);

-- (scenario_id, bias_id) unique index serves scenario_id lookups; index bias_id.
create index scenario_biases_bias_id_idx on public.scenario_biases (bias_id);

-- ============================================================================
-- scenario_pack_items — M:N link: scenarios within packs (hard-delete)
-- ============================================================================
create table public.scenario_pack_items (
  id          uuid primary key default gen_random_uuid(),
  pack_id     uuid        not null references public.scenario_packs (id) on delete cascade,
  scenario_id uuid        not null references public.scenarios (id) on delete cascade,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now(),
  unique (pack_id, scenario_id)
);

-- (pack_id, scenario_id) unique index serves pack_id lookups; index scenario_id.
create index scenario_pack_items_scenario_id_idx on public.scenario_pack_items (scenario_id);

-- ============================================================================
-- Enable Row Level Security on every table (policies added in a later phase).
-- With RLS enabled and no policies, all access is denied by default —
-- secure-by-default, exactly the intended posture.
-- ============================================================================
alter table public.profiles            enable row level security;
alter table public.categories          enable row level security;
alter table public.biases              enable row level security;
alter table public.levels              enable row level security;
alter table public.achievements        enable row level security;
alter table public.scenario_packs      enable row level security;
alter table public.scenarios           enable row level security;
alter table public.scenario_choices    enable row level security;
alter table public.outcomes            enable row level security;
alter table public.scenario_biases     enable row level security;
alter table public.scenario_pack_items enable row level security;
