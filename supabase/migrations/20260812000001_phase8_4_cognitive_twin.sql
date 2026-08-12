-- ============================================================================
-- Phase 8.4 — Cognitive Twin
-- ============================================================================
-- A model of how this player actually decides, built from their own recorded
-- decisions and nothing else.
--
-- ── What the Twin is allowed to claim ───────────────────────────────────────
-- One thing only: "in situations like this one, you have historically caught
-- the trap / missed it". That is a statement about a *record*, and the record
-- is here to back it. It never describes a personality, never diagnoses, and
-- never speaks below its evidence thresholds — a player with too little history
-- gets a sealed Twin that says so, which is the honest answer and a better
-- product moment than a confident guess.
--
-- ── Why the inference lives in SQL ──────────────────────────────────────────
-- Same reason as the rest of the economy: the client proposes, the database
-- decides. A prediction computed in the browser could be recomputed after the
-- fact to always look right, and the player's whole decision history would have
-- to be shipped to the client to do it. Both are unacceptable, so the analysis
-- runs where the data already is and the client is told only the conclusion.
--
-- ── Two context axes, both real ─────────────────────────────────────────────
-- Predictions are made about a *context*, and only two exist because only two
-- are actually in the content:
--   pack      the topical setting — Money & Spending, At Work, Digital Life…
--   category  the bias family — Decision & Framing, Value & Anchoring…
-- Nothing here invents a taxonomy. There is no per-choice "framing" attribute
-- in the content, so the Twin does not pretend to predict one.
--
-- Functions + one table. No existing table or policy is altered; `award_attempt_xp`
-- is replaced (not supplemented) to add the resolution step, exactly as 7.2, 7.3
-- and 8.1 each did before it.
-- ============================================================================

-- ============================================================================
-- SECTION A — the prediction record
-- ============================================================================
-- Every prediction is written down *before* the player decides, and resolved
-- afterwards from their actual attempt. That ordering is the whole integrity
-- story: accuracy over time is measurable precisely because the Twin cannot
-- revise what it said once it has seen the answer.
create table public.twin_predictions (
  id              uuid          primary key default gen_random_uuid(),
  player_id       uuid          not null references public.profiles (id)  on delete cascade,
  scenario_id     uuid          not null references public.scenarios (id) on delete cascade,
  -- Null until the player actually plays the scenario the prediction was for.
  -- Unique so one attempt can never resolve two predictions.
  attempt_id      uuid          unique references public.attempts (id) on delete cascade,

  -- What was predicted: true = "you will catch it", false = "this one gets you".
  predicted_catch boolean       not null,
  -- Which axis the claim rests on, and the human label shown to the player.
  context_kind    text          not null check (context_kind in ('pack', 'category')),
  context_label   text          not null,
  -- The evidence behind it, stored so the claim can always be audited later.
  sample_size     integer       not null check (sample_size >= 0),
  observed_rate   numeric(5, 2) not null check (observed_rate between 0 and 100),

  -- Resolution. All three move together or not at all.
  actual_catch    boolean,
  was_correct     boolean,
  resolved_at     timestamptz,

  created_at      timestamptz   not null default now(),

  constraint twin_predictions_resolution_ck check (
    (attempt_id is null and actual_catch is null and was_correct is null and resolved_at is null)
    or
    (attempt_id is not null and actual_catch is not null and was_correct is not null and resolved_at is not null)
  )
);

-- The Archive's read path: this player's predictions, newest first.
create index twin_predictions_player_created_idx
  on public.twin_predictions (player_id, created_at desc);

-- Cadence and "is there an open prediction for this scenario" both look here.
create index twin_predictions_open_idx
  on public.twin_predictions (player_id, scenario_id)
  where attempt_id is null;

alter table public.twin_predictions enable row level security;

-- Read-only to the player, exactly like every other progression rollup. There
-- is deliberately no insert or update policy: a client that could write this
-- table could grade its own Twin.
create policy twin_predictions_select_own on public.twin_predictions
  for select to authenticated using (player_id = (select auth.uid()));

