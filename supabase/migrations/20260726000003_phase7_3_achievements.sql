-- ============================================================================
-- MindShift — Phase 7.3: Achievement Engine
-- ============================================================================
-- Evaluates the fourteen seeded achievements (Phase 5B) against player history
-- and unlocks the ones that have been earned.
--
-- Scope (this migration ONLY): functions. No new tables, no column changes, no
-- RLS changes. `achievements` and `player_achievements` already exist; the
-- criteria DSL already exists in the seed. **No achievement is invented here** —
-- this migration implements the rules content already declares, which is why
-- adding an achievement later is a seed row and not a code change.
--
-- ── The criteria DSL ────────────────────────────────────────────────────────
-- `achievements.criteria` is `{"type": <rule>, <params>}`. Thirteen rule types
-- cover all fourteen achievements. Every one of them is a *learning* signal —
-- recognition, transfer, calibration, recovery, breadth, consistency. None
-- counts logins, sessions or clicks, and none can be satisfied by volume alone.
--
-- ── Derived, like everything else in progression ────────────────────────────
-- Criteria are evaluated against facts computed from `attempts`, `reflections`
-- and `bias_mastery` at unlock time. Nothing is incremented, so evaluation is
-- idempotent by construction: re-running it on unchanged history unlocks
-- nothing. Double-unlocking is impossible at two layers — the
-- `player_achievements_player_achievement_uk` constraint, and `on conflict do
-- nothing` which is also how "newly unlocked" is detected.
--
-- ── Cheating ────────────────────────────────────────────────────────────────
-- The client cannot reach any of this. `player_achievements` has no client
-- write policy (Phase 4 §E), the evaluator is SECURITY DEFINER with an empty
-- search_path, and it derives the player from auth.uid() rather than accepting
-- one. A player can ask "did I earn anything?" and nothing else.
-- ============================================================================

-- ############################################################################
-- SECTION A — Shared thresholds
-- ############################################################################

-- ----------------------------------------------------------------------------
-- mastery_tier_floor — the mastery ladder, in SQL.
-- ----------------------------------------------------------------------------
-- Achievements ask questions like "how many biases are Mastered?", so the tier
-- boundaries have to exist server-side as well as in the client's tier ladder.
--
-- ⚠ These values are mirrored in `src/features/mastery/constants.ts`
-- (`MASTERY_TIERS`). They are the same ladder and must change together — the
-- same deliberate duplication as the motion tokens (tokens.ts ↔ globals.css).
-- Keeping them in one place would mean a round trip per rendered meter.
create function public.mastery_tier_floor(p_tier text)
returns numeric
language sql
immutable
security invoker
set search_path = ''
as $$
  select case p_tier
    when 'unfamiliar' then 0
    when 'aware'      then 20
    when 'practiced'  then 40
    when 'skilled'    then 65
    when 'mastered'   then 85
  end::numeric;
$$;

comment on function public.mastery_tier_floor(text) is
  'Lower bound of a mastery tier. Mirrors MASTERY_TIERS in src/features/mastery/constants.ts — change both together.';

-- ############################################################################
-- SECTION B — Parameterised fact helpers
-- ############################################################################
-- Each criteria type that takes a parameter gets its own small function, rather
-- than one query with a dozen branches. One question each, individually
-- readable, individually replaceable.

