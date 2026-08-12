-- ============================================================================
-- Phase 8.4 — close the internal-function privilege hole
-- ============================================================================
-- ── The defect ──────────────────────────────────────────────────────────────
-- Every progression migration since 7.1 ends with `revoke all on function … from
-- public` and grants only the intended entry points to `authenticated`. That
-- looked airtight and was not.
--
-- Supabase ships default privileges on the `public` schema:
--
--   alter default privileges in schema public
--     grant execute on functions to postgres, anon, authenticated, service_role;
--
-- so every function is born with an *explicit* grant to `anon` and
-- `authenticated`. `revoke … from public` removes the implicit PUBLIC
-- pseudo-role grant and leaves those explicit role grants untouched. The result:
-- every "internal" SECURITY DEFINER helper has been directly callable by any
-- signed-in user since Phase 7.1.
--
-- ── What it exposed ─────────────────────────────────────────────────────────
-- Verified against the live project, signed in as one player and passing another
-- player's id as the argument:
--
--   refresh_player_progress(other)  → returned their level, XP and accuracy
--   achievement_facts(other)        → returned their learning facts
--   refresh_player_streak(other)    → returned *and wrote* their streak
--   twin_attempt_facts(other)       → returned their whole decision history
--   record_xp(other, 9999, …)       → reached a CHECK constraint, i.e. it passed
--                                     authorization; valid arguments would have
--                                     minted XP for another player
--
-- These are SECURITY DEFINER and take the player as a parameter, so nothing sat
-- between the caller and the data. RLS never applied — that is what SECURITY
-- DEFINER means.
--
-- ── The fix ─────────────────────────────────────────────────────────────────
-- Revoke execute from `anon` and `authenticated` on every function the client
-- has no business calling, and restate the small surface that remains.
--
-- **No function body is touched.** Three of the internals are verified, subtle
-- and load-bearing (`evaluate_achievements`, `refresh_player_streak`,
-- `achievement_day_streak`), and rewriting them to add an internal guard would
-- risk changing behaviour to fix a privilege bug. Privileges are the defect, so
-- privileges are the whole change. The gameplay harness was updated in the same
-- commit to stop calling them directly and to assert against the tables and the
-- award payload instead — which is closer to what the product actually does.
--
-- No table, policy, signature or behaviour changes.
-- ============================================================================

-- ============================================================================
-- SECTION A — revoke every internal function
-- ============================================================================
-- The test for "internal": does a browser ever need to call it? For everything
-- below the answer is no — they are steps inside the award transaction, or they
-- take a player id, or both.
--
-- `anon` is revoked explicitly alongside `authenticated`: the default privileges
-- granted it too, and an unauthenticated caller has even less business here.

-- 7.1 — XP engine internals. `record_xp` is the only writer of the ledger.
revoke all on function public.record_xp(uuid, integer, public.xp_source, text, uuid, uuid)
  from anon, authenticated;
revoke all on function public.refresh_player_progress(uuid)  from anon, authenticated;
revoke all on function public.refresh_session_rollups(uuid)  from anon, authenticated;
revoke all on function public.progression_snapshot(public.progress, integer, integer, boolean, integer)
  from anon, authenticated;

-- 7.2 — mastery internals.
revoke all on function public.refresh_bias_mastery(uuid, uuid)    from anon, authenticated;
revoke all on function public.refresh_attempt_mastery(uuid, uuid) from anon, authenticated;

-- 7.3 — achievement internals, including every per-rule helper.
revoke all on function public.achievement_facts(uuid)                       from anon, authenticated;
revoke all on function public.achievement_criteria_met(uuid, jsonb, jsonb)  from anon, authenticated;
revoke all on function public.achievement_difficulty_clears(uuid, public.difficulty_level)
  from anon, authenticated;
revoke all on function public.achievement_active_days(uuid, integer)           from anon, authenticated;
revoke all on function public.achievement_calibrated_outcomes(uuid, integer)   from anon, authenticated;
revoke all on function public.achievement_recovery_run(uuid, integer, integer) from anon, authenticated;
revoke all on function public.achievement_day_streak(uuid, boolean)            from anon, authenticated;
revoke all on function public.evaluate_achievements(uuid)                      from anon, authenticated;

-- 8.1 — streak internals. `refresh_player_streak` both read and wrote another
-- player's rollup, which is the only one of these that was also a write.
revoke all on function public.streak_qualifying_days(uuid) from anon, authenticated;
revoke all on function public.streak_state(uuid, boolean)  from anon, authenticated;
revoke all on function public.refresh_player_streak(uuid)  from anon, authenticated;

-- 8.4 — twin internals. `twin_attempt_facts` was the worst of the set: an
-- unguarded, unfiltered read of another player's entire decision history.
revoke all on function public.twin_attempt_facts(uuid)            from anon, authenticated;
revoke all on function public.twin_patterns(uuid)                 from anon, authenticated;
revoke all on function public.resolve_twin_prediction(uuid, uuid) from anon, authenticated;

-- ============================================================================
-- SECTION B — the surface a signed-in player may call
-- ============================================================================
-- Restated rather than assumed, so this file is the single place to read to know
-- what is reachable from a browser. Every entry either derives the player from
-- `auth.uid()`, guards on it internally, or touches no player data at all.
--
--   award_attempt_xp(uuid)         derives the player from auth.uid()
--   award_reflection_xp(uuid)      derives the player from auth.uid()
--   twin_predict_scenario(uuid)    derives the player from auth.uid()
--   twin_state(uuid)               guards internally; returns sealed/forbidden
--   level_for_total_xp(integer)    pure — no player data
--   mastery_tier_floor(text)       pure — no player data
--   bias_mastery_ceiling(integer)  pure — no player data
--   bias_mastery_rate(…)           pure — no player data
--   twin_min_total_attempts()      pure constant
--   twin_min_context_sample()      pure constant
--   twin_min_edge()                pure constant
--   twin_cooldown_attempts()       pure constant
grant execute on function public.award_attempt_xp(uuid)      to authenticated;
grant execute on function public.award_reflection_xp(uuid)   to authenticated;
grant execute on function public.twin_predict_scenario(uuid) to authenticated;
grant execute on function public.twin_state(uuid)            to authenticated;
grant execute on function public.level_for_total_xp(integer) to authenticated;

-- The pure ones. Kept reachable because they carry no player data and the
-- interface reads them to explain its own thresholds honestly.
grant execute on function public.mastery_tier_floor(text)          to authenticated;
grant execute on function public.bias_mastery_ceiling(integer)     to authenticated;
grant execute on function public.twin_min_total_attempts()         to authenticated;
grant execute on function public.twin_min_context_sample()         to authenticated;
grant execute on function public.twin_min_edge()                   to authenticated;
grant execute on function public.twin_cooldown_attempts()          to authenticated;
