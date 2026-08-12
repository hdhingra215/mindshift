-- ============================================================================
-- Phase 8.6 — the decision/reveal boundary
-- ============================================================================
-- ── The defect ──────────────────────────────────────────────────────────────
-- `fetchNextScenario` shipped the whole answer key with the question. Five
-- separate tells were readable before the player chose:
--
--   outcomes.is_correct     the answer, literally
--   outcomes.xp_reward      20 for the right call, 5 for a miss
--   outcomes.result_text    "you caught it" / "it got you"
--   outcomes.explanation    the teaching, which names the trap
--   scenario_choices.is_trap    the answer, again
--   scenario_choices.bias_id    non-null only on trap choices — the answer, a third time
--
-- And removing them from the select string would have fixed nothing:
-- `outcomes_read_authenticated` and `scenario_choices_read_authenticated` let
-- any signed-in player read both tables directly. The RLS migration says so in
-- its own comment — the "outcomes reveal the answer" gate was deferred to "the
-- attempt/content edge layer, which is the intended gate". That layer is this
-- migration.
--
-- Harmless while nothing was staked on it. Phase 8.5 put Insight on the line, so
-- a scripted client could win every wager and the conviction measurement — the
-- entire point of the mechanic — became meaningless.
--
-- ── The shape of the fix ────────────────────────────────────────────────────
-- Correctness stops being something the client is *told* and becomes something
-- the server *decides*:
--
--   1. Column privileges hide `is_trap` and `bias_id` on `scenario_choices`.
--   2. `outcomes` become readable only for a scenario the player has attempted.
--   3. Attempts can no longer be inserted directly. `submit_attempt` derives the
--      outcome from the chosen choice and returns the reveal in the same call.
--
-- (3) is the load-bearing one. While the client supplied `outcome_id`, nothing
-- stopped it recording a trap choice against the *correct* outcome and
-- collecting the XP, the mastery and the wager for it. The column is now
-- derived server-side from `selected_choice_id` and the client cannot name it.
--
-- No change to the award pipeline: XP → mastery → achievements → streak → twin →
-- wager all run exactly as before, from an attempt row that is now trustworthy.
-- ============================================================================

-- ============================================================================
-- SECTION A — hide the tells on scenario_choices
-- ============================================================================
-- RLS is row-level; these two leaks are column-level, so column privileges are
-- the right instrument. Everything a player needs to *answer* stays readable —
-- the label, the body, the ordering — and the two columns that give the game
-- away do not.
--
-- `bias_id` matters as much as `is_trap`: it is populated only on trap choices,
-- so its presence alone identifies the wrong answer.
revoke select (is_trap, bias_id) on public.scenario_choices from anon, authenticated;

comment on column public.scenario_choices.is_trap is
  'Whether this choice embodies the bias. NOT readable by players — it is the '
  'answer. Revoked in 20260812000006.';

comment on column public.scenario_choices.bias_id is
  'The bias a trap choice embodies; null on every other choice, which makes its '
  'presence a tell. NOT readable by players. Revoked in 20260812000006.';

-- ============================================================================
-- SECTION B — outcomes become a reveal, not a lookup
-- ============================================================================
-- Readable once the player has attempted the scenario, and not before. Scoped to
-- the scenario rather than the single chosen choice so the reveal can show what
-- the other options would have done — which the interface does not do today, but
-- is the natural next step and needs no further policy change.
drop policy if exists outcomes_read_authenticated on public.outcomes;

create policy outcomes_read_after_attempt on public.outcomes
  for select to authenticated using (
    deleted_at is null
    and exists (
      select 1
      from public.scenario_choices sc
      join public.attempts a on a.scenario_id = sc.scenario_id
      where sc.id = outcomes.choice_id
        and a.player_id = (select auth.uid())
    )
  );

comment on policy outcomes_read_after_attempt on public.outcomes is
  'An outcome is a reveal. Readable only for a scenario this player has already '
  'attempted — before that it is the answer key.';

-- ============================================================================
-- SECTION C — submission becomes server-side
-- ============================================================================
-- ── Why the insert policy has to go ─────────────────────────────────────────
-- `attempts_insert_own` checked only that `player_id = auth.uid()`. Every other
-- column was the client's to choose, including `outcome_id` — so a player could
-- record a trap choice against the correct outcome and collect the XP, the
-- mastery credit and the wager payout for an answer they did not give. Closing
-- the read side without closing this one would have moved the exploit rather
-- than removing it.
drop policy if exists attempts_insert_own on public.attempts;

-- The only way an attempt can now be recorded.
--
-- Derives the outcome from the choice, so correctness is never a client claim.
-- Returns the reveal in the same round trip, which is also why the player is not
-- left waiting on a second request to see what happened.
create function public.submit_attempt(
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

  if not exists (
    select 1 from public.sessions
    where id = p_session_id and player_id = v_player_id
  ) then
    raise exception 'Session % is not yours', p_session_id using errcode = '42501';
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
    raise exception 'Choice % is not answerable for scenario %', p_choice_id, p_scenario_id
      using errcode = '22023';
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

comment on function public.submit_attempt(uuid, uuid, uuid, integer) is
  'The only way to record a decision. Derives the outcome from the chosen '
  'choice so correctness is never client-supplied, and returns the reveal.';

-- ============================================================================
-- SECTION D — privileges
-- ============================================================================
-- ⚠ All three roles. PostgreSQL grants EXECUTE to PUBLIC by default and Supabase
-- additionally grants it to anon and authenticated; removing either alone leaves
-- the function reachable. That is the defect that shipped twice (§12.4b), and
-- the integration suite asserts the outcome rather than trusting these lines.
revoke all on function public.submit_attempt(uuid, uuid, uuid, integer)
  from public, anon, authenticated;

-- Granted back by name: this one is the player's entry point. It accepts no
-- player id and derives everything from auth.uid().
grant execute on function public.submit_attempt(uuid, uuid, uuid, integer) to authenticated;
