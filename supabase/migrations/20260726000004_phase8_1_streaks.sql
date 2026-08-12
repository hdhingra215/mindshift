-- ============================================================================
-- MindShift — Phase 8.1: Living Streak Engine
-- ============================================================================
-- The last progression system. Completes: XP → mastery → achievements → streak.
--
-- Scope (this migration ONLY): functions. No new tables, no column changes, no
-- RLS changes. `public.streaks` has existed since Layer 3B and every column it
-- declares is written here for the first time.
--
-- ── What a streak means here ─────────────────────────────────────────────────
-- Not "I opened the app". A day counts when the player *deliberately trained
-- their thinking*, which this engine defines as either:
--
--   * two or more decisions made, or
--   * one reflection written.
--
-- A single tap does not count; two considered decisions do, and one written
-- reflection does on its own because writing one is unambiguously deliberate.
--
-- Reflection is the stronger signal but deliberately **not** the only one.
-- InteractionPrinciples §8 fixes reflection as "an invitation, never a gate" —
-- making the streak depend on it would quietly convert the invitation into a
-- daily obligation, which is the exact dark pattern §13 forbids.
--
-- ── Forgiving by construction ───────────────────────────────────────────────
-- Grace is always on (GameDesign §5). One missed day sits *inside* a run rather
-- than ending it, and the missed day is still counted in the run's length —
-- because the run really was that long, and pretending otherwise would punish
-- someone for having a life. Two consecutive missed days end it, quietly.
--
-- ── Derived, like everything else ───────────────────────────────────────────
-- `streaks` is a rollup recomputed from `attempts` and `reflections` on every
-- award. Nothing increments, so the engine survives retries, multiple sessions
-- in a day, double submissions and clock skew for free: re-running it on
-- unchanged history produces the identical row.
--
-- ── One definition of a day run ─────────────────────────────────────────────
-- Phase 7.3 shipped `achievement_day_streak` for the Steady Mind achievement and
-- warned, in the migration, that the streak system must reuse it rather than
-- invent a second definition. This migration honours that by generalising in the
-- other direction: `streak_state` becomes the single implementation, and
-- `achievement_day_streak` is replaced with a thin delegation to it. There is
-- exactly one answer to "how long is this player's run", and both the streak
-- surface and the achievement read it.
--
-- ⚠ That is a deliberate behaviour change: Steady Mind now counts *qualifying*
-- days rather than any day with a single attempt. It is strictly harder and
-- strictly more honest, and it cannot regress anyone — `player_achievements` is
-- append-only, so an already-unlocked achievement is never revoked.
-- ============================================================================

-- ############################################################################
-- SECTION A — What counts as a day
-- ############################################################################

-- ----------------------------------------------------------------------------
-- streak_qualifying_days — the days that represent deliberate practice.
-- ----------------------------------------------------------------------------
-- The single place "a day counts" is defined. Both thresholds live here and
-- nowhere else, so tightening or loosening the bar is a one-line change that
-- every consumer picks up on the next award.
--
-- Days are bucketed in UTC. That is a known simplification — a player far from
-- UTC has a day boundary that does not match their own midnight. Fixing it needs
-- a stored player timezone, which is a schema change and out of scope; see the
-- note at the end of this file.
create function public.streak_qualifying_days(p_player_id uuid)
returns table (played_on date)
language sql
stable
security definer
set search_path = ''
as $$
  with decisions as (
    select
      (a.completed_at at time zone 'UTC')::date as played_on,
      count(*) as attempts,
      count(r.id) as reflections
    from public.attempts a
    left join public.reflections r on r.attempt_id = a.id
    where a.player_id = p_player_id
    group by 1
  )
  select d.played_on
  from decisions d
  -- Two decisions, or one reflection. Either is deliberate; one idle tap is not.
  where d.attempts >= 2 or d.reflections >= 1
  order by d.played_on;
$$;

comment on function public.streak_qualifying_days(uuid) is
  'Dates on which the player deliberately trained: >=2 decisions, or >=1 reflection. The only definition of a counting day.';

-- ############################################################################
-- SECTION B — The run
-- ############################################################################