comment on table public.twin_predictions is
  'Cognitive Twin predictions, written before the decision and resolved after it. '
  'Player-readable, never player-writable — accuracy is only meaningful if the '
  'prediction cannot be revised once the answer is known.';

-- ============================================================================
-- SECTION B — thresholds
-- ============================================================================
-- The Twin's honesty is these four numbers. They are functions rather than
-- inlined literals so that every caller — prediction, eligibility, the Archive
-- readout and the tests — reads the same value, and tuning happens in one place.

-- Decisions on record before a Twin exists at all.
create function public.twin_min_total_attempts()
returns integer language sql immutable set search_path = '' as $$ select 12 $$;

-- Decisions within one context before that context may be spoken about.
create function public.twin_min_context_sample()
returns integer language sql immutable set search_path = '' as $$ select 5 $$;

-- How lopsided a context must be to count as a pattern rather than a coin flip.
-- 0.68 ≈ "at least roughly two times in three", which is the weakest claim
-- worth making out loud.
create function public.twin_min_edge()
returns numeric language sql immutable set search_path = '' as $$ select 0.68 $$;

-- Decisions that must pass between predictions. The Twin is an occasional
-- presence, not a running commentary — a prediction on every scenario would
-- turn the game into a guessing contest with the interface.
create function public.twin_cooldown_attempts()
returns integer language sql immutable set search_path = '' as $$ select 3 $$;

comment on function public.twin_min_edge() is
  'Minimum observed rate for a context to be called a pattern. Below this the '
  'Twin stays quiet rather than dressing up a coin flip as an insight.';

-- ============================================================================
-- SECTION C — evidence
-- ============================================================================
-- One attempt, reduced to the facts a prediction can rest on: which contexts it
-- belonged to, and whether the player caught the trap.
--
-- "Caught" is `outcomes.is_correct`, the same signal XP, accuracy and mastery
-- already use. Deliberately not `scenario_choices.is_trap`: thirteen seeded
-- scenarios carry two trap choices and one carries two correct ones, so trap
-- and correct are not complements and only one of them is a clean binary.
create function public.twin_attempt_facts(p_player_id uuid)
returns table (
  attempt_id    uuid,
  completed_at  timestamptz,
  caught        boolean,
  context_kind  text,
  context_label text
)
language sql
stable
security definer
set search_path = ''
as $$
  -- Pack axis: the topical setting the decision happened in.
  select a.id, a.completed_at, o.is_correct, 'pack'::text, p.name
  from public.attempts a
  join public.outcomes o             on o.id = a.outcome_id
  join public.scenario_pack_items pi on pi.scenario_id = a.scenario_id
  join public.scenario_packs p       on p.id = pi.pack_id
  where a.player_id = p_player_id

  union all

  -- Category axis: the family of bias the scenario belongs to.
  select a.id, a.completed_at, o.is_correct, 'category'::text, c.name
  from public.attempts a
  join public.outcomes o     on o.id = a.outcome_id
  join public.scenarios s    on s.id = a.scenario_id
  join public.categories c   on c.id = s.category_id
  where a.player_id = p_player_id;
$$;

comment on function public.twin_attempt_facts(uuid) is
  'Every recorded decision, projected onto the two context axes. The single '
  'source of evidence for every Twin claim.';

