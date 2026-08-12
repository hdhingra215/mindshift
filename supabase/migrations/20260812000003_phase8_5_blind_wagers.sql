-- ============================================================================
-- Phase 8.5 — Blind Wagers
-- ============================================================================
-- Confidence, made consequential.
--
-- The player already answers "how sure are you?" as a slider on the reflection
-- panel. That number costs nothing, so it measures a feeling. A wager measures
-- a *commitment*: the same belief, with something staked on it. The two are kept
-- separate on purpose (see §CONVICTION below) because together they say more
-- than either alone.
--
-- ── Insight is not XP, and that is the load-bearing decision ────────────────
-- XP is a lifetime, monotonic record of activity, and `progress.current_level`
-- is derived from it. If a lost wager subtracted XP a player could *de-level* —
-- which would punish a wrong answer, and this product does not do that
-- (ProjectStatus §12.20: "a wrong answer is a discovery, never a verdict").
--
-- Insight is therefore its own quantity: earned by play, spent only on
-- conviction, never convertible to XP and never bought. It has no real-world
-- value and cannot be purchased, transferred or withdrawn. Nothing in this
-- schema permits an Insight movement that did not come from a recorded decision.
--
-- ── Why the balance is derived rather than stored ───────────────────────────
-- Same contract as `progress`, `bias_mastery` and `streaks`: a stored counter
-- drifts, a derived one self-heals. Balance is a pure function of history:
--
--   balance = starting_grant
--           + recognition_award × (correct decisions)
--           + Σ delta over resolved wagers
--
-- No ledger table is needed because every term is already recorded. And because
-- a stake can never exceed the balance at lock time, and the only negative term
-- is bounded by that stake, **the balance is provably never negative.**
--
-- ── Symmetric, even-money, and deliberately so ──────────────────────────────
-- Correct returns +stake, incorrect −stake. Not a multiplier, not a rake.
-- Even money is the payout under which the best strategy is to stake big exactly
-- when you are genuinely more likely than not to be right — i.e. it rewards
-- *calibration* rather than nerve. A 2× payout would reward reckless betting; a
-- rake would tax participation. The mechanic only works if the incentive is to
-- be honest with yourself.
--
-- ── Not gambling ────────────────────────────────────────────────────────────
-- There is no random element anywhere in this file. The outcome is decided
-- entirely by the player's own answer against authored content. The player is
-- backing their own judgement, not a draw.
--
-- One table, functions, and one replacement of `award_attempt_xp` to add the
-- resolution step — the same move 7.2, 7.3, 8.1 and 8.4 each made.
-- ============================================================================

-- ============================================================================
-- SECTION A — the economy's four numbers
-- ============================================================================
-- Functions rather than inlined literals so the client, the resolver and the
-- tests all read one value, and tuning happens in one place. Same pattern as
-- the Twin's thresholds (§4.6).

-- Enough for one maximum-conviction wager, or several careful ones. Small
-- enough that losing it takes real over-confidence rather than bad luck.
create function public.insight_starting_balance()
returns integer language sql immutable set search_path = '' as $$ select 50 $$;

-- Earned for every correct decision, wagered or not. This is the recovery path:
-- a player at zero keeps playing and rebuilds by being right, so the floor is
-- never a wall and never needs a hand-out.
create function public.insight_recognition_award()
returns integer language sql immutable set search_path = '' as $$ select 5 $$;

-- The three stakes. Three is enough to express "hunch / confident / certain"
-- and few enough to choose without deliberating over the interface.
create function public.insight_wager_tiers()
returns integer[] language sql immutable set search_path = '' as $$ select array[10, 25, 50] $$;

comment on function public.insight_recognition_award() is
  'Insight earned per correct decision, independent of wagering. The recovery '
  'path for a player at zero — rebuilt by playing well, never granted.';

