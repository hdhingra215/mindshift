-- ============================================================================
-- MindShift — Phase 7.1: Server-Authoritative XP Engine
-- ============================================================================
-- The single path by which progression is ever written. Derived from
-- docs/product/GameDesign.md §Reward, docs/content/Levels.md,
-- docs/database/RLSStrategy.md §E, docs/project/ProjectStatus.md §11 and
-- CLAUDE.md §8.
--
-- Scope (this migration ONLY): functions. No new tables, no schema changes to
-- existing tables, no changes to any RLS policy.
--
-- ── Why functions rather than client writes ─────────────────────────────────
-- RLS grants `authenticated` SELECT-only on xp_transactions and progress
-- (Phase 4, Section E): a player literally cannot write their own economy. That
-- is deliberate — RLS protects *rows*, but only server logic can protect the
-- *rules*. ProjectStatus §11 fixes the mechanism: "Write progression in a
-- Postgres function invoked on attempt submission, not in the client."
--
-- These functions are SECURITY DEFINER, which is the trust boundary: they run
-- as the owner and therefore bypass RLS, exactly as an edge function holding a
-- service-role key would — but without shipping a key anywhere, and with the
-- whole award running inside one transaction.
--
-- Every definer function below:
--   * sets an empty search_path and fully qualifies every identifier, so it
--     cannot be hijacked by a caller-controlled search_path;
--   * re-derives the player from auth.uid() and NEVER trusts a player id from
--     the caller — the client passes an attempt id and nothing else;
--   * is revoked from PUBLIC. Only the two award entry points are granted to
--     `authenticated`; the internal writers are callable solely by the award
--     functions (which run as owner).
--
-- ── Atomicity ───────────────────────────────────────────────────────────────
-- A function body is one transaction. Ledger append, progress rollup and
-- session rollup either all commit or all roll back — there is no window in
-- which XP exists in the ledger but not in progress. Failure needs no
-- compensating client logic; it needs no logic at all.
--
-- ── Idempotency ─────────────────────────────────────────────────────────────
-- Each award is keyed to its source fact (an attempt, a reflection) and refuses
-- to mint twice for the same fact. A retry after a dropped response is
-- therefore safe and returns the original award. This is also the anti-grind
-- guarantee: XP is a function of what the player *did*, not of how many times
-- the client asked.
--
-- ── Rebuildability ──────────────────────────────────────────────────────────
-- progress is never incremented. It is recomputed from the ledger and from
-- attempts on every write, so the rollup cannot drift from its sources and a
-- corrupted row self-heals on the next award (Layer 3A's stated contract:
-- total_xp must always equal SUM(xp_transactions.amount)).
-- ============================================================================

-- ############################################################################
-- SECTION A — Pure derivation
-- ############################################################################

