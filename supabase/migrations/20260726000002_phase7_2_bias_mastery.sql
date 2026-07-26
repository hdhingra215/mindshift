-- ============================================================================
-- MindShift — Phase 7.2: Bias Mastery Engine
-- ============================================================================
-- Mastery is the game's real progression metric. XP measures activity; mastery
-- measures learning, and the two must never be the same number wearing
-- different clothes (GameDesign §6: "Mastery — not raw XP — is the true measure
-- of learning").
--
-- Scope (this migration ONLY): functions. No new tables, no column changes, no
-- RLS changes. `public.bias_mastery` already exists (Layer 3B) and every column
-- it declares is written here for the first time.
--
-- ── The model ───────────────────────────────────────────────────────────────
-- Mastery is a **pure aggregate over attempt history**, not a running counter.
--
--   mastery = ceiling(distinct_contexts) × (1 − Π(1 − rateᵢ))
--
-- where `rateᵢ` is how much the i-th encounter with this bias taught the
-- player. Three properties fall out of that shape rather than being enforced:
--
--   * **Bounded.** The product is in (0,1], so mastery approaches the ceiling
--     and can never exceed it. No clamp is doing the work.
--   * **Diminishing.** Each encounter closes a fraction of the *remaining*
--     distance, so the tenth rep is worth far less than the first. Grinding one
--     scenario converges instead of paying out.
--   * **Rebuildable.** Multiplication commutes, so the result does not depend
--     on evaluation order and the row can be recomputed from `attempts` at any
--     time. Same derived-not-incremented contract as the XP engine (7.1); a
--     corrupted row self-heals on the next award.
--
-- ── The ceiling is the anti-grind mechanism ─────────────────────────────────
-- You cannot master a bias you have only ever met in one situation. The ceiling
-- rises with the number of *distinct scenarios in which the player recognised
-- the bias* — which is exactly what `bias_mastery.distinct_contexts` was
-- specified to mean, and exactly what GameDesign §11 calls transfer: "Mastery
-- requires recognition across many contexts, not one correct answer."
--
-- ── Tuning ──────────────────────────────────────────────────────────────────
-- Every coefficient lives in exactly one function, named, with the reasoning
-- next to it. Retuning the economy is editing constants in `bias_mastery_rate`
-- and `bias_mastery_ceiling` — no formula changes, no client changes, and the
-- next award recomputes every affected row from history automatically.
-- ============================================================================

-- ############################################################################
-- SECTION A — The tunable model
-- ############################################################################

-- ----------------------------------------------------------------------------
-- bias_mastery_ceiling — how high mastery can reach, given breadth of exposure.
-- ----------------------------------------------------------------------------
-- Calibrated against the seeded library: every bias is taught by at least two
-- scenarios, so the top tier is reachable for all twelve while still being
-- unreachable from a single one. One context caps a player at "Skilled"; the
-- second unlocks "Mastered".
create function public.bias_mastery_ceiling(p_distinct_contexts integer)
returns numeric
language sql
immutable
security invoker
set search_path = ''
as $$
  select least(
    100::numeric,
    -- Recognised it nowhere yet: a hard ceiling that still leaves room for a
    -- player who keeps falling for it to register real, visible learning.
    50::numeric
    -- Each distinct scenario in which they caught it raises the roof.
    + 25::numeric * greatest(coalesce(p_distinct_contexts, 0), 0)
  );
$$;

comment on function public.bias_mastery_ceiling(integer) is
  'Mastery ceiling as a function of distinct recognised contexts. The anti-grind mechanism.';

-- ----------------------------------------------------------------------------
-- bias_mastery_rate — how much one encounter teaches. The tuning surface.
-- ----------------------------------------------------------------------------
-- Returns the fraction of the *remaining* distance to the ceiling that this
-- single encounter closes. Every signal the product claims to value is priced
-- here and nowhere else.
create function public.bias_mastery_rate(
  p_is_correct           boolean,
  p_reflected            boolean,
  p_calibrated           boolean,
  p_is_repeat_context    boolean,
  p_hours_since_previous numeric
)
returns numeric
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  -- Catching the bias is the strongest signal that recognition is forming.
  rate_correct        constant numeric := 0.20;
  -- A miss still teaches: the reveal is the primary teaching moment, and a
  -- wrong answer is a discovery, never a verdict (InteractionPrinciples §8).
  -- Smaller, never zero — learning happened, just less of it.
  rate_incorrect      constant numeric := 0.07;
  -- Writing the reflection is where recognition becomes transferable.
  bonus_reflected     constant numeric := 0.05;
  -- Knowing how sure you should have been is a distinct skill from being right.
  bonus_calibrated    constant numeric := 0.04;
  -- Recall after a gap is durable recall; recall thirty seconds later is not.
  bonus_spaced        constant numeric := 0.04;
  -- Hours after which an encounter counts as spaced. Just under a day, so a
  -- daily player earns it without having to count hours.
  spacing_threshold_h constant numeric := 20;
  -- Replaying a scenario already seen teaches far less than a fresh one — the
  -- player may be recalling the answer rather than recognising the bias.
  repeat_damping      constant numeric := 0.5;
  -- No single encounter may close more than this much of the remaining gap,
  -- so the curve stays a curve even if every bonus stacks.
  max_rate            constant numeric := 0.32;
  v_rate numeric;
begin
  v_rate := case when p_is_correct then rate_correct else rate_incorrect end;

  if p_reflected then v_rate := v_rate + bonus_reflected; end if;
  if p_calibrated then v_rate := v_rate + bonus_calibrated; end if;

  -- The first ever encounter has no previous one to be spaced from, and is
  -- already carrying the new-context bonus implicitly through the ceiling.
  if p_hours_since_previous is not null
     and p_hours_since_previous >= spacing_threshold_h then
    v_rate := v_rate + bonus_spaced;
  end if;

  if p_is_repeat_context then
    v_rate := v_rate * repeat_damping;
  end if;

  return least(v_rate, max_rate);
end;
$$;

comment on function public.bias_mastery_rate(boolean, boolean, boolean, boolean, numeric) is
  'Fraction of the remaining gap to the ceiling that one encounter closes. The single tuning surface for mastery.';

-- ############################################################################
-- SECTION B — The rollup writer
-- ############################################################################

-- ----------------------------------------------------------------------------
-- refresh_bias_mastery — recompute one player/bias row from attempt history.
-- ----------------------------------------------------------------------------
-- The single mastery calculation in the product. Nothing increments; the whole
-- row is derived, so it cannot drift from the attempts that produced it.
create function public.refresh_bias_mastery(p_player_id uuid, p_bias_id uuid)
returns public.bias_mastery
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- A reflection is "calibrated" when stated confidence and actual result
  -- agree: confident and right, or unsure and wrong. Metacognition, not a score.
  calibration_tolerance constant numeric := 0.35;
  -- Spaced-review scheduling. Decay itself is a later phase; the column is
  -- populated now so the review queue has something to read.
  review_base_hours     constant numeric := 48;
  -- A well-known bias is safe to leave alone longer than a shaky one.
  review_mastery_scale  constant numeric := 6;

  v_stats   record;
  v_ceiling numeric;
  v_mastery numeric;
  v_decays  timestamptz;
  v_row     public.bias_mastery;
begin
  /*
   * One pass over the player's history with this bias. The window functions
   * supply the two order-dependent signals — whether the scenario had been seen
   * before, and how long since the previous encounter — while the mastery
   * product itself is order-independent.
   */
  with history as (
    select
      a.scenario_id,
      a.completed_at,
      o.is_correct,
      (r.id is not null) as reflected,
      case
        when r.confidence_before is null then false
        else abs(
          (r.confidence_before::numeric / 100)
          - (case when o.is_correct then 1 else 0 end)
        ) <= calibration_tolerance
      end as calibrated,
      row_number() over (
        partition by a.scenario_id order by a.completed_at, a.id
      ) > 1 as is_repeat_context,
      (
        extract(epoch from (
          a.completed_at
          - lag(a.completed_at) over (order by a.completed_at, a.id)
        )) / 3600
      )::numeric as hours_since_previous
    from public.attempts a
    join public.outcomes o        on o.id = a.outcome_id
    join public.scenario_biases sb on sb.scenario_id = a.scenario_id
    left join public.reflections r on r.attempt_id = a.id
    where a.player_id = p_player_id
      and sb.bias_id = p_bias_id
  ),
  rated as (
    select
      h.*,
      public.bias_mastery_rate(
        h.is_correct, h.reflected, h.calibrated,
        h.is_repeat_context, h.hours_since_previous
      ) as rate
    from history h
  )
  select
    count(*)::integer                                             as total_attempts,
    count(*) filter (where is_correct)::integer                   as correct_attempts,
    count(distinct scenario_id) filter (where is_correct)::integer as distinct_contexts,
    max(completed_at)                                             as last_practiced_at,
    -- Π(1 − rate) as exp(Σ ln(1 − rate)): the unlearned fraction that remains.
    coalesce(exp(sum(ln(1 - rate))), 1)                           as remaining
  into v_stats
  from rated;

  v_ceiling := public.bias_mastery_ceiling(coalesce(v_stats.distinct_contexts, 0));

  v_mastery := case
    when coalesce(v_stats.total_attempts, 0) = 0 then 0
    else round(v_ceiling * (1 - v_stats.remaining), 2)
  end;

  -- Belt and braces: the formula cannot exceed the ceiling, but the column
  -- constraint is the contract and rounding should never be what breaks it.
  v_mastery := least(greatest(v_mastery, 0), 100);

  v_decays := case
    when v_stats.last_practiced_at is null then null
    else v_stats.last_practiced_at
       + make_interval(hours => (
           review_base_hours * (1 + (v_mastery / 100) * review_mastery_scale)
         )::integer)
  end;

  insert into public.bias_mastery as m (
    player_id, bias_id, mastery_level, total_attempts, correct_attempts,
    distinct_contexts, last_practiced_at, decays_at, updated_at
  )
  values (
    p_player_id, p_bias_id, v_mastery,
    coalesce(v_stats.total_attempts, 0),
    coalesce(v_stats.correct_attempts, 0),
    coalesce(v_stats.distinct_contexts, 0),
    v_stats.last_practiced_at, v_decays, now()
  )
  on conflict (player_id, bias_id) do update set
    mastery_level     = excluded.mastery_level,
    total_attempts    = excluded.total_attempts,
    correct_attempts  = excluded.correct_attempts,
    distinct_contexts = excluded.distinct_contexts,
    last_practiced_at = greatest(m.last_practiced_at, excluded.last_practiced_at),
    decays_at         = excluded.decays_at,
    updated_at        = now()
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.refresh_bias_mastery(uuid, uuid) is
  'Recomputes one player/bias mastery row from attempt history. The single mastery calculation.';

-- ----------------------------------------------------------------------------
-- refresh_attempt_mastery — update every bias one attempt trained.
-- ----------------------------------------------------------------------------
-- Mastery attaches to the bias the *scenario teaches* (`scenario_biases`), not
-- to `attempts.bias_id`. That column records the bias the chosen option
-- embodied and is deliberately null when the player answered correctly — using
-- it would have credited mastery only to players who fell for the trap.
--
-- Returns the per-bias before/after so the reveal can show what moved without
-- the client recomputing anything.
create function public.refresh_attempt_mastery(p_player_id uuid, p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb := '[]'::jsonb;
  v_bias   record;
  v_before numeric;
  v_after  public.bias_mastery;
begin
  for v_bias in
    select b.id, b.slug, b.name
    from public.attempts a
    join public.scenario_biases sb on sb.scenario_id = a.scenario_id
    join public.biases b           on b.id = sb.bias_id
    where a.id = p_attempt_id
      and a.player_id = p_player_id
      and b.deleted_at is null
    order by b.slug
  loop
    -- The stored value is "before" precisely because the row is only ever
    -- rewritten by an award, and this attempt has not been awarded yet.
    select m.mastery_level into v_before
    from public.bias_mastery m
    where m.player_id = p_player_id and m.bias_id = v_bias.id;

    v_after := public.refresh_bias_mastery(p_player_id, v_bias.id);

    v_result := v_result || jsonb_build_object(
      'bias_id',           v_bias.id,
      'bias_slug',         v_bias.slug,
      'bias_name',         v_bias.name,
      'mastery_level',     v_after.mastery_level,
      'previous_level',    coalesce(v_before, 0),
      'delta',             round(v_after.mastery_level - coalesce(v_before, 0), 2),
      'ceiling',           public.bias_mastery_ceiling(v_after.distinct_contexts),
      'distinct_contexts', v_after.distinct_contexts,
      'total_attempts',    v_after.total_attempts,
      'correct_attempts',  v_after.correct_attempts
    );
  end loop;

  return v_result;
end;
$$;

comment on function public.refresh_attempt_mastery(uuid, uuid) is
  'Refreshes mastery for every bias the attempt''s scenario teaches. Returns per-bias before/after.';

-- ############################################################################
-- SECTION C — Wiring mastery into the existing award pipeline
-- ############################################################################
-- Both award functions are replaced rather than joined by a third: there is one
-- progression path, and mastery is a step inside it, not a system beside it.
-- The pipeline is now:
--
--     attempt → XP ledger → progress → MASTERY → session rollup → snapshot
--
-- The returned payload gains a `mastery` array and is otherwise unchanged, so
-- 7.1's contract still holds for anything already reading it.

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

  -- Mastery is derived from attempt history, so it is idempotent for free: a
  -- replayed award recomputes the same number and reports a delta of zero.
  v_mastery := public.refresh_attempt_mastery(v_player_id, p_attempt_id);

  v_session_xp := public.refresh_session_rollups(v_attempt.session_id);

  return public.progression_snapshot(
    v_progress, v_session_xp, v_amount, v_awarded_now, v_previous_level
  ) || jsonb_build_object('mastery', v_mastery);
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

  /*
   * The reflection now exists, so recomputing mastery picks up both the
   * reflection bonus and the calibration signal for this attempt. This is why
   * mastery is derived rather than incremented: a fact recorded after the fact
   * still counts, with no correction logic anywhere.
   */
  v_mastery := public.refresh_attempt_mastery(v_player_id, p_attempt_id);

  v_session_xp := public.refresh_session_rollups(v_attempt.session_id);

  return public.progression_snapshot(
    v_progress, v_session_xp, v_amount, v_awarded_now, v_previous_level
  ) || jsonb_build_object('mastery', v_mastery);
end;
$$;

-- ############################################################################
-- SECTION D — Grants
-- ############################################################################
-- The mastery functions are internal: they are reached only through the award
-- entry points, which already re-derive the player from auth.uid(). Players
-- read their own mastery through the existing `bias_mastery_select_own` policy.

revoke all on function public.bias_mastery_ceiling(integer)                      from public;
revoke all on function public.bias_mastery_rate(boolean, boolean, boolean, boolean, numeric) from public;
revoke all on function public.refresh_bias_mastery(uuid, uuid)                   from public;
revoke all on function public.refresh_attempt_mastery(uuid, uuid)                from public;

-- ############################################################################
-- SECTION E — Where the remaining systems plug in
-- ############################################################################
-- Unchanged from 7.1, minus mastery. Achievements and streaks still slot into
-- award_attempt_xp; both can now read `bias_mastery` as settled state, because
-- mastery is refreshed before the session rollup and inside the same
-- transaction.
--
--   Achievements  — evaluate_achievements(player) at the end of
--                   award_attempt_xp. Transfer criteria ("caught the same bias
--                   in four domains") read bias_mastery.distinct_contexts
--                   directly; no new counters required.
--   Streaks       — advance_streak(player, date) in the same place.
--   Statistics    — refresh_player_statistics(player) alongside
--                   refresh_player_progress.
--   Mastery decay — a scheduled pass over bias_mastery where decays_at < now().
--                   Because mastery is derived, decay must be modelled as an
--                   explicit term in the formula rather than a subtraction, or
--                   the next refresh will undo it. Add it to
--                   bias_mastery_rate's caller, not to the stored value.
-- ############################################################################