-- ============================================================================
-- SECTION B — the wager record
-- ============================================================================
-- ── Why this is keyed on (session, scenario) and not on the attempt ─────────
-- A wager must be locked *before* the decision is recorded. An `attempts` row
-- already carries the chosen option, so a wager keyed on `attempt_id` could only
-- be created after the outcome was settled — the player (or a scripted client)
-- could insert the attempt, read the result, and only then decide what to stake.
--
-- Keying on the session and scenario means the row provably exists before the
-- attempt does. `attempt_id` is filled in at resolution and is unique, so one
-- attempt can never resolve two wagers.
--
-- ⚠ This does not make the wager unguessable. `fetchNextScenario` already ships
-- `outcomes.is_correct` for every choice, so a client can know the right answer
-- before the player chooses. That is pre-existing (the reveal needs the data)
-- and it is recorded as debt — the fix is to withhold outcome rows until the
-- attempt is submitted. Insight has no value outside the game, so the only thing
-- an exploiter corrupts is their own calibration record.
create table public.attempt_wagers (
  id             uuid        primary key default gen_random_uuid(),
  player_id      uuid        not null references public.profiles (id)  on delete cascade,
  session_id     uuid        not null references public.sessions (id)  on delete cascade,
  scenario_id    uuid        not null references public.scenarios (id) on delete cascade,

  -- What was staked, and what the balance was when it was staked. Storing the
  -- balance makes every historical wager auditable without replaying the ledger.
  stake          integer     not null check (stake > 0),
  balance_before integer     not null check (balance_before >= 0),

  -- Resolution. All four move together or none of them do.
  attempt_id     uuid        unique references public.attempts (id) on delete cascade,
  was_correct    boolean,
  delta          integer,
  resolved_at    timestamptz,

  created_at     timestamptz not null default now(),

  -- One wager per scenario per session. The lifecycle is read from this row:
  -- absent = unwagered · present with attempt_id null = locked · otherwise resolved.
  constraint attempt_wagers_one_per_scenario_uk unique (player_id, session_id, scenario_id),

  constraint attempt_wagers_resolution_ck check (
    (attempt_id is null and was_correct is null and delta is null and resolved_at is null)
    or
    (attempt_id is not null and was_correct is not null and delta is not null and resolved_at is not null)
  ),

  -- A resolved wager pays exactly ±stake. Encoded as a constraint so no future
  -- function can invent a different payout without this failing loudly.
  constraint attempt_wagers_even_money_ck check (
    delta is null or delta = (case when was_correct then stake else -stake end)
  ),

  -- Never stake what you do not have. This is the constraint that makes a
  -- negative balance unreachable.
  constraint attempt_wagers_affordable_ck check (stake <= balance_before)
);

create index attempt_wagers_player_created_idx
  on public.attempt_wagers (player_id, created_at desc);

-- The balance calculation and the "is there a live wager" lookup both use this.
create index attempt_wagers_open_idx
  on public.attempt_wagers (player_id, session_id, scenario_id)
  where attempt_id is null;

alter table public.attempt_wagers enable row level security;

-- Read-only to the player, exactly like every other progression record. No
-- insert and no update policy: a client that could write this table could
-- stake nothing and collect, or grade its own wager.
create policy attempt_wagers_select_own on public.attempt_wagers
  for select to authenticated using (player_id = (select auth.uid()));

comment on table public.attempt_wagers is
  'Blind Wagers — a stake locked before the decision is recorded and resolved '
  'from the authored outcome. Player-readable, never player-writable. Insight '
  'has no real-world value and cannot be purchased or withdrawn.';

