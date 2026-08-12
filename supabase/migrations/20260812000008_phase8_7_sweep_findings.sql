-- ============================================================================
-- Phase 8.7 — two findings from the privilege sweep
-- ============================================================================
-- The sweep in `tests/integration/privilege-sweep.test.ts` enumerates every
-- function the schema exposes and requires each to be classified. On its first
-- run it found two things that four phases of hand-written tests had not.
--
-- ── 1. `bias_mastery_rate` was reachable ────────────────────────────────────
-- Phase 7.2 revoked it from PUBLIC but not from `anon`/`authenticated`, so it
-- executed for any signed-in caller. It takes no player id and touches no player
-- data, so nothing leaked *about anyone* — but it is the mastery model's tuning
-- surface, and every coefficient in the curve was readable by probing it. It is
-- internal by intent and is now internal in fact.
--
-- ── 2. `submit_attempt` refused with a privilege error code ─────────────────
-- Its "this session is not yours" branch raised SQLSTATE 42501
-- (insufficient_privilege). Semantically defensible, and wrong in practice: it
-- made an ordinary business refusal indistinguishable from "this role lacks
-- EXECUTE". Any sweep that reads 42501 as proof of a locked-down function would
-- read a working, reachable function as locked down — a false negative in
-- exactly the check that exists to prevent false negatives.
--
-- Application refusals now raise the default P0001. Privilege codes are reserved
-- for actual privilege failures, so the sweep can tell the two apart.
-- ============================================================================

-- ============================================================================
-- SECTION A — bias_mastery_rate becomes internal
-- ============================================================================
-- All three roles, per §12.4b: PostgreSQL grants EXECUTE to PUBLIC by default
-- and Supabase adds explicit grants to anon and authenticated.
revoke all on function public.bias_mastery_rate(boolean, boolean, boolean, boolean, numeric)
  from public, anon, authenticated;

comment on function public.bias_mastery_rate(boolean, boolean, boolean, boolean, numeric) is
  'The single tuning surface for mastery growth. Internal — not callable from a '
  'browser (Phase 8.7). Every coefficient in the curve lives here.';

-- ============================================================================
-- SECTION B — submit_attempt stops borrowing a privilege error code
-- ============================================================================
-- Identical to 20260812000006 apart from the two `raise` statements. Repeated in
-- full rather than patched, because `create or replace` is the only way to
-- change a body and a partial copy would be a worse thing to read later.
create or replace function public.submit_attempt(
  p_session_id       uuid,
  p_scenario_id      uuid,
  p_choice_id        uuid,
  p_response_time_ms integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_player_id uuid := (select auth.uid());
  v_choice    record;
  v_attempt   public.attempts;
begin
  if v_player_id is null then
    raise exception 'Not authenticated';
  end if;

  -- P0001, not 42501. This is the application declining, not the database.
  if not exists (
    select 1 from public.sessions
    where id = p_session_id and player_id = v_player_id
  ) then
    raise exception 'Session % is not yours', p_session_id;
  end if;

  /*
   * The choice must belong to the scenario being answered, and the scenario must
   * be published. Without the first check a player could answer scenario A with
   * a choice from scenario B — which would sail past every downstream system,
   * since mastery reads the scenario and XP reads the outcome.
   */
  select sc.id, sc.scenario_id, o.id as outcome_id, o.is_correct,
         o.result_text, o.explanation, o.xp_reward
    into v_choice
  from public.scenario_choices sc
  join public.outcomes  o on o.choice_id = sc.id and o.deleted_at is null
  join public.scenarios s on s.id = sc.scenario_id
  where sc.id = p_choice_id
    and sc.scenario_id = p_scenario_id
    and sc.deleted_at is null
    and s.deleted_at is null
    and s.status = 'published'::public.content_status;

  if not found then
    raise exception 'Choice % is not answerable for scenario %', p_choice_id, p_scenario_id;
  end if;

  -- Idempotent per scenario per session: a double-submit returns the recorded
  -- decision rather than writing a second one. Attempts are immutable, so the
  -- first answer stands (ProjectStatus §12.9).
  select * into v_attempt
  from public.attempts
  where player_id = v_player_id
    and session_id = p_session_id
    and scenario_id = p_scenario_id
  order by completed_at asc
  limit 1;

  if not found then
    insert into public.attempts (
      player_id, session_id, scenario_id, selected_choice_id, outcome_id, response_time_ms
    )
    values (
      v_player_id, p_session_id, p_scenario_id, p_choice_id, v_choice.outcome_id,
      greatest(0, coalesce(p_response_time_ms, 0))
    )
    returning * into v_attempt;
  else
    -- Re-read the stored outcome: the reveal must describe the decision on
    -- record, not the one just re-submitted.
    select o.id, o.is_correct, o.result_text, o.explanation, o.xp_reward
      into v_choice.outcome_id, v_choice.is_correct, v_choice.result_text,
           v_choice.explanation, v_choice.xp_reward
    from public.outcomes o
    where o.id = v_attempt.outcome_id;
  end if;

  return jsonb_build_object(
    'attempt_id',         v_attempt.id,
    'selected_choice_id', v_attempt.selected_choice_id,
    'outcome', jsonb_build_object(
      'id',          v_choice.outcome_id,
      'is_correct',  v_choice.is_correct,
      'result_text', v_choice.result_text,
      'explanation', v_choice.explanation,
      'xp_reward',   v_choice.xp_reward
    )
  );
end;
$$;

-- `create or replace` re-triggers Supabase's default grants, so the privileges
-- are restated. Revoke all three roles, then grant back the one entry point.
revoke all on function public.submit_attempt(uuid, uuid, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.submit_attempt(uuid, uuid, uuid, integer) to authenticated;