-- ----------------------------------------------------------------------------
-- level_for_total_xp — the level curve, resolved in one place.
-- ----------------------------------------------------------------------------
-- Reads the seeded `levels` ladder rather than hardcoding thresholds, so
-- economy tuning is a seed change and never a code change (Levels.md: the
-- document fixes the ladder, not the numbers).
--
--   current_xp — XP earned into the current level (0 at a fresh level-up).
--   level_span — XP between this level and the next; NULL at the final level,
--                which is how a caller knows the ladder is topped out.
--
-- STABLE + read-only, so it is safe to expose to players: it is the same
-- arithmetic a progress bar needs and reveals nothing another player owns.
create function public.level_for_total_xp(p_total_xp integer)
returns table (
  level_number integer,
  level_title  text,
  current_xp   integer,
  level_span   integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with bounded as (
    select greatest(coalesce(p_total_xp, 0), 0) as total_xp
  ),
  reached as (
    select l.level_number, l.title, l.xp_required
    from public.levels l, bounded b
    where l.xp_required <= b.total_xp
    order by l.level_number desc
    limit 1
  ),
  upcoming as (
    select l.xp_required
    from public.levels l, bounded b
    where l.xp_required > b.total_xp
    order by l.level_number asc
    limit 1
  )
  select
    coalesce(r.level_number, 1),
    coalesce(r.title, 'Curious Mind'),
    (b.total_xp - coalesce(r.xp_required, 0))::integer,
    (u.xp_required - coalesce(r.xp_required, 0))::integer
  from bounded b
  left join reached r on true
  left join upcoming u on true;
$$;

comment on function public.level_for_total_xp(integer) is
  'Resolves lifetime XP against the seeded levels ladder. The only place the level curve is interpreted.';

-- ############################################################################
-- SECTION B — Rollup writers (internal)
-- ############################################################################

-- ----------------------------------------------------------------------------
-- refresh_player_progress — recompute the per-player rollup from its sources.
-- ----------------------------------------------------------------------------
-- The single progress calculation in the product. Everything it writes is
-- derived: total_xp from the ledger, level from the ladder, play counts and
-- accuracy from attempts. Nothing is incremented, so the row is self-healing
-- and any future system (mastery, achievements, streaks) can call this after
-- writing XP without needing to know how progress is shaped.
create function public.refresh_player_progress(p_player_id uuid)
returns public.progress
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total_xp   integer;
  v_level      record;
  v_play       record;
  v_progress   public.progress;
begin
  select coalesce(sum(t.amount), 0)::integer
    into v_total_xp
  from public.xp_transactions t
  where t.player_id = p_player_id;

  -- The ledger may hold compensating negatives; progress.total_xp is checked
  -- >= 0, so a net-negative history floors at zero rather than failing a write.
  v_total_xp := greatest(v_total_xp, 0);

  select * into v_level from public.level_for_total_xp(v_total_xp);

  -- Accuracy and completion counts come from attempts joined to their authored
  -- outcome — the same facts a rebuild script would use.
  select
    count(*)::integer as attempts,
    count(*) filter (where o.is_correct)::integer as correct,
    max(a.completed_at) as last_at
  into v_play
  from public.attempts a
  join public.outcomes o on o.id = a.outcome_id
  where a.player_id = p_player_id;

  insert into public.progress as p (
    player_id, current_level, current_xp, total_xp,
    scenarios_completed, overall_accuracy, last_activity_at, updated_at
  )
  values (
    p_player_id,
    v_level.level_number,
    v_level.current_xp,
    v_total_xp,
    coalesce(v_play.attempts, 0),
    case
      when coalesce(v_play.attempts, 0) = 0 then 0
      else round((v_play.correct::numeric / v_play.attempts) * 100, 2)
    end,
    coalesce(v_play.last_at, now()),
    now()
  )
  on conflict (player_id) do update set
    current_level       = excluded.current_level,
    current_xp          = excluded.current_xp,
    total_xp            = excluded.total_xp,
    scenarios_completed = excluded.scenarios_completed,
    overall_accuracy    = excluded.overall_accuracy,
    -- Never move activity backwards: another system may have touched it later.
    last_activity_at    = greatest(p.last_activity_at, excluded.last_activity_at),
    updated_at          = now()
  returning * into v_progress;

  return v_progress;
end;
$$;

comment on function public.refresh_player_progress(uuid) is
  'Recomputes the progress rollup from the XP ledger and attempts. Derived, never incremented — call after any XP write.';

-- ----------------------------------------------------------------------------
-- refresh_session_rollups — recompute one session''s counters. Returns its XP.
-- ----------------------------------------------------------------------------
-- Session XP is every ledger row traceable to an attempt in that session:
-- attempt-sourced rows via attempt_id, and non-attempt rows (the reflection
-- bonus today, anything attempt-anchored later) via source_ref_id. A row that
-- points at neither simply does not join, so this stays correct as new XP
-- sources arrive.
create function public.refresh_session_rollups(p_session_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_xp integer;
  v_attempts   integer;
begin
  select count(*)::integer into v_attempts
  from public.attempts a
  where a.session_id = p_session_id;

  select greatest(coalesce(sum(t.amount), 0), 0)::integer into v_session_xp
  from public.xp_transactions t
  join public.attempts a on a.id = coalesce(t.attempt_id, t.source_ref_id)
  where a.session_id = p_session_id;

  update public.sessions s
  set total_attempts  = v_attempts,
      total_xp_earned = v_session_xp,
      updated_at      = now()
  where s.id = p_session_id;

  return v_session_xp;
end;
$$;

comment on function public.refresh_session_rollups(uuid) is
  'Recomputes a session''s attempt count and earned XP from the ledger. Returns the session XP total.';

-- ----------------------------------------------------------------------------
-- record_xp — the only writer of the XP ledger.
-- ----------------------------------------------------------------------------
-- Every present and future XP source (attempt, reflection bonus, achievement,
-- streak) appends through here, so the ledger''s invariants and the progress
-- recompute exist in exactly one place. Adding a source is a new caller, never
-- a new copy of this logic.
--
-- Serialized per player with a transaction-scoped advisory lock: progress is
-- recomputed by summing the ledger, so two concurrent awards must not both read
-- the pre-insert sum. The lock releases automatically at commit or rollback.
create function public.record_xp(
  p_player_id     uuid,
  p_amount        integer,
  p_source        public.xp_source,
  p_reason        text,
  p_attempt_id    uuid default null,
  p_source_ref_id uuid default null
)
returns public.progress
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_amount = 0 then
    raise exception 'XP amount must be non-zero (the ledger records changes, not no-ops)';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_player_id::text, 0::bigint)
  );

  insert into public.xp_transactions
    (player_id, attempt_id, source_ref_id, amount, source, reason)
  values
    (p_player_id, p_attempt_id, p_source_ref_id, p_amount, p_source, p_reason);

  return public.refresh_player_progress(p_player_id);
