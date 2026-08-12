-- ============================================================================
-- Phase 8.6 — actually hide the tells on scenario_choices
-- ============================================================================
-- ── Correcting `20260812000006` ─────────────────────────────────────────────
-- That migration used:
--
--   revoke select (is_trap, bias_id) on public.scenario_choices from anon, authenticated;
--
-- It ran cleanly and **did nothing**. Verified live: a player could still select
-- both columns.
--
-- A column-level revoke cannot carve a hole in a table-level grant. Supabase
-- issues `grant select on all tables … to anon, authenticated`, which is a grant
-- on *the table*, and PostgreSQL treats that as covering every column present
-- and future. Column privileges only bite once the table-wide grant is gone.
--
-- So the shape has to be inverted: drop the table grant, then grant back exactly
-- the columns a player may read. Anything added to this table in future is
-- withheld by default, which is the right way round for a table whose whole
-- purpose is to hold the answer.
--
-- ── The pattern of these mistakes ───────────────────────────────────────────
-- Third privilege defect in three phases, and the same shape every time: a
-- revoke that reads correctly, runs without error, and does not take effect.
-- §12.4c already says to prove privileges with a test rather than trust the
-- statement — this was caught by exactly such a test, which is the system
-- working. The rule now covers columns too:
--
--   **To withhold a column: revoke SELECT on the table, then grant the safe
--   columns by name. Never a bare column-level revoke.**
--
-- Privileges only. No policy, data or behaviour change.
-- ============================================================================

revoke select on public.scenario_choices from anon, authenticated;

-- Everything needed to render and answer a choice, and nothing that identifies
-- which one is right.
--
-- Withheld, deliberately:
--   is_trap   the answer
--   bias_id   populated only on trap choices, so its presence is the answer
grant select (
  id,
  scenario_id,
  label,
  body,
  sort_order,
  created_at,
  updated_at,
  deleted_at
) on public.scenario_choices to anon, authenticated;