-- ----------------------------------------------------------------------------
-- streak_state — current run, longest run, and how forgiving it had to be.
-- ----------------------------------------------------------------------------
-- Gaps-and-islands over qualifying days. `p_allow_grace` widens the tolerated
-- gap to one missed day.
--
--   current_streak — length of the run containing the most recent qualifying
--                    day, but only while that run is still live. Zero once the
--                    tolerance has lapsed.
--   longest_streak — the longest run ever, live or not. Never decreases, so the
--                    `streaks_current_lte_longest_ck` constraint holds by
--                    construction rather than by clamping.
--   grace_used     — missed days sitting inside the current run. The forgiveness
--                    actually spent, surfaced so it can be shown kindly.
--   qualified_today — whether today already counts. Lets the interface say
--                    "today counts" without ever implying a deadline.
--
-- Run length is measured as a **span** (last − first + 1), not a count of
-- qualifying days, so a forgiven day stays inside the run it belongs to.
create function public.streak_state(p_player_id uuid, p_allow_grace boolean)
returns table (
  current_streak   integer,
  longest_streak   integer,
  last_qualifying_day date,
  grace_used       integer,
  qualified_today  boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with settings as (
    select
      (case when p_allow_grace then 2 else 1 end)::integer as max_gap,
      (now() at time zone 'UTC')::date as today
  ),
  days as (
    select played_on from public.streak_qualifying_days(p_player_id)
  ),
  marked as (
    select
      d.played_on,
      case
        when d.played_on - lag(d.played_on) over (order by d.played_on) <= s.max_gap
        then 0 else 1
      end as starts_run
    from days d cross join settings s
  ),
  runs as (
    select played_on, sum(starts_run) over (order by played_on) as run_id
    from marked
  ),
  spans as (
    select
      run_id,
      min(played_on) as first_day,
      max(played_on) as last_day,
      (max(played_on) - min(played_on) + 1)::integer as span,
      count(*)::integer as qualifying_days
    from runs
    group by run_id
  ),
  latest as (
    select * from spans order by last_day desc limit 1
  )
  select
    -- Live only while today is still inside the tolerance. Once it lapses the
    -- run is over — reported plainly, never as a loss or a warning.
    coalesce(
      (select l.span from latest l, settings s where s.today - l.last_day <= s.max_gap),
      0
    )::integer,
    coalesce((select max(span) from spans), 0)::integer,
    (select l.last_day from latest l),
    -- Days forgiven inside the live run. Zero when no run is live.
    coalesce(
      (select l.span - l.qualifying_days from latest l, settings s
        where s.today - l.last_day <= s.max_gap),
      0
    )::integer,
    exists (select 1 from days d, settings s where d.played_on = s.today);
$$;

comment on function public.streak_state(uuid, boolean) is
  'Current and longest runs of qualifying days, plus grace spent and whether today counts. The single day-run implementation.';

-- ----------------------------------------------------------------------------
-- achievement_day_streak — now a delegation, not a second implementation.
-- ----------------------------------------------------------------------------
-- Replaced so that Steady Mind and the streak surface can never disagree about
-- the same history. Signature and return type are unchanged, so
-- `achievement_criteria_met` needs no edit.
create or replace function public.achievement_day_streak(
  p_player_id   uuid,
  p_allow_grace boolean
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select longest_streak from public.streak_state(p_player_id, p_allow_grace);
$$;

comment on function public.achievement_day_streak(uuid, boolean) is
  'Longest run of qualifying days. Thin delegation to streak_state — kept so achievement criteria read the one definition.';

-- ############################################################################
-- SECTION C — The rollup writer
-- ############################################################################

-- ----------------------------------------------------------------------------
-- refresh_player_streak — recompute the streak row from history.
-- ----------------------------------------------------------------------------
-- Grace is hard-wired on: a forgiving streak is a product value, not a setting
-- (GameDesign §5, InteractionPrinciples §13). There is no punishing variant to
-- accidentally reach for.
create function public.refresh_player_streak(p_player_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Forgiveness is not configurable. One missed day never ends a run.
  streak_grace_enabled constant boolean := true;
  v_state record;
  v_row   public.streaks;
begin
  select * into v_state from public.streak_state(p_player_id, streak_grace_enabled);

  insert into public.streaks as s (
    player_id, current_streak, longest_streak, last_activity_date, grace_used, updated_at
  )
  values (
    p_player_id,
    v_state.current_streak,
    v_state.longest_streak,
    v_state.last_qualifying_day,
    v_state.grace_used,
    now()
  )
  on conflict (player_id) do update set
    current_streak     = excluded.current_streak,
    -- Longest is a high-water mark. Recomputation can only ever match or raise
    -- it, but taking the max makes that explicit and survives a partial history.
    longest_streak     = greatest(s.longest_streak, excluded.longest_streak),
    last_activity_date = greatest(s.last_activity_date, excluded.last_activity_date),
    grace_used         = excluded.grace_used,
    updated_at         = now()
  returning * into v_row;

  /*
   * Returns the snapshot rather than the row, so the run is computed exactly once
   * per award. A separate snapshot function would have had to ask
   * `streak_state` a second time for `qualified_today` alone.
   */
  return jsonb_build_object(
    'current_streak',  v_row.current_streak,
    'longest_streak',  v_row.longest_streak,
    'grace_used',      v_row.grace_used,
    'last_active_day', v_row.last_activity_date,
    'qualified_today', v_state.qualified_today,
    -- A run can be live-and-counting or not running at all. The client needs the
    -- distinction to choose between acknowledging and inviting.
    'is_live',         v_row.current_streak > 0
  );
end;
$$;

comment on function public.refresh_player_streak(uuid) is
  'Recomputes the streak rollup from qualifying days and returns the client snapshot. Derived, never incremented.';

-- ############################################################################
-- SECTION D — Wiring into the existing pipeline
-- ############################################################################
-- The pipeline is now complete:
--
--   attempt → XP ledger → progress → mastery → achievements → STREAK → snapshot
--
-- Streak runs last. Order is not load-bearing for correctness — achievements
-- compute their own run from history rather than reading the `streaks` table —
-- but last is where it belongs: it is the only system that summarises the others
-- rather than feeding them.

create or replace function public.award_attempt_xp(p_attempt_id uuid)
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
  v_mastery        jsonb;
  v_achievements   jsonb;
  v_streak         jsonb;
begin
  if v_player_id is null then
    raise exception 'Not authenticated';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_player_id::text, 0::bigint)
  );

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
    v_amount := 0;
    v_progress := public.refresh_player_progress(v_player_id);
  end if;

  v_mastery := public.refresh_attempt_mastery(v_player_id, p_attempt_id);

  v_achievements := public.evaluate_achievements(v_player_id);
  if jsonb_array_length(v_achievements) > 0 then
    v_progress := public.refresh_player_progress(v_player_id);
  end if;

  v_streak := public.refresh_player_streak(v_player_id);

  v_session_xp := public.refresh_session_rollups(v_attempt.session_id);

  return public.progression_snapshot(
    v_progress, v_session_xp, v_amount, v_awarded_now, v_previous_level
  )
  || jsonb_build_object('mastery', v_mastery)
  || jsonb_build_object('achievements', v_achievements)
  || jsonb_build_object('streak', v_streak);
end;
$$;

create or replace function public.award_reflection_xp(p_attempt_id uuid)
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
  v_mastery        jsonb;
  v_achievements   jsonb;
  v_streak         jsonb;
begin
  if v_player_id is null then
    raise exception 'Not authenticated';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_player_id::text, 0::bigint)
  );

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

  v_mastery := public.refresh_attempt_mastery(v_player_id, p_attempt_id);

  v_achievements := public.evaluate_achievements(v_player_id);
  if jsonb_array_length(v_achievements) > 0 then
    v_progress := public.refresh_player_progress(v_player_id);
  end if;

  /*
   * A reflection can make today qualify on its own, so the streak is refreshed
   * on this path too. This is the moment the "consistency of reflection" reading
   * of a streak actually lands: one written note is enough for the day to count.
   */
  v_streak := public.refresh_player_streak(v_player_id);

  v_session_xp := public.refresh_session_rollups(v_attempt.session_id);

  return public.progression_snapshot(
    v_progress, v_session_xp, v_amount, v_awarded_now, v_previous_level
  )
  || jsonb_build_object('mastery', v_mastery)
  || jsonb_build_object('achievements', v_achievements)
  || jsonb_build_object('streak', v_streak);