-- Contexts where this player has enough history to be spoken about, strongest
-- pattern first.
--
-- `observed_rate` is the catch rate. A context is a pattern when it is lopsided
-- in *either* direction — reliably catching framing traps is exactly as real a
-- finding as reliably falling for them, and only reporting the failures would
-- make the Twin a critic rather than a mirror.
create function public.twin_patterns(p_player_id uuid)
returns table (
  context_kind  text,
  context_label text,
  sample_size   integer,
  catches       integer,
  observed_rate numeric,
  predicts_catch boolean,
  edge          numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  with tallied as (
    select
      f.context_kind,
      f.context_label,
      count(*)::integer                                   as sample_size,
      count(*) filter (where f.caught)::integer           as catches
    from public.twin_attempt_facts(p_player_id) f
    group by f.context_kind, f.context_label
  ),
  scored as (
    select
      t.*,
      round(t.catches::numeric / t.sample_size * 100, 2) as observed_rate,
      t.catches::numeric / t.sample_size                 as catch_ratio
    from tallied t
    where t.sample_size >= public.twin_min_context_sample()
  )
  select
    s.context_kind,
    s.context_label,
    s.sample_size,
    s.catches,
    s.observed_rate,
    s.catch_ratio >= 0.5                              as predicts_catch,
    -- Distance from a coin flip, normalised to 0–1. The ranking key.
    greatest(s.catch_ratio, 1 - s.catch_ratio)        as edge
  from scored s
  where greatest(s.catch_ratio, 1 - s.catch_ratio) >= public.twin_min_edge()
  order by edge desc, s.sample_size desc, s.context_label asc;
$$;

comment on function public.twin_patterns(uuid) is
  'Contexts lopsided enough to be called a pattern. Reports strength in both '
  'directions — reliably resisting a trap is as real a finding as falling for it.';

-- ============================================================================
-- SECTION D — making a prediction
-- ============================================================================
-- Mints a prediction for a scenario the player is about to see, or explains why
-- it declined. Every refusal is a named reason rather than a silent null, so the
-- interface can say "not enough evidence yet" and mean it.
create function public.twin_predict_scenario(p_scenario_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_player_id     uuid := (select auth.uid());
  v_total         integer;
  v_since_last    integer;
  v_open          public.twin_predictions;
  v_pattern       record;
begin
  if v_player_id is null then
    return jsonb_build_object('eligible', false, 'reason', 'unauthenticated');
  end if;

  -- Re-entrancy: the same scenario asked twice returns the prediction already
  -- on record rather than minting a second one. A page refresh must not let a
  -- player reroll the Twin until it says something flattering.
  select * into v_open
  from public.twin_predictions
  where player_id = v_player_id and scenario_id = p_scenario_id and attempt_id is null
  order by created_at desc
  limit 1;

  if found then
    return jsonb_build_object(
      'eligible', true,
      'prediction_id', v_open.id,
      'predicted_catch', v_open.predicted_catch,
      'context_kind', v_open.context_kind,
      'context_label', v_open.context_label,
      'sample_size', v_open.sample_size,
      'observed_rate', v_open.observed_rate
    );
  end if;

  select count(*)::integer into v_total
  from public.attempts where player_id = v_player_id;

  if v_total < public.twin_min_total_attempts() then
    return jsonb_build_object(
      'eligible', false,
      'reason', 'insufficient_history',
      'attempts', v_total,
      'required', public.twin_min_total_attempts()
    );
  end if;

  -- Cadence. Counts decisions recorded since the last prediction was *made*,
  -- so the Twin speaks occasionally regardless of how the player is playing.
  select count(*)::integer into v_since_last
  from public.attempts a
  where a.player_id = v_player_id
    and a.completed_at > coalesce(
      (select max(tp.created_at) from public.twin_predictions tp where tp.player_id = v_player_id),
      '-infinity'::timestamptz
    );

  if exists (select 1 from public.twin_predictions where player_id = v_player_id)
     and v_since_last < public.twin_cooldown_attempts() then
    return jsonb_build_object(
      'eligible', false,
      'reason', 'cooldown',
      'since_last', v_since_last,
      'required', public.twin_cooldown_attempts()
    );
  end if;

  -- The strongest pattern among the contexts this scenario actually belongs to.
  -- A prediction may only rest on evidence relevant to the situation in front of
  -- the player; the Twin does not borrow a finding from an unrelated context.
  select p.* into v_pattern
  from public.twin_patterns(v_player_id) p
  where (
      p.context_kind = 'pack'
      and p.context_label in (
        select sp.name from public.scenario_pack_items spi
        join public.scenario_packs sp on sp.id = spi.pack_id
        where spi.scenario_id = p_scenario_id
      )
    )
    or (
      p.context_kind = 'category'
      and p.context_label in (
        select c.name from public.scenarios s
        join public.categories c on c.id = s.category_id
        where s.id = p_scenario_id
      )
    )
  order by p.edge desc, p.sample_size desc
  limit 1;

  if not found then
    return jsonb_build_object('eligible', false, 'reason', 'no_pattern');
  end if;

  insert into public.twin_predictions (
    player_id, scenario_id, predicted_catch, context_kind, context_label,
    sample_size, observed_rate
  )
  values (
    v_player_id, p_scenario_id, v_pattern.predicts_catch, v_pattern.context_kind,
    v_pattern.context_label, v_pattern.sample_size, v_pattern.observed_rate
  )
  returning * into v_open;

  return jsonb_build_object(
    'eligible', true,
    'prediction_id', v_open.id,
    'predicted_catch', v_open.predicted_catch,
    'context_kind', v_open.context_kind,
    'context_label', v_open.context_label,
    'sample_size', v_open.sample_size,
    'observed_rate', v_open.observed_rate
  );
end;
$$;

comment on function public.twin_predict_scenario(uuid) is
  'Mints a prediction for a scenario, or returns a named reason for declining. '
  'The player is derived from auth.uid() and never accepted from the caller.';

-- ============================================================================
-- SECTION E — resolving a prediction
-- ============================================================================
-- Attaches an attempt to the open prediction for that scenario and grades it.
-- Internal: invoked from inside the award transaction so resolution cannot be
-- skipped. A client that could choose when to resolve could quietly drop the
-- Twin's misses and inflate its accuracy.
create function public.resolve_twin_prediction(p_player_id uuid, p_attempt_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_scenario_id uuid;
  v_caught      boolean;
  v_row         public.twin_predictions;
begin
  select a.scenario_id, o.is_correct
  into v_scenario_id, v_caught
  from public.attempts a
  join public.outcomes o on o.id = a.outcome_id
  where a.id = p_attempt_id and a.player_id = p_player_id;

  if not found then
    return null;
  end if;

  -- Already resolved by an earlier award for this attempt: return what was
  -- recorded rather than regrading. Idempotent, like every other award step.
  select * into v_row
  from public.twin_predictions
  where player_id = p_player_id and attempt_id = p_attempt_id;

  if not found then
    update public.twin_predictions
    set attempt_id   = p_attempt_id,
        actual_catch = v_caught,
        was_correct  = (predicted_catch = v_caught),
        resolved_at  = now()
    where id = (
      select id from public.twin_predictions
      where player_id = p_player_id
        and scenario_id = v_scenario_id
        and attempt_id is null
      order by created_at desc
      limit 1
    )
    returning * into v_row;
  end if;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'prediction_id', v_row.id,
    'predicted_catch', v_row.predicted_catch,
    'actual_catch', v_row.actual_catch,
    'was_correct', v_row.was_correct,
    'context_kind', v_row.context_kind,
    'context_label', v_row.context_label,
    'sample_size', v_row.sample_size,
    'observed_rate', v_row.observed_rate
  );
end;
$$;

-- ============================================================================
-- SECTION F — the Twin, as the Archive sees it
-- ============================================================================
-- Everything the Archive needs in one read: whether the Twin is awake, what it
-- has observed, and how often it has been right.
--
-- `status` is the honesty gate. Below the evidence floor it is 'sealed' with a
-- reason, and there are no patterns to render — an interface cannot accidentally
-- display a claim that does not exist.
create function public.twin_state(p_player_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_total     integer;
  v_patterns  jsonb;
  v_resolved  integer;
  v_correct   integer;
  v_recent    jsonb;
begin
  -- The player is passed rather than derived here because the Archive reads it
  -- alongside its other rollups, all of which are RLS-scoped anyway. Guard it
  -- so one player can never read another's Twin.
  if p_player_id is distinct from (select auth.uid()) then
    return jsonb_build_object('status', 'sealed', 'reason', 'forbidden');
  end if;

  select count(*)::integer into v_total
  from public.attempts where player_id = p_player_id;

  if v_total < public.twin_min_total_attempts() then
    return jsonb_build_object(
      'status', 'sealed',
      'reason', 'insufficient_history',
      'attempts', v_total,
      'required', public.twin_min_total_attempts()
    );
  end if;

  select coalesce(jsonb_agg(to_jsonb(p) order by p.edge desc, p.sample_size desc), '[]'::jsonb)
  into v_patterns
  from public.twin_patterns(p_player_id) p;

  select
    count(*) filter (where was_correct is not null)::integer,
    count(*) filter (where was_correct)::integer
  into v_resolved, v_correct
  from public.twin_predictions
  where player_id = p_player_id;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.resolved_at desc), '[]'::jsonb)
  into v_recent
  from (
    select id, context_kind, context_label, predicted_catch, actual_catch,
           was_correct, sample_size, observed_rate, resolved_at
    from public.twin_predictions
    where player_id = p_player_id and was_correct is not null
    order by resolved_at desc
    limit 5
  ) r;

  return jsonb_build_object(
    'status', case when jsonb_array_length(v_patterns) = 0 then 'watching' else 'observing' end,
    'attempts', v_total,
    'patterns', v_patterns,
    'predictions_resolved', v_resolved,
    'predictions_correct', v_correct,
    'recent', v_recent
  );
end;
$$;

comment on function public.twin_state(uuid) is
  'The Archive''s view of the Twin. sealed = not enough history to speak; '
  'watching = enough history but no lopsided context yet; observing = has patterns.';

-- ============================================================================
-- SECTION G — resolution inside the award transaction
-- ============================================================================
-- `award_attempt_xp` is replaced (not supplemented) so that Twin resolution
-- happens in the same transaction as the rest of the pipeline — the identical
-- move 7.2, 7.3 and 8.1 each made. Pipeline is now:
--
--   attempt → XP → progress → mastery → achievements → streak → TWIN → rollup
--
-- The payload gains a `twin` key and nothing else changes. `award_reflection_xp`
-- is deliberately untouched: a reflection is not a decision, so it cannot
-- resolve a prediction about one.
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
  v_twin           jsonb;
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

  -- The Twin grades itself here, inside the same transaction and under the same
  -- per-player advisory lock. Null when no prediction was open for this
  -- scenario, which is the ordinary case.
  v_twin := public.resolve_twin_prediction(v_player_id, p_attempt_id);

  v_session_xp := public.refresh_session_rollups(v_attempt.session_id);

  return public.progression_snapshot(
    v_progress, v_session_xp, v_amount, v_awarded_now, v_previous_level
  )
  || jsonb_build_object('mastery', v_mastery)
  || jsonb_build_object('achievements', v_achievements)
  || jsonb_build_object('streak', v_streak)
  || jsonb_build_object('twin', v_twin);
end;
$$;

-- ============================================================================
-- SECTION H — grants
-- ============================================================================
revoke all on function public.twin_min_total_attempts()                 from public;
revoke all on function public.twin_min_context_sample()                 from public;
revoke all on function public.twin_min_edge()                           from public;
revoke all on function public.twin_cooldown_attempts()                  from public;
revoke all on function public.twin_attempt_facts(uuid)                  from public;
revoke all on function public.twin_patterns(uuid)                       from public;
revoke all on function public.twin_predict_scenario(uuid)               from public;
revoke all on function public.resolve_twin_prediction(uuid, uuid)       from public;
revoke all on function public.twin_state(uuid)                          from public;

-- Only the two the client legitimately calls. The evidence functions stay
-- internal: they take a player id as an argument, and nothing reachable from a
-- browser should accept one.
grant execute on function public.twin_predict_scenario(uuid) to authenticated;
grant execute on function public.twin_state(uuid)            to authenticated;