-- Correct clears at a given difficulty ("took on and cleared Advanced").
create function public.achievement_difficulty_clears(
  p_player_id uuid,
  p_difficulty public.difficulty_level
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(distinct a.scenario_id)::integer
  from public.attempts a
  join public.outcomes  o on o.id = a.outcome_id
  join public.scenarios s on s.id = a.scenario_id
  where a.player_id = p_player_id
    and o.is_correct
    and s.difficulty = p_difficulty;
$$;

-- Distinct days played inside a trailing window.
create function public.achievement_active_days(
  p_player_id   uuid,
  p_window_days integer
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(distinct (a.completed_at at time zone 'UTC')::date)::integer
  from public.attempts a
  where a.player_id = p_player_id
    and a.completed_at >= now() - make_interval(days => greatest(p_window_days, 1));
$$;

-- ----------------------------------------------------------------------------
-- achievement_day_streak — longest run of consecutive playing days.
-- ----------------------------------------------------------------------------
-- Gaps-and-islands over distinct activity dates. `p_allow_grace` widens the
-- tolerated gap to one missed day, which is the forgiving behaviour GameDesign
-- §5 requires — a streak is encouragement, never a debt.
--
-- ⚠ This is the *only* definition of a day streak in the product. When the
-- streak system proper lands (7.4), `advance_streak` must call this rather than
-- computing its own, or the number the player sees on their streak card will
-- disagree with the one that unlocked their achievement.
create function public.achievement_day_streak(
  p_player_id   uuid,
  p_allow_grace boolean
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with days as (
    select distinct (a.completed_at at time zone 'UTC')::date as played_on
    from public.attempts a
    where a.player_id = p_player_id
  ),
  marked as (
    select
      played_on,
      case
        when played_on - lag(played_on) over (order by played_on)
             <= (case when p_allow_grace then 2 else 1 end)
        then 0 else 1
      end as starts_island
    from days
  ),
  islands as (
    select played_on, sum(starts_island) over (order by played_on) as island
    from marked
  ),
  spans as (
    -- Span rather than count: with grace, a missed day still sits inside the run.
    select (max(played_on) - min(played_on) + 1) as span
    from islands
    group by island
  )
  select coalesce(max(span), 0)::integer from spans;
$$;

-- Reflections whose stated confidence tracked the actual result.
create function public.achievement_calibrated_outcomes(
  p_player_id uuid,
  p_max_gap   integer
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.reflections r
  join public.attempts a on a.id = r.attempt_id
  join public.outcomes  o on o.id = a.outcome_id
  where r.player_id = p_player_id
    and r.confidence_before is not null
    and abs(
      r.confidence_before - (case when o.is_correct then 100 else 0 end)
    ) <= greatest(p_max_gap, 0);
$$;

-- ----------------------------------------------------------------------------
-- achievement_recovery_run — a rough patch followed by a genuine recovery.
-- ----------------------------------------------------------------------------
-- True when the ordered attempt history contains N consecutive misses directly
-- followed by M consecutive correct recognitions. The most on-brand achievement
-- in the set: it can only be earned by getting things wrong first.
create function public.achievement_recovery_run(
  p_player_id     uuid,
  p_misses_before integer,
  p_correct_after integer
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with seq as (
    select
      row_number() over (order by a.completed_at, a.id) as rn,
      o.is_correct
    from public.attempts a
    join public.outcomes o on o.id = a.outcome_id
    where a.player_id = p_player_id
  )
  select exists (
    select 1
    from seq s
    where (
      select count(*) from seq m
      where m.rn between s.rn and s.rn + p_misses_before - 1
        and not m.is_correct
    ) = p_misses_before
    and (
      select count(*) from seq c
      where c.rn between s.rn + p_misses_before
                     and s.rn + p_misses_before + p_correct_after - 1
        and c.is_correct
    ) = p_correct_after
  );
$$;

-- ############################################################################
-- SECTION C — Parameter-free facts
-- ############################################################################

-- ----------------------------------------------------------------------------
-- achievement_facts — one snapshot of everything the simple rules need.
-- ----------------------------------------------------------------------------
-- Computed once per evaluation and reused across all fourteen checks, so a
-- player finishing a scenario costs one pass over their history rather than
-- fourteen.
--
-- "Recognised a bias" means: answered correctly on a scenario that teaches it.
-- Consistent with the mastery engine, which credits the bias the *scenario*
-- teaches rather than `attempts.bias_id` (null on a correct answer).
create function public.achievement_facts(p_player_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with played as (
    select a.id, a.scenario_id, o.is_correct, s.category_id
    from public.attempts a
    join public.outcomes  o on o.id = a.outcome_id
    join public.scenarios s on s.id = a.scenario_id
    where a.player_id = p_player_id
  ),
  -- Biases the player has correctly recognised, with the family each belongs to.
  recognised as (
    select distinct b.id as bias_id, b.category_id
    from played p
    join public.scenario_biases sb on sb.scenario_id = p.scenario_id
    join public.biases b            on b.id = sb.bias_id
    where p.is_correct
      and b.deleted_at is null
  ),
  -- Per family: how many of its biases are recognised, and how many it holds.
  per_category as (
    select
      c.id as category_id,
      count(distinct r.bias_id)                                     as recognised_count,
      (select count(*) from public.biases b2
        where b2.category_id = c.id and b2.deleted_at is null)      as total_count
    from public.categories c
    left join recognised r on r.category_id = c.id
    where c.deleted_at is null
    group by c.id
  )
  select jsonb_build_object(
    'scenarios_completed',
      (select count(*) from played),
    'correct_recognitions',
      (select count(*) from played where is_correct),
    'reflections_completed',
      (select count(*) from public.reflections r where r.player_id = p_player_id),
    'biases_mastered',
      (select count(*) from public.bias_mastery m
        where m.player_id = p_player_id
          and m.mastery_level >= public.mastery_tier_floor('mastered')),
    'max_bias_distinct_contexts',
      (select coalesce(max(m.distinct_contexts), 0) from public.bias_mastery m
        where m.player_id = p_player_id),
    'categories_sampled',
      (select count(distinct category_id) from played where category_id is not null),
    'max_category_biases',
      (select coalesce(max(recognised_count), 0) from per_category),
    -- A family counts as complete when every bias in it has been recognised.
    'categories_completed',
      (select count(*) from per_category
        where total_count > 0 and recognised_count >= total_count)
  );
$$;

comment on function public.achievement_facts(uuid) is
  'One snapshot of the parameter-free learning facts every simple criteria rule reads.';

-- ############################################################################
-- SECTION D — The predicate
-- ############################################################################

-- ----------------------------------------------------------------------------
-- achievement_criteria_met — does this rule hold for this player?
-- ----------------------------------------------------------------------------
-- The single place the DSL is interpreted. An unrecognised rule type returns
-- false rather than raising: a seed row added ahead of its evaluator should
-- leave the achievement unearned, never break an attempt's award.
create function public.achievement_criteria_met(
  p_player_id uuid,
  p_criteria  jsonb,
  p_facts     jsonb
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_type text := p_criteria->>'type';
begin
  /*
   * Coalesced to false at the boundary. A criteria row missing a parameter makes
   * its comparison NULL, and `continue when NULL` does not continue — malformed
   * content would have unlocked the achievement instead of skipping it. Fail
   * closed: an unearned achievement is a content bug, a wrongly granted one is a
   * broken promise.
   */
  return coalesce(case v_type

    -- Volume of play, used only for the very first milestone.
    when 'scenarios_completed' then
      (p_facts->>'scenarios_completed')::integer >= (p_criteria->>'count')::integer

    -- The core skill: catching a bias rather than falling for it.
    when 'correct_recognitions' then
      (p_facts->>'correct_recognitions')::integer >= (p_criteria->>'count')::integer

    when 'reflections_completed' then
      (p_facts->>'reflections_completed')::integer >= (p_criteria->>'count')::integer

    -- Mastery tier reached on N biases (uses the shared ladder, §A).
    when 'biases_mastered' then
      (p_facts->>'biases_mastered')::integer >= (p_criteria->>'count')::integer

    -- Transfer: the same bias recognised in N different situations.
    when 'bias_distinct_contexts' then
      (p_facts->>'max_bias_distinct_contexts')::integer >= (p_criteria->>'distinct_contexts')::integer

    -- Both biases of one family — understanding the mechanism, not the names.
    when 'category_biases_recognized' then
      (p_facts->>'max_category_biases')::integer >= (p_criteria->>'biases_per_category')::integer

    when 'categories_completed' then
      (p_facts->>'categories_completed')::integer >= (p_criteria->>'count')::integer

    when 'categories_sampled' then
      (p_facts->>'categories_sampled')::integer >= (p_criteria->>'count')::integer

    when 'difficulty_completed' then
      public.achievement_difficulty_clears(
        p_player_id, (p_criteria->>'difficulty')::public.difficulty_level
      ) >= (p_criteria->>'count')::integer

    when 'active_days' then
      public.achievement_active_days(
        p_player_id, (p_criteria->>'window_days')::integer
      ) >= (p_criteria->>'distinct_days')::integer

    when 'activity_streak_days' then
      public.achievement_day_streak(
        p_player_id, coalesce((p_criteria->>'grace')::boolean, false)
      ) >= (p_criteria->>'streak_days')::integer

    when 'confidence_calibration' then
      public.achievement_calibrated_outcomes(
        p_player_id, (p_criteria->>'max_gap')::integer
      ) >= (p_criteria->>'calibrated_outcomes')::integer

    when 'recovery_run' then
      public.achievement_recovery_run(
        p_player_id,
        (p_criteria->>'misses_before')::integer,
        (p_criteria->>'correct_after')::integer
      )

    else false
  end, false);
end;
$$;

comment on function public.achievement_criteria_met(uuid, jsonb, jsonb) is
  'Interprets one achievements.criteria rule against a player. The only place the DSL is read.';

-- ############################################################################
-- SECTION E — The unlock writer
-- ############################################################################

-- ----------------------------------------------------------------------------
-- evaluate_achievements — unlock everything newly earned. Returns the unlocks.
-- ----------------------------------------------------------------------------
-- Only ever called from inside an award, so it inherits that transaction: an
-- achievement and its XP commit together or not at all.
--
-- Ordered by xp_reward so that if several land at once the client can present
-- them smallest-first and let the biggest moment arrive last (InteractionPrinciples
-- §2 — reward beats queue and resolve in sequence, never simultaneously).
create function public.evaluate_achievements(p_player_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_facts     jsonb;
  v_candidate record;
  v_inserted  uuid;
  v_result    jsonb := '[]'::jsonb;
begin
  v_facts := public.achievement_facts(p_player_id);

  for v_candidate in
    select a.id, a.slug, a.name, a.description, a.icon, a.criteria, a.xp_reward
    from public.achievements a
    where a.is_active
      and a.deleted_at is null
      -- Already earned achievements are skipped before evaluation, so the work
      -- shrinks as a player progresses instead of growing.
      and not exists (
        select 1 from public.player_achievements pa
        where pa.player_id = p_player_id and pa.achievement_id = a.id
      )
    order by a.xp_reward asc, a.slug asc
  loop
    -- Safe as a plain negation: the predicate coalesces to false, never NULL.
    continue when not public.achievement_criteria_met(
      p_player_id, v_candidate.criteria, v_facts
    );

    /*
     * The unique constraint is the real guard, and `do nothing` turns it into
     * the detector: a returned id means this call is what unlocked it, so XP is
     * awarded exactly once even under a concurrent double-submit.
     */
    insert into public.player_achievements
      (player_id, achievement_id, progress_snapshot)
    values (
      p_player_id,
      v_candidate.id,
      jsonb_build_object(
        'criteria', v_candidate.criteria,
        'facts', v_facts,
        'unlocked_at', now()
      )
    )
    on conflict (player_id, achievement_id) do nothing
    returning id into v_inserted;

    continue when v_inserted is null;

    -- Achievement XP rides the one ledger writer, tagged with its own source
    -- and pointing back at the achievement. No second XP path exists.
    if v_candidate.xp_reward > 0 then
      perform public.record_xp(
        p_player_id,
        v_candidate.xp_reward,
        'achievement'::public.xp_source,
        'Achievement: ' || v_candidate.name,
        null,
        v_candidate.id
      );
    end if;

    v_result := v_result || jsonb_build_object(
      'achievement_id', v_candidate.id,
      'slug',           v_candidate.slug,
      'name',           v_candidate.name,
      'description',    v_candidate.description,
      'icon',           v_candidate.icon,
      'xp_reward',      v_candidate.xp_reward
    );
  end loop;

  return v_result;
end;
$$;

comment on function public.evaluate_achievements(uuid) is
  'Evaluates every unearned active achievement and unlocks those earned. Idempotent; awards XP through record_xp.';

-- ############################################################################
-- SECTION F — Wiring into the award pipeline
-- ############################################################################
-- The pipeline becomes:
--
--   attempt → XP ledger → progress → mastery → ACHIEVEMENTS → progress
--           → session rollup → snapshot
--
-- Achievements run last among the evaluators because their criteria read
-- progress and mastery as settled state. Progress is then refreshed once more,
-- because an unlock may have just added XP to the ledger and the snapshot must
-- not report a stale total.

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

  v_session_xp := public.refresh_session_rollups(v_attempt.session_id);

  return public.progression_snapshot(
    v_progress, v_session_xp, v_amount, v_awarded_now, v_previous_level
  )
  || jsonb_build_object('mastery', v_mastery)
  || jsonb_build_object('achievements', v_achievements);
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

  -- Writing a reflection can itself be the earning act (Deep Diver, Well
  -- Calibrated), so achievements are evaluated on this path too.
  v_achievements := public.evaluate_achievements(v_player_id);
  if jsonb_array_length(v_achievements) > 0 then
    v_progress := public.refresh_player_progress(v_player_id);
  end if;

  v_session_xp := public.refresh_session_rollups(v_attempt.session_id);

  return public.progression_snapshot(
    v_progress, v_session_xp, v_amount, v_awarded_now, v_previous_level
  )
  || jsonb_build_object('mastery', v_mastery)
  || jsonb_build_object('achievements', v_achievements);
end;
$$;

-- ############################################################################
-- SECTION G — Grants
-- ############################################################################
-- All internal: reached only through the award entry points, which already
-- re-derive the player from auth.uid(). Players read their own unlocks through
-- the existing `player_achievements_select_own` policy.

revoke all on function public.mastery_tier_floor(text)                                    from public;
revoke all on function public.achievement_difficulty_clears(uuid, public.difficulty_level) from public;
revoke all on function public.achievement_active_days(uuid, integer)                       from public;
revoke all on function public.achievement_day_streak(uuid, boolean)                        from public;
revoke all on function public.achievement_calibrated_outcomes(uuid, integer)               from public;
revoke all on function public.achievement_recovery_run(uuid, integer, integer)             from public;
revoke all on function public.achievement_facts(uuid)                                      from public;
revoke all on function public.achievement_criteria_met(uuid, jsonb, jsonb)                 from public;
revoke all on function public.evaluate_achievements(uuid)                                  from public;

-- ############################################################################
-- SECTION H — What is left, and where it plugs in
-- ############################################################################
--   Streaks (7.4)  — advance_streak(player, date) in award_attempt_xp, beside
--                    evaluate_achievements. It MUST call
--                    achievement_day_streak() rather than compute its own run,
--                    or the streak card and the Steady Mind achievement will
--                    show different numbers for the same history.
--   Statistics     — refresh_player_statistics(player) alongside
--                    refresh_player_progress.
--   Mastery decay  — see Section E of the mastery migration.
--
--   New achievements need no code: insert a row whose criteria uses one of the
--   thirteen implemented rule types. A genuinely new rule type is one `when`
--   branch in achievement_criteria_met plus, if parameterised, one helper.
--
--   Known gap: achievement XP is not counted in `sessions.total_xp_earned`,
--   because the session rollup traces ledger rows through an attempt and an
--   achievement is not attached to one. Total XP is correct; the session strip
--   just does not include it. Modelling that link is a schema change and was
--   deliberately not made here.
-- ############################################################################
