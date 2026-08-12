-- ============================================================================
-- Phase 8.5 — actually revoke the internal wager functions
-- ============================================================================
-- ── Correcting the record ───────────────────────────────────────────────────
-- `20260812000004` claimed the previous revoke failed because create-and-revoke
-- happened in one migration. **That explanation was wrong**, and it is corrected
-- here rather than quietly patched: splitting the migration changed nothing, and
-- `insight_balance` stayed callable after it.
--
-- The real cause is simpler and worse. Two independent grants must be removed:
--
--   1. PostgreSQL grants `EXECUTE` on every new function to **PUBLIC** by default.
--   2. Supabase additionally grants it to **anon** and **authenticated** explicitly.
--
-- Phase 8.4 removed both — its function migration carried `revoke … from public`
-- and its follow-up carried `revoke … from anon, authenticated` — which is why
-- the twin internals really are locked down. The Phase 8.5 migration revoked only
-- the explicit role grants and never touched PUBLIC, so every role kept EXECUTE
-- through the pseudo-role and the revoke looked applied while doing nothing.
--
-- ── The rule, stated once and correctly ─────────────────────────────────────
--   revoke all on function … from public, anon, authenticated;
--
-- All three, every time. And prove it with a test that calls the function as an
-- ordinary player — a revoke statement that runs without error is not evidence
-- that a function is unreachable. Both times this defect shipped, the migration
-- read as though it were correct.
--
-- Privileges only. No table, policy, signature or behaviour changes.
-- ============================================================================

revoke all on function public.insight_balance(uuid)
  from public, anon, authenticated;
revoke all on function public.resolve_attempt_wager(uuid, uuid)
  from public, anon, authenticated;

-- The reachable surface, restated. Revoking from PUBLIC also removes the
-- pseudo-role grant these two rely on, so they are granted back by name.
grant execute on function public.insight_wallet()                 to authenticated;
grant execute on function public.place_wager(uuid, uuid, integer) to authenticated;
grant execute on function public.insight_starting_balance()       to authenticated;
grant execute on function public.insight_recognition_award()      to authenticated;
grant execute on function public.insight_wager_tiers()            to authenticated;
