# MindShift — Row Level Security (RLS) Strategy

**Status:** Draft v1 · **Owner:** Security / Architecture · **Last updated:** 2026-07-21

Defines the complete access-control model for MindShift **before** any policy SQL or migrations are written. Source of truth: the approved [Domain Model](../architecture/DomainModel.md) and [Database Schema](DatabaseSchema.md). Implementation-independent — no SQL, no Supabase policy code, no migrations. This becomes the blueprint for authoring RLS policies next.

---

## 1. Purpose

Row Level Security enforces access rules **at the database layer**, per row, regardless of which client or query reaches it. It is critical for MindShift because:

- Supabase exposes Postgres directly to the browser via the anon key. Without RLS, any client could read or write any row.
- The app holds **private player data** — progress, reflections, statistics, notifications — that must never leak across accounts.
- Game-economy integrity (XP, mastery, achievements) depends on writes the client must not be able to forge.
- RLS is the **last line of defense**: even if the frontend has a bug or is bypassed entirely, the database still refuses unauthorized access.

RLS makes security a property of the data, not a promise of the code.

---

## 2. Security Principles

- **Secure by default.** RLS enabled on every table; default posture is deny. Access is granted explicitly, never assumed.
- **Least privilege.** Each role gets the minimum access its job requires — nothing more. Players can touch only their own rows; content is read-only to them.
- **Zero trust.** No client input, JWT claim, or request is trusted without verification. Ownership is derived from the authenticated session (`auth.uid()`), never from client-supplied IDs.
- **Player data isolation.** A player can only ever see and modify rows they own. Cross-player access is impossible through the public API.
- **Server-side validation.** All economy and integrity-sensitive mutations (XP, achievements, mastery) happen through trusted server code, not client writes.
- **Defense in depth.** Layered controls — Auth, RLS, edge-function gatekeeping, storage policies, input validation — so no single failure is catastrophic.

---

## 3. User Roles

| Role | Identity | Responsibilities | Permissions (high level) |
|---|---|---|---|
| **Anonymous User** | No session (anon key) | Browse marketing/public content; sign up | Read published public content only. No player data. No writes. |
| **Authenticated Player** | Valid JWT, `auth.uid()` | Play the game; own their data | Read public content; full CRUD on **their own** player-owned rows within allowed limits. Cannot write economy facts directly. |
| **Administrator** | Authenticated user with admin claim/flag | Author content; moderate; support | Manage global content (categories, biases, scenarios, packs, achievements, levels); read player data for support per policy. Acts via secure workflows. |
| **Service Role** | Supabase service key (server-only) | Trusted backend operations that bypass RLS | Full access. Used ONLY server-side (edge functions), never shipped to the client. |
| **Edge Functions** | Run with service role or scoped context | Execute trusted logic: XP awards, achievement checks, AI calls, notifications | Perform integrity-sensitive writes on behalf of players after validation. |

**Rules:**
- Anonymous → read public only.
- Player → owns their rows, reads content, never writes economy facts.
- Admin privilege is a verified claim, never inferred from the client.
- Service role **never** reaches the browser.

---

## 4. Table Access Matrix

Legend — **Anon** = anonymous, **Player** = authenticated player (row-scoped to owner unless noted), **Admin** = administrator, **Edge** = edge function / service role. "Own" = only rows where the player is the owner. "—" = denied.

### Content (global, authored)

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `categories` | Anon, Player, Admin (published) | Admin/Edge | Admin/Edge | Admin/Edge |
| `biases` | Anon, Player, Admin (published) | Admin/Edge | Admin/Edge | Admin/Edge |
| `scenarios` | Anon, Player (published only), Admin (all) | Admin/Edge | Admin/Edge | Admin/Edge |
| `scenario_choices` | Anon, Player (of published scenarios), Admin | Admin/Edge | Admin/Edge | Admin/Edge |
| `outcomes` | Player, Admin *(see §5 note)* | Admin/Edge | Admin/Edge | Admin/Edge |
| `scenario_packs` | Anon, Player (published), Admin | Admin/Edge | Admin/Edge | Admin/Edge |
| `scenario_biases` | Anon, Player, Admin | Admin/Edge | Admin/Edge | Admin/Edge |
| `scenario_pack_items` | Anon, Player, Admin | Admin/Edge | Admin/Edge | Admin/Edge |
| `achievements` | Anon, Player (active), Admin | Admin/Edge | Admin/Edge | Admin/Edge |
| `levels` | Anon, Player, Admin | Admin/Edge | Admin/Edge | Admin/Edge |