-- ============================================================================
-- SECTION C — the balance
-- ============================================================================
-- Derived from history on every read. Internal: it takes a player id, so
-- nothing reachable from a browser may call it (§12.4b).
create function public.insight_balance(p_player_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(
    0,
    public.insight_starting_balance()
    + public.insight_recognition_award() * (
        select count(*)
        from public.attempts a
        join public.outcomes o on o.id = a.outcome_id
        where a.player_id = p_player_id and o.is_correct
      )
    + coalesce((
        select sum(w.delta)
        from public.attempt_wagers w
        where w.player_id = p_player_id and w.delta is not null
      ), 0)
  )::integer;
$$;

comment on function public.insight_balance(uuid) is
  'Insight = starting grant + recognition awards + resolved wager deltas. '
  'Derived, never incremented. The greatest(0, …) is belt-and-braces — the '
  'affordability constraint already makes a negative balance unreachable.';

-- What the client needs to draw the wager panel: the balance, and which stakes
-- it can actually afford. Player derived from auth.uid(), never accepted.
create function public.insight_wallet()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_player_id uuid := (select auth.uid());
  v_balance   integer;
begin
  if v_player_id is null then
    raise exception 'Not authenticated';
  end if;

  v_balance := public.insight_balance(v_player_id);

  return jsonb_build_object(
    'balance', v_balance,
    'tiers',   public.insight_wager_tiers(),
    -- Sent explicitly rather than left for the client to filter, so "what can I
    -- stake" has exactly one answer and it is the server's.
    'affordable', coalesce((
      select jsonb_agg(tier order by tier)
      from unnest(public.insight_wager_tiers()) tier
      where tier <= v_balance
    ), '[]'::jsonb),
    'recognition_award', public.insight_recognition_award()
  );
end;
$$;

-- ============================================================================
-- SECTION D — locking a wager
-- ============================================================================
-- Called before the attempt is submitted. Validates the stake against the tier
-- list and the live balance, then writes the row. Everything it needs is derived
-- server-side; the only thing the caller supplies is which of three amounts.
create function public.place_wager(
  p_session_id  uuid,
  p_scenario_id uuid,
  p_stake       integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_player_id uuid := (select auth.uid());
  v_balance   integer;
  v_row       public.attempt_wagers;
begin
  if v_player_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Serialise per player, so two tabs cannot both pass the affordability check
  -- against the same balance and overdraw it. Same lock the award pipeline takes.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_player_id::text, 0::bigint)
  );

  if not exists (
    select 1 from public.sessions
    where id = p_session_id and player_id = v_player_id
  ) then
    return jsonb_build_object('accepted', false, 'reason', 'not_your_session');
  end if;

  -- Re-entrancy: a refresh returns the wager already locked rather than
  -- replacing it. A player must not be able to restake after seeing anything.
  select * into v_row
  from public.attempt_wagers
  where player_id = v_player_id
    and session_id = p_session_id
    and scenario_id = p_scenario_id;

  if found then
    return jsonb_build_object(
      'accepted', v_row.resolved_at is null,
      'reason',   case when v_row.resolved_at is null then 'already_locked' else 'already_resolved' end,
      'wager_id', v_row.id,
      'stake',    v_row.stake,
      'balance',  public.insight_balance(v_player_id)
    );
  end if;

  if not (p_stake = any (public.insight_wager_tiers())) then
    return jsonb_build_object('accepted', false, 'reason', 'invalid_stake');
  end if;

  v_balance := public.insight_balance(v_player_id);

  if p_stake > v_balance then
    return jsonb_build_object(
      'accepted', false, 'reason', 'insufficient_balance', 'balance', v_balance
    );
  end if;

  insert into public.attempt_wagers (player_id, session_id, scenario_id, stake, balance_before)
  values (v_player_id, p_session_id, p_scenario_id, p_stake, v_balance)
  returning * into v_row;

  return jsonb_build_object(
    'accepted', true,
    'wager_id', v_row.id,
    'stake',    v_row.stake,
    'balance',  v_balance
  );
end;
$$;

comment on function public.place_wager(uuid, uuid, integer) is
  'Locks a stake before the decision is recorded. Validates tier, ownership and '
  'affordability server-side; the caller supplies only the amount.';

-- ============================================================================
-- SECTION E — resolving a wager
-- ============================================================================
-- Internal, invoked inside the award transaction so resolution cannot be skipped
-- or replayed by the client. Idempotent: a second award for the same attempt
-- returns what was already recorded rather than paying twice.
create function public.resolve_attempt_wager(p_player_id uuid, p_attempt_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_attempt record;
  v_row     public.attempt_wagers;
begin
  select a.id, a.session_id, a.scenario_id, o.is_correct
  into v_attempt
  from public.attempts a
  join public.outcomes o on o.id = a.outcome_id
  where a.id = p_attempt_id and a.player_id = p_player_id;

  if not found then
    return null;
  end if;

  -- Already resolved by an earlier award for this attempt.
  select * into v_row
  from public.attempt_wagers
  where player_id = p_player_id and attempt_id = p_attempt_id;

  if not found then
    update public.attempt_wagers
    set attempt_id  = p_attempt_id,
        was_correct = v_attempt.is_correct,
        delta       = case when v_attempt.is_correct then stake else -stake end,
        resolved_at = now()
    where player_id = p_player_id
      and session_id = v_attempt.session_id
      and scenario_id = v_attempt.scenario_id
      and attempt_id is null
    returning * into v_row;
  end if;

  if v_row.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'wager_id',        v_row.id,
    'stake',           v_row.stake,
    'was_correct',     v_row.was_correct,
    'delta',           v_row.delta,
    'balance_before',  v_row.balance_before,
    'balance_after',   public.insight_balance(p_player_id)
  );