end;
$$;

comment on function public.record_xp(uuid, integer, public.xp_source, text, uuid, uuid) is
  'Appends one XP ledger row and recomputes progress. The single XP writer — every source calls this.';

-- ############################################################################
-- SECTION C — Award entry points (player-callable)
-- ############################################################################

-- ----------------------------------------------------------------------------
-- progression_snapshot — the shape every award returns.
-- ----------------------------------------------------------------------------
-- Factored out so the two award functions cannot drift in what they report,
-- and so a future award (achievement, streak) returns an identical payload the
-- existing reward UI already knows how to render.
create function public.progression_snapshot(
  p_progress       public.progress,
  p_session_xp     integer,
  p_awarded        integer,
  p_awarded_now    boolean,
  p_previous_level integer
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'awarded',             p_awarded,
    -- False when an existing award was returned instead of minted, so the UI
    -- can stay silent on a replay rather than celebrating the same XP twice.
    'awarded_now',         p_awarded_now,
    'total_xp',            (p_progress).total_xp,
    'current_level',       (p_progress).current_level,
    'level_title',         l.level_title,
    'current_xp',          (p_progress).current_xp,
    'level_span',          l.level_span,
    'leveled_up',          (p_progress).current_level > p_previous_level,
    'previous_level',      p_previous_level,
    'session_xp',          p_session_xp,
    'scenarios_completed', (p_progress).scenarios_completed
  )
  from public.level_for_total_xp((p_progress).total_xp) l;
$$;

comment on function public.progression_snapshot(public.progress, integer, integer, boolean, integer) is
  'Builds the payload every XP award returns, so all award paths report identically.';