### Player-owned

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | Own; public fields of others if `is_public`; Admin | Own (on signup) | Own (safe fields) | Own (account deletion) / Admin |
| `sessions` | Own; Admin | Own | Own | Own / Edge |
| `attempts` | Own; Admin | Own (or Edge) *(see note)* | — (immutable) | — (only via account erasure/Edge) |
| `reflections` | Own; Admin | Own | — (immutable) | — (only via account erasure/Edge) |
| `progress` | Own; Admin | Edge | Edge | Edge / cascade |
| `xp_transactions` | Own; Admin | **Edge only** | — (immutable) | — (cascade only) |
| `bias_mastery` | Own; Admin | Edge | Edge | Edge / cascade |
| `streaks` | Own; Admin | Edge | Edge | Edge / cascade |
| `player_achievements` | Own; Admin | **Edge only** | — (immutable) | — (cascade only) |
| `statistics` | Own; Admin | Edge | Edge | Edge / cascade |
| `notifications` | Own; Admin | **Edge only** | Own (mark read/dismiss) | Own |

**Notes:**
- **`attempts` INSERT:** the choice is player-supplied, but `is_correct` and `xp_awarded` must be computed server-side. Preferred: the client submits the choice through an edge function that records the attempt and awards XP atomically. If direct client insert is allowed, RLS restricts it to `player_id = auth.uid()` and correctness/XP columns are set/overwritten server-side — never trusted from the client.
- All player-owned SELECT/UPDATE/DELETE policies enforce `player_id = auth.uid()`.
- Economy rollups (`progress`, `bias_mastery`, `streaks`, `statistics`) and ledgers (`xp_transactions`, `player_achievements`) are **written by edge functions only**; players have read-own access.

---

## 5. Public Content Rules

`categories`, `biases`, `scenarios`, `scenario_choices`, `outcomes`, `scenario_packs`, `achievements`, `levels`.

- **Readable** by everyone (anon + players) **when published/active** — this is the game's shared learning material and should load without friction, aid discovery, and support marketing/SEO.
- **Only `published`/`active` rows are exposed** to non-admins; drafts and archived content are visible to admins only.
- **Never writable by players or anon.** Create/update/delete restricted to admins via secure workflows (edge functions with the service role). This preserves content integrity, prevents tampering, and keeps authored material trustworthy.
- **Content is versioned, not mutated destructively** (per schema) — edits go through controlled admin flows.
- **`outcomes` caveat:** an outcome reveals the "answer" (`is_correct`, explanation). To avoid pre-fetching answers, outcomes should be exposed **after** a decision — ideally returned by the attempt-submission edge function rather than freely selectable. At minimum, treat outcome exposure as gameplay-gated, not openly browsable, even though the row is global content.

---

## 6. Player Data Rules

`profiles`, `sessions`, `attempts`, `reflections`, `progress`, `xp_transactions`, `bias_mastery`, `streaks`, `player_achievements`, `statistics`, `notifications`.

- **Ownership derived from the session.** Every row carries `player_id` (or `id = auth.uid()` for `profiles`). All policies compare it to `auth.uid()`. Client-supplied owner IDs are ignored.
- **Strict isolation.** A player can read and act on only their own rows. No player can enumerate or access another's data through the public API.
- **Player-writable vs. edge-only:**
  - Player may write: `profiles` (safe fields), `sessions`, `reflections` (insert only — immutable once created), `notifications` (mark read), and — with server oversight — `attempts` choice data.
  - Edge-only writes: `xp_transactions`, `player_achievements`, `progress`, `bias_mastery`, `streaks`, `statistics`. Players cannot forge economy or mastery state.
- **Immutable facts:** `attempts`, `reflections`, `xp_transactions`, `player_achievements` are append-only — no player UPDATE/DELETE (except full account erasure, handled server-side/cascade).
- **`profiles` public fields:** if `is_public` is set (leaderboard opt-in), only a whitelisted subset (display name, avatar, level) is readable by others; private fields never are.
- **Account deletion** (right-to-erasure) cascades player-owned data; executed through a controlled workflow.

---

## 7. Admin Rules

- **Content management:** admins author and curate all global content (categories, biases, scenarios, choices, outcomes, packs, achievements, levels) through secure backend/admin workflows — not ad-hoc client writes.
- **Player support:** admins may read player data where policy permits (e.g., support tickets), with the access auditable. Admin *write* access to player-owned economy tables goes through the same validated edge functions players use — no raw manual XP edits as normal practice.
- **Privilege source:** admin status is a **verified server-side claim/flag**, never a value the client can set or assert. RLS checks the authenticated user's admin attribute, not request payload.
- **Backend-only operations:** content publishing, bulk imports, moderation actions, economy corrections, and account erasure must run through secure server workflows with audit trails — never directly from a browser session.

---

## 8. Edge Function Responsibilities

These operations must **never** be performed directly from the client; they run in trusted edge functions (service role) after validating the caller's session and inputs:

