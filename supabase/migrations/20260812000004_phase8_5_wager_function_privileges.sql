-- ============================================================================
-- Phase 8.5 — revoke the internal wager functions
-- ============================================================================
-- ── Why this is a second migration rather than the tail of the first ────────
-- `20260812000003` already contained these exact `revoke` statements, ran
-- cleanly, and **did not take effect**. Verified against the live project
-- immediately afterwards: `insight_balance(other)` and `resolve_attempt_wager()`
-- were still callable by an ordinary authenticated user, while the Phase 8.4
-- revokes — written in a migration *separate* from the functions they targeted —
-- were correctly in force (`42501: permission denied`).
--
-- The difference is create-and-revoke in one migration versus revoking in a
-- later one. Supabase applies its default `grant execute … to anon,
-- authenticated` around function creation, and a revoke issued in the same
-- migration is undone by it. A revoke in a subsequent migration sticks.
--
-- So the rule is empirical and now load-bearing:
--
--   **Privilege changes belong in their own migration, applied after the one
--   that creates the function — and must be verified by a test, never assumed.**
--
-- This is the second time the same class of defect has shipped (ProjectStatus
-- §12.4b). The regression tests in `tests/integration/wagers.test.ts` assert the
-- outcome rather than the statement, which is why it was caught this time.
--
-- No table, policy, signature or behaviour changes. Privileges only.
-- ============================================================================

-- Internal: both take a player id and neither is anything a browser should
-- reach. `resolve_attempt_wager` is the more serious of the two — it moves
-- Insight, and a caller who could invoke it directly could settle a wager
-- outside the award transaction.
revoke all on function public.insight_balance(uuid)             from anon, authenticated;
revoke all on function public.resolve_attempt_wager(uuid, uuid) from anon, authenticated;

-- Restated so this file is a complete statement of the wager surface. Both
-- derive the player from `auth.uid()` and accept no player id; `place_wager`
-- revalidates tier, ownership and affordability server-side.
grant execute on function public.insight_wallet()                 to authenticated;
grant execute on function public.place_wager(uuid, uuid, integer) to authenticated;

-- Pure constants — no player data. The interface reads them so the economy is
-- described in one place rather than hardcoded in two.
grant execute on function public.insight_starting_balance()  to authenticated;
grant execute on function public.insight_recognition_award() to authenticated;
grant execute on function public.insight_wager_tiers()       to authenticated;