-- ----------------------------------------------------------------------------
-- award_attempt_xp — XP for playing a scenario. The primary award path.
-- ----------------------------------------------------------------------------
-- The amount is the authored `outcomes.xp_reward` for the choice the player
-- actually made — the economy lives in content, not in code, which is what
-- keeps a correct catch (20) worth more than a miss (5) without any rule here
-- deciding that. A miss still earns: a wrong answer is a discovery, never a
-- verdict (InteractionPrinciples §8).
--
-- Called once per attempt. A second call returns the original award untouched,
-- so replaying cannot farm XP and a retried request is safe.
create function public.award_attempt_xp(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player_id      uuid := (select auth.uid());
  v_attempt        record;
  v_existing       integer;
  v_amount         integer;
  v_awarded_now    boolean := false;
  v_previous_level integer;
  v_progress       public.progress;
  v_session_xp     integer;
begin
  if v_player_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Serialize this player's awards for the rest of the transaction, so the
  -- "already awarded?" check below and the insert that may follow it cannot be
  -- interleaved by a concurrent call and mint the same award twice.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_player_id::text, 0::bigint)
  );

  -- Ownership is re-derived here, never accepted from the caller. A definer
  -- function bypasses RLS, so this check IS the row-level guard.
  select a.id, a.session_id, o.xp_reward, o.is_correct, s.title as scenario_title
    into v_attempt
  from public.attempts a
  join public.outcomes o  on o.id = a.outcome_id
  join public.scenarios s on s.id = a.scenario_id
  where a.id = p_attempt_id
    and a.player_id = v_player_id;

  if not found then
    raise exception 'Attempt % not found for the current player', p_attempt_id;
  end if;

  select p.current_level into v_previous_level
  from public.progress p
  where p.player_id = v_player_id;
  v_previous_level := coalesce(v_previous_level, 1);

  select t.amount into v_existing
  from public.xp_transactions t
  where t.attempt_id = p_attempt_id
    and t.source = 'attempt'::public.xp_source
  limit 1;

  if v_existing is not null then
    v_amount := v_existing;
    -- Still refresh: the rollups are derived, so a repeat call is a free
    -- self-heal rather than a wasted round trip.
    v_progress := public.refresh_player_progress(v_player_id);
  elsif v_attempt.xp_reward > 0 then
    v_amount := v_attempt.xp_reward;
    v_awarded_now := true;
    v_progress := public.record_xp(
      v_player_id,
      v_amount,
      'attempt'::public.xp_source,
      case when v_attempt.is_correct then 'Caught it: ' else 'Learned it: ' end
        || v_attempt.scenario_title,
      p_attempt_id,
      null
    );
  else
    -- An authored zero reward is legitimate content; the ledger forbids a
    -- zero-amount row, so record nothing and report an honest zero.
    v_amount := 0;
    v_progress := public.refresh_player_progress(v_player_id);
  end if;

  v_session_xp := public.refresh_session_rollups(v_attempt.session_id);

  return public.progression_snapshot(
    v_progress, v_session_xp, v_amount, v_awarded_now, v_previous_level
  );
end;
$$;

comment on function public.award_attempt_xp(uuid) is
  'Awards the authored outcome XP for one attempt. Idempotent per attempt, owner-checked, atomic.';