end;
$$;

-- ============================================================================
-- SECTION F — resolution inside the award transaction
-- ============================================================================
-- ── Where this sits, and why ────────────────────────────────────────────────
-- The wager resolves **first**, immediately after the attempt is validated and
-- before any XP is recorded. It is the last part of the player's *decision*
-- rather than a part of the reward: the stake was committed before the answer,
-- and settling it first keeps the causal story straight — decision, then
-- consequence, then reward.
--
-- It also has no dependencies in either direction. Insight is not XP, so nothing
-- downstream reads it and it reads nothing downstream. Ordering is therefore a
-- readability choice, and this is the readable one.
--
-- Pipeline: attempt → WAGER → XP → progress → mastery → achievements → streak
--           → twin → session rollup → snapshot
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
  v_wager          jsonb;
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

  -- The player's own stake, settled before anything is handed to them.
  v_wager := public.resolve_attempt_wager(v_player_id, p_attempt_id);

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

  v_twin := public.resolve_twin_prediction(v_player_id, p_attempt_id);

  v_session_xp := public.refresh_session_rollups(v_attempt.session_id);

  return public.progression_snapshot(
    v_progress, v_session_xp, v_amount, v_awarded_now, v_previous_level
  )
  || jsonb_build_object('mastery', v_mastery)
  || jsonb_build_object('achievements', v_achievements)
  || jsonb_build_object('streak', v_streak)
  || jsonb_build_object('twin', v_twin)
  || jsonb_build_object('wager', v_wager)
  -- Always present, wagered or not: the panel for the *next* scenario needs the
  -- new balance, and a second round trip for one integer would be waste.
  || jsonb_build_object('insight_balance', public.insight_balance(v_player_id));
end;
$$;

-- ============================================================================
-- SECTION G — privileges
-- ============================================================================
-- ⚠ `revoke … from public` is NOT sufficient. Supabase's default privileges
-- grant EXECUTE on every new function to `anon` and `authenticated` explicitly,
-- and revoking from the PUBLIC pseudo-role leaves those untouched. That is the
-- Phase 8.4 defect (ProjectStatus §12.4b) and this section exists to not repeat
-- it. Every function above is revoked from both roles, then the two the client
-- genuinely needs are granted back.
revoke all on function public.insight_balance(uuid)                      from anon, authenticated;
revoke all on function public.resolve_attempt_wager(uuid, uuid)          from anon, authenticated;
revoke all on function public.insight_starting_balance()                 from anon, authenticated;
revoke all on function public.insight_recognition_award()                from anon, authenticated;
revoke all on function public.insight_wager_tiers()                      from anon, authenticated;
revoke all on function public.insight_wallet()                           from anon, authenticated;
revoke all on function public.place_wager(uuid, uuid, integer)           from anon, authenticated;

-- The reachable surface. Both derive the player from auth.uid() and accept no
-- player id; `insight_wallet` is read-only and `place_wager` validates the stake,
-- the ownership and the balance server-side.
grant execute on function public.insight_wallet()                        to authenticated;
grant execute on function public.place_wager(uuid, uuid, integer)        to authenticated;

-- The three constants carry no player data and the interface reads them to
-- explain the economy honestly rather than hardcoding it in two places.
grant execute on function public.insight_starting_balance()              to authenticated;
grant execute on function public.insight_recognition_award()             to authenticated;
grant execute on function public.insight_wager_tiers()                   to authenticated;
