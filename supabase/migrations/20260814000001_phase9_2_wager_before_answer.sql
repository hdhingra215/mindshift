-- ============================================================================
-- Phase 9.2 — conviction before the answer
-- ============================================================================
-- ── What changes ────────────────────────────────────────────────────────────
-- The stake now comes *first*. A player who can afford a tier must have locked
-- one before `submit_attempt` will record their decision.
--
-- Phase 8.5 built the wager so that it *could* precede the attempt — keyed on
-- (session, scenario) rather than on attempt_id, precisely so the row provably
-- exists before the answer does. What it never did was *require* it. The panel
-- opened only after a choice was selected and the copy said "answer without one —
-- skipping costs nothing", so in practice the wager was optional and usually
-- skipped. This migration is the enforcement half of reversing that order.
--
-- ── Why this cannot live in the client ──────────────────────────────────────
-- A disabled radio group is a courtesy. `submit_attempt` is a granted RPC any
-- signed-in player can call directly with any arguments, so an interface-only
-- rule would be bypassed by one `supabase.rpc()` call — and the thing bypassed
-- is the measurement the mechanic exists to take. Conviction means nothing if
-- the stake can be chosen after the answer is known, and it means nothing if the
-- stake can be skipped whenever it looks likely to cost something.
--
-- ── Insight, not XP ─────────────────────────────────────────────────────────
-- Nothing here touches XP. XP stays lifetime and monotonic and `current_level`
-- stays derived from it, because a wager that could subtract XP could de-level a
-- player and §12.20 forbids punishing a wrong answer. The wagered quantity is
-- Insight, exactly as 8.5 defined it. No tier, payout, balance formula or
-- constant is altered by this file — only *when* a stake must exist.
--
-- ── The affordability rule, and the band it protects ────────────────────────
-- A stake is required exactly when the reserve can cover one. Below the smallest
-- tier the answer proceeds unwagered: that covers an empty reserve *and* the
-- 1-to-9 band above it, which a naive "balance > 0" rule would strand with a
-- mandatory wager it cannot afford. Being poor at Insight may not stop someone
-- playing the game — the recognition award is the way back up, and it is only
-- earned by answering.
--
-- ── Order of operations inside the function ─────────────────────────────────
-- The existing-attempt lookup happens BEFORE the gate. Attempts are immutable
-- and `submit_attempt` is idempotent per (player, session, scenario); a re-submit
-- returns the recorded decision. Attempts recorded under the old flow have no
-- wager row, so a gate placed ahead of that lookup would start refusing to
-- re-read historical attempts — turning a replay into an error. The gate
-- therefore guards only the creation of a *new* attempt.
--
-- ── Locking ─────────────────────────────────────────────────────────────────
-- Takes the same per-player advisory lock as `place_wager` and
-- `award_attempt_xp`, so the balance this function reads cannot move under it
-- while a wager is being placed in another tab. It also closes a pre-existing
-- race that had nothing to do with wagers: `attempts` has no unique constraint on
-- (player, session, scenario), so the select-then-insert could previously admit
-- two concurrent submissions for one scenario. Serialising per player makes the
-- idempotency check mean what it claims.
--
-- No schema change, no new function, no RLS change, and the signature is
-- untouched — so the privilege surface the sweep enumerates is identical.
-- ============================================================================

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
  v_balance   integer;
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
   * Serialise per player. The wager gate below reads the Insight balance, and
   * `place_wager` takes this same lock before writing one — without it a stake
   * locked in another tab could land between this function's gate check and its
   * insert. It also makes the idempotency check honest: `attempts` carries no
   * unique constraint on (player, session, scenario), so two concurrent
   * submissions could otherwise both miss the lookup and both insert.
   */
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_player_id::text, 0::bigint)
  );

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
  --
  -- Deliberately ahead of the wager gate: an attempt recorded before this
  -- migration has no wager row, and re-reading it must not become an error.
  select * into v_attempt
  from public.attempts
  where player_id = v_player_id
    and session_id = p_session_id
    and scenario_id = p_scenario_id
  order by completed_at asc
  limit 1;

  if not found then
    /*
     * ── The ordering gate ────────────────────────────────────────────────────
     * A new decision, so the stake must already be on the table. Required only
     * when the reserve can cover one of the defined tiers; below the smallest
     * tier the answer proceeds unwagered and the player is never stuck.
     *
     * Expressed as "is any tier affordable" rather than "balance >= 10" so the
     * rule keeps holding if the tier list is ever retuned — there is exactly one
     * definition of a tier and it lives in `insight_wager_tiers()`.
     */
    if not exists (
      select 1
      from public.attempt_wagers w
      where w.player_id   = v_player_id
        and w.session_id  = p_session_id
        and w.scenario_id = p_scenario_id
    ) then
      v_balance := public.insight_balance(v_player_id);

      if exists (
        select 1 from unnest(public.insight_wager_tiers()) tier where tier <= v_balance
      ) then
        raise exception
          'A wager is required before answering scenario %', p_scenario_id;
      end if;
    end if;

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

comment on function public.submit_attempt(uuid, uuid, uuid, integer) is
  'Records one decision and returns its reveal. Derives the outcome from the '
  'chosen choice server-side. Requires a locked Insight wager first whenever the '
  'player can afford a tier; below the smallest tier the answer proceeds '
  'unwagered. Idempotent per (player, session, scenario).';

-- ============================================================================
-- Privileges — restated, not assumed
-- ============================================================================
-- ⚠ `create or replace` re-triggers Supabase's default grants, which hand
-- EXECUTE to `anon` and `authenticated` on every function. Revoking from the
-- PUBLIC pseudo-role alone leaves those in place — the defect that shipped twice
-- (ProjectStatus §12.4b and the 8.5 repeat). All three roles are revoked, then
-- the single entry point is granted back. Identical to the privileges this
-- function already had; restated so replacing the body cannot widen them.
revoke all on function public.submit_attempt(uuid, uuid, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.submit_attempt(uuid, uuid, uuid, integer) to authenticated;