-- ----------------------------------------------------------------------------
-- award_reflection_xp — XP for thinking about it afterwards.
-- ----------------------------------------------------------------------------
-- Rewards the metacognitive half of the loop: writing down what you noticed is
-- where recognition becomes transferable (ContentStrategy §8). Deliberately
-- small next to the play award — enough to acknowledge the act, never enough to
-- make reflection feel like a chore worth farming.
--
-- Requires an actual reflection row, so the bonus cannot be minted without the
-- work, and is granted at most once per attempt.
--
-- The 10 XP figure is the one number in the economy not authored in content.
-- It is provisional pending the economy tuning pass (ProjectStatus §9) and is
-- the only place it appears.
create function public.award_reflection_xp(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  reflection_bonus_xp constant integer := 10;
  v_player_id      uuid := (select auth.uid());
  v_attempt        record;
  v_existing       integer;
  v_amount         integer;
  v_awarded_now    boolean := false;
  v_previous_level integer;
  v_progress       public.progress;
  v_session_xp     integer;
begin
  if v_player_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Serialize this player's awards for the rest of the transaction, so the
  -- "already awarded?" check below and the insert that may follow it cannot be
  -- interleaved by a concurrent call and mint the same award twice.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_player_id::text, 0::bigint)
  );

  -- Ownership is re-derived here, never accepted from the caller.
  select a.id, a.session_id
    into v_attempt
  from public.attempts a
  where a.id = p_attempt_id
    and a.player_id = v_player_id;

  if not found then
    raise exception 'Attempt % not found for the current player', p_attempt_id;
  end if;

  if not exists (
    select 1 from public.reflections r where r.attempt_id = p_attempt_id
  ) then
    raise exception 'No reflection recorded for attempt %', p_attempt_id;
  end if;

  select p.current_level into v_previous_level
  from public.progress p
  where p.player_id = v_player_id;
  v_previous_level := coalesce(v_previous_level, 1);

  select t.amount into v_existing
  from public.xp_transactions t
  where t.source_ref_id = p_attempt_id
    and t.source = 'bonus'::public.xp_source
  limit 1;

  if v_existing is not null then
    v_amount := v_existing;
    v_progress := public.refresh_player_progress(v_player_id);
  else
    v_amount := reflection_bonus_xp;
    v_awarded_now := true;
    v_progress := public.record_xp(
      v_player_id,
      v_amount,
      'bonus'::public.xp_source,
      'Reflected on the outcome',
      null,
      p_attempt_id
    );
  end if;

  v_session_xp := public.refresh_session_rollups(v_attempt.session_id);

  return public.progression_snapshot(
    v_progress, v_session_xp, v_amount, v_awarded_now, v_previous_level
  );
end;
$$;

comment on function public.award_reflection_xp(uuid) is
  'Awards the reflection bonus for one attempt. Requires a saved reflection, idempotent per attempt.';

-- ############################################################################
-- SECTION D — Grants
-- ############################################################################
-- Postgres grants EXECUTE to PUBLIC by default, so every function is revoked
-- first and access re-granted deliberately. Only the award entry points and the
-- pure curve lookup are reachable by a player; the ledger and rollup writers
-- are callable solely from inside the definer functions above.

revoke all on function public.level_for_total_xp(integer)          from public;
revoke all on function public.refresh_player_progress(uuid)        from public;
revoke all on function public.refresh_session_rollups(uuid)        from public;
revoke all on function public.record_xp(uuid, integer, public.xp_source, text, uuid, uuid) from public;
revoke all on function public.progression_snapshot(public.progress, integer, integer, boolean, integer) from public;
revoke all on function public.award_attempt_xp(uuid)               from public;
revoke all on function public.award_reflection_xp(uuid)            from public;

grant execute on function public.level_for_total_xp(integer) to authenticated;
grant execute on function public.award_attempt_xp(uuid)      to authenticated;
grant execute on function public.award_reflection_xp(uuid)   to authenticated;

-- ############################################################################
-- SECTION E — Where the remaining progression systems plug in
-- ############################################################################
-- None of these are implemented here; this records the seams so the next phases
-- extend this engine instead of building beside it.
--
--   Mastery (bias_mastery)
--     A `refresh_bias_mastery(player, bias, attempt)` writer called from
--     award_attempt_xp, immediately after the ledger append and before the
--     session rollup. It has everything it needs already in scope: the attempt
--     row carries bias_id, and distinct_contexts is a count over attempts.
--
--   Achievements (player_achievements)
--     An `evaluate_achievements(player)` step called at the end of
--     award_attempt_xp, after progress is refreshed so criteria can read the
--     settled rollup. Achievement XP is awarded by calling record_xp with
--     source 'achievement' and source_ref_id = the achievement id — no second
--     XP path, and the payload the client already renders stays correct.
--
--   Streaks (streaks)
--     An `advance_streak(player, activity_date)` step in the same place, using
--     progress.last_activity_at. Streak XP, when it exists, goes through
--     record_xp with source 'streak'.
--
--   Statistics (statistics)
--     A `refresh_player_statistics(player)` writer alongside
--     refresh_player_progress — same derived-not-incremented contract.
--
-- All four are additive: new functions, new calls inside award_attempt_xp, and
-- no change to the ledger, to progress, or to what the client sends.
-- ############################################################################
