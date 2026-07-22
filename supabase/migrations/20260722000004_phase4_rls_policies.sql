-- ============================================================================
-- MindShift — Phase 4: Row Level Security Policies
-- ============================================================================
-- Authors the RLS policies for every table shipped in Layers 1–3B. RLS was
-- already ENABLED on all tables (deny-by-default); this migration grants the
-- explicit, minimal access each role needs. Blueprint: RLSStrategy.md §§4–6,
-- DatabaseSchema.md, DomainModel.md, CLAUDE.md §8.
--
-- No new tables. No schema changes. No triggers, no functions, no business
-- logic — policy SQL only.
--
-- Model (Supabase roles):
--   * authenticated — a logged-in player. All player-data policies scope rows
--     to (select auth.uid()); content is read-only to them.
--   * service_role  — trusted server/edge code. BYPASSES RLS entirely, so no
--     policies are written for it. All admin content writes and economy/rollup
--     writes (xp_transactions, progress, bias_mastery, streaks, statistics,
--     player_achievements) happen there.
--   * anon          — no policies here → no access (see summary note re: future
--     public/marketing read of published content).
--
-- Conventions & Supabase best practices:
--   * auth.uid() is wrapped as (select auth.uid()) so the planner evaluates it
--     once per statement (initplan) instead of per row.
--   * Every policy is scoped `TO authenticated` so it never runs for anon.
--   * One policy per action (SELECT/INSERT/UPDATE) for clarity — no FOR ALL.
--   * Deny is expressed by ABSENCE of a permissive policy (RLS default-deny).
--     Immutable tables therefore simply have no UPDATE/DELETE policy; rollup /
--     ledger tables have no client write policy at all.
--   * Soft-deleted / unpublished content rows are excluded from reads.
-- ============================================================================

-- ############################################################################
-- SECTION A — Public content (global, authored)
-- ############################################################################
-- Read-only to authenticated players. No client INSERT/UPDATE/DELETE policies:
-- content is created/curated exclusively by admins via service_role (bypasses
-- RLS). Only published/active, non-soft-deleted rows are exposed to players;
-- drafts and archived rows remain service_role-only.

-- Taxonomy / reference tables (no publish gate; hide soft-deleted where present).
create policy categories_read_authenticated on public.categories
  for select to authenticated using (deleted_at is null);

create policy biases_read_authenticated on public.biases
  for select to authenticated using (deleted_at is null);

create policy levels_read_authenticated on public.levels
  for select to authenticated using (true);

-- Publish-gated content.
create policy achievements_read_authenticated on public.achievements
  for select to authenticated using (is_active and deleted_at is null);

create policy scenarios_read_authenticated on public.scenarios
  for select to authenticated using (status = 'published' and deleted_at is null);

create policy scenario_packs_read_authenticated on public.scenario_packs
  for select to authenticated using (is_published and deleted_at is null);

-- Scenario children. Exposed to authenticated players as gameplay material.
-- NOTE: parent-published gating (choices/outcomes only for published scenarios)
-- and the "outcomes reveal the answer" gameplay-gate (RLSStrategy §5) are
-- enforced by the attempt/content edge layer, which is the intended gate; these
-- grants are the RLS backstop, not the primary control.
create policy scenario_choices_read_authenticated on public.scenario_choices
  for select to authenticated using (deleted_at is null);

create policy outcomes_read_authenticated on public.outcomes
  for select to authenticated using (deleted_at is null);

-- Content junctions (hard-delete, no deleted_at column).
create policy scenario_biases_read_authenticated on public.scenario_biases
  for select to authenticated using (true);

create policy scenario_pack_items_read_authenticated on public.scenario_pack_items
  for select to authenticated using (true);

-- ############################################################################
-- SECTION B — Profiles (player identity, owner-scoped)
-- ############################################################################
-- Own-only. RLS is row-level and cannot restrict columns, so:
--   * public-profile exposure (whitelisted fields when is_public) is deferred
--     to a column-limited view, NOT a row policy that would leak private cols;
--   * "editable safe fields only" is enforced by column GRANTs / the edge layer.
--     This policy guarantees a player can only ever touch THEIR OWN profile row.
-- No DELETE policy: account erasure is a controlled service_role workflow.

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));

create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ############################################################################
-- SECTION C — Player-writable data (owner-scoped)
-- ############################################################################

-- sessions — player creates and updates their own play sittings.
create policy sessions_select_own on public.sessions
  for select to authenticated using (player_id = (select auth.uid()));

create policy sessions_insert_own on public.sessions
  for insert to authenticated with check (player_id = (select auth.uid()));

create policy sessions_update_own on public.sessions
  for update to authenticated
  using (player_id = (select auth.uid()))
  with check (player_id = (select auth.uid()));

-- ############################################################################
-- SECTION D — Immutable player facts (insert-only, owner-scoped)
-- ############################################################################
-- SELECT + INSERT own only. No UPDATE/DELETE policy → append-only enforced by
-- RLS. Removal happens only via account-erasure cascade (service_role).

-- attempts.
create policy attempts_select_own on public.attempts
  for select to authenticated using (player_id = (select auth.uid()));

create policy attempts_insert_own on public.attempts
  for insert to authenticated with check (player_id = (select auth.uid()));

-- reflections.
create policy reflections_select_own on public.reflections
  for select to authenticated using (player_id = (select auth.uid()));

create policy reflections_insert_own on public.reflections
  for insert to authenticated with check (player_id = (select auth.uid()));

-- ############################################################################
-- SECTION E — Economy ledgers & rollups (read-own, edge-only writes)
-- ############################################################################
-- SELECT own only. NO client write policy of any kind → all INSERT/UPDATE/DELETE
-- are denied by default for authenticated. service_role (edge functions) writes
-- these after server-side validation. This is the "deny" for the mutable
-- rollups and the immutability for the ledgers.

-- xp_transactions (immutable ledger).
create policy xp_transactions_select_own on public.xp_transactions
  for select to authenticated using (player_id = (select auth.uid()));

-- player_achievements (immutable, edge-granted).
create policy player_achievements_select_own on public.player_achievements
  for select to authenticated using (player_id = (select auth.uid()));

-- progress (mutable rollup, edge-written).
create policy progress_select_own on public.progress
  for select to authenticated using (player_id = (select auth.uid()));

-- bias_mastery (mutable rollup, edge-written).
create policy bias_mastery_select_own on public.bias_mastery
  for select to authenticated using (player_id = (select auth.uid()));

-- streaks (mutable rollup, edge-written).
create policy streaks_select_own on public.streaks
  for select to authenticated using (player_id = (select auth.uid()));

-- statistics (mutable rollup, edge-written).
create policy statistics_select_own on public.statistics
  for select to authenticated using (player_id = (select auth.uid()));