- **XP awards** — compute and insert `xp_transactions`; update `progress`. Clients cannot mint XP.
- **Achievement validation** — evaluate criteria server-side and insert `player_achievements`. Clients cannot self-grant.
- **Attempt scoring** — determine `is_correct`, award XP, update `bias_mastery` atomically on submission.
- **AI requests** — all provider calls (explanations, generation, coaching). API keys live only server-side; the client never sees them or calls the provider directly.
- **Notification generation** — system creates notifications; clients may only mark read/dismiss.
- **Streak updates** — computed server-side from activity to prevent gaming.
- **Statistics computation** — aggregated server-side.
- **Future — payments** — all billing/entitlement changes server-side and provider-verified; never client-trusted.
- **Future — moderation** — content/user moderation actions server-side with audit.

Rule of thumb: **if forging it would give an unfair advantage, expose a secret, or alter the economy, it belongs in an edge function.**

---

## 9. Storage Security

Supabase Storage buckets follow the same secure-by-default posture:

- **Avatars** (`avatars` bucket): a user may upload/update/delete only files under their own path (keyed by `auth.uid()`). Public-read only if profile is public; otherwise access-controlled. Enforce file type and size limits server-side.
- **Branding / public assets** (`branding` bucket): publicly readable; write restricted to admins/service role. Static, curated content.
- **Future uploaded content** (user-generated scenarios, attachments): private by default, owner-scoped paths, validated and (where relevant) moderated via edge functions before exposure. Signed URLs for controlled, time-limited access.
- **General:** never trust client-provided paths for authorization; derive the allowed prefix from the session. Validate MIME types and sizes. No bucket is public unless deliberately designated for public assets.

---

## 10. API Security Principles

How the frontend interacts with Supabase:

- **Never trust client data.** Ownership, correctness, XP, roles, and entitlements are always derived or validated server-side — never accepted from the request body.
- **Server validation.** Economy and integrity mutations go through edge functions that validate inputs and session before writing. RLS backstops everything.
- **JWT usage.** The Supabase Auth JWT carries the authenticated identity; RLS reads `auth.uid()` (and verified claims) from it. Only the **anon** key ships to the client; the **service** key never does.
- **Auth session handling.** Sessions managed by Supabase Auth with secure token storage and refresh. Protected operations verify the session server-side. Expired/invalid sessions are rejected; sensitive actions may require re-verification.
- **Least data exposure.** Select only needed columns; public reads expose whitelisted fields only.
- **Fail closed.** On any ambiguity, deny.

---

## 11. Future Compatibility

The model extends to planned features without redesign — new tables inherit the same posture (RLS on, deny by default, owner-scoped or content-read-only, economy via edge):

- **Story Mode:** `storylines`/`chapters` are public content (read-all, admin-write); player progress reuses owner-scoped `attempts`/`sessions`. No new rule types.
- **Daily Challenges:** `challenges` is public content; completions are owner-scoped attempts; streaks already edge-managed.
- **AI Coach:** coaching/recommendation rows are owner-scoped read; generated server-side via edge functions; keys stay server-side.
- **Leaderboards:** built from `is_public` opt-in profiles + edge-computed rankings; only whitelisted public fields exposed. Private data never leaks.
- **Teams:** `teams`/`team_members` introduce **team-scoped** access — a new predicate (membership) layered onto the same owner-scoped foundation; team rollups computed by edge.
- **Multiplayer:** shared session/room rows access-scoped to participants; authoritative state and scoring server-side.

New scope types (team, room) are **additional predicates**, not a new architecture.

---

## 12. Security Principles Summary

Every future table, endpoint, storage bucket, and feature must follow:

1. **RLS on, deny by default** — no table ships without policies; access is explicit.
2. **Own-only for player data** — scope to `auth.uid()`; never trust client-supplied ownership.
3. **Content is read-all (published), write-admin** — players never modify authored content.
4. **Economy is edge-only** — XP, achievements, mastery, streaks, statistics written by trusted server code, never the client.
5. **Immutable facts stay immutable** — append-only tables have no player UPDATE/DELETE.
6. **Secrets stay server-side** — service key and AI/provider keys never reach the browser.
7. **Verify, don't trust** — validate session, inputs, roles, and correctness server-side; RLS is the backstop.
8. **Privilege is a verified claim** — admin/role checks read server-verified attributes, never request payload.
9. **Storage is owner-scoped and validated** — paths derived from session; types/sizes enforced; public only by explicit design.
10. **Least privilege & least exposure** — grant the minimum; return the minimum.
11. **Defense in depth & fail closed** — layered controls; on doubt, deny.
12. **New scopes are new predicates** — extend the model additively; never weaken the baseline.

This strategy is the blueprint for authoring Supabase RLS policies and edge-function gatekeeping in the next phase.