end;
$$;

-- ############################################################################
-- SECTION E — Grants
-- ############################################################################
-- Internal. Players read their own row through the existing
-- `streaks_select_own` policy and receive the snapshot with every award.

revoke all on function public.streak_qualifying_days(uuid)                    from public;
revoke all on function public.streak_state(uuid, boolean)                     from public;
revoke all on function public.refresh_player_streak(uuid)                     from public;
revoke all on function public.achievement_day_streak(uuid, boolean)           from public;

-- ############################################################################
-- SECTION F — What remains
-- ############################################################################
--   Statistics     — refresh_player_statistics(player) alongside
--                    refresh_player_progress. The last unwritten rollup.
--   Mastery decay  — see Section E of the mastery migration.
--
--   Player timezone — days are bucketed in UTC, so a player far from UTC has a
--                     day boundary that is not their own midnight. The fix is a
--                     timezone on `profiles` and one `at time zone` change in
--                     `streak_qualifying_days`; the rest of the engine is
--                     already timezone-agnostic because it only ever compares
--                     dates. Deliberately not done here: it is a schema change.
--
--   Deliberateness — the qualifying bar is "two decisions or one reflection".
--                    Response time is a tempting third signal but a dangerous
--                    one: it would penalise fast readers, and GameDesign §7
--                    forbids timers that punish. If it is ever added it belongs
--                    in streak_qualifying_days and nowhere else.
-- ############################################################################
