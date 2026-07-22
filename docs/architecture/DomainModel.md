# MindShift — Domain Model

**Status:** Draft v1 · **Owner:** Architecture · **Last updated:** 2026-07-21

Conceptual blueprint of the MindShift problem domain — the business entities, their responsibilities, and how they relate — defined *before* any database schema. No SQL, no Supabase tables, no implementation. This is the shared language the schema, code, and product must all agree on.

---

## 1. Purpose

A domain model captures the *meaning* of the system independent of how it's stored or coded. It exists to:

- Establish a **ubiquitous language** — one agreed name and definition per concept, used by product, design, and engineering.
- Separate **what** the business is from **how** it's implemented, so storage and tech choices can change without breaking shared understanding.
- Reveal relationships, boundaries, and invariants early — cheaper to fix on paper than in migrations.
- Serve as the **source of truth** the later database schema is derived from.

If a concept isn't described here, it doesn't yet exist in the domain.

---

## 2. Core Entities

Grouped by concern. Content entities are global/authored; player entities are user-owned; system entities are cross-cutting.

**Identity & player**
- **Player** — an authenticated person playing the game (the account/identity root).
- **Profile** — the player's public-facing and personal details (display name, avatar, preferences).

**Content (authored, global)**
- **Bias** — a cognitive bias concept the game teaches.
- **Category** — a grouping of biases or scenarios by theme or domain (e.g., money, work, media).
- **Scenario** — a single decision situation presented to the player.
- **Choice** — an available option within a scenario.
- **Outcome** — the consequence and teaching payload tied to a choice.
- **ScenarioPack** — a curated collection of scenarios released as a set.

**Play & progress (player-owned)**
- **Session** — a single play sitting containing one or more attempts.
- **Attempt** — one player's engagement with one scenario (which choice, correctness, timing). *(Added — the central record of "what happened"; the original list implied it via Session/Choice but it deserves to be explicit.)*
- **Reflection** — a player's short written or prompted takeaway after a scenario.
- **Progress** — a player's overall advancement snapshot (level, total XP, aggregate stats).
- **XPTransaction** — a discrete award of XP with its reason. *(XP modeled as a ledger of transactions rather than a bare number, so totals are auditable and rules can evolve.)*
- **Level** — a named/numbered tier derived from accumulated XP (a global rule/definition, not per-player rows).
- **BiasMastery** — a player's proficiency signal for a specific bias.
- **Streak** — a player's consistency record over time. *(Added — first-class since it drives motivation.)*
- **Achievement** — a defined milestone that can be earned (global definition).
- **PlayerAchievement** — the record that a specific player earned a specific achievement. *(Added — separates the catalog from the earning event.)*
- **Statistics** — aggregated metrics about a player's performance and learning.

**System & engagement**
- **Notification** — a message or nudge surfaced to a player.

_Note: "XP" and "Level" from the prompt are represented as **XPTransaction** (events) + **Progress** (running total) + **Level** (rule). This avoids storing a mutable number with no history._

---

## 3. Responsibilities

- **Player** — owns identity, authentication anchor, and everything the player generates. Root of all player-owned data.
- **Profile** — holds presentation and preference data (display name, avatar, theme, notification settings). Kept distinct from Player so identity and presentation evolve independently.
- **Bias** — defines a teachable concept: name, description, explanation, counter-strategy, difficulty. The unit of learning.
- **Category** — organizes content for discovery, filtering, and progression grouping.
- **Scenario** — presents context, stakes, and a decision; references the bias(es) it teaches and belongs to a category/pack. The unit of gameplay.
- **Choice** — one selectable option; carries whether it embodies a bias (the "trap") and links to its outcome.
- **Outcome** — the result of a choice plus the teaching payload (what happened, which bias fired, why, how to counter). The unit of feedback.
- **ScenarioPack** — bundles scenarios for release, unlocks, and themed content.
- **Session** — frames a play sitting; groups attempts, tracks start/end and session-level summary.
- **Attempt** — records a single scenario play: chosen choice, correctness, time taken, XP awarded, outcome shown. The atomic fact of play from which progress is derived.
- **Reflection** — captures the player's personal takeaway to reinforce transfer.
- **Progress** — the player's running summary: current level, total XP, counts, and headline stats. A read-optimized rollup.
- **XPTransaction** — a single XP award with amount, source (attempt, achievement, streak), and timestamp. Immutable event.
- **Level** — maps accumulated XP to a tier; defines thresholds and unlock rules. Global definition.
- **BiasMastery** — per-player, per-bias proficiency; rises with correct recognition across contexts, decays gently over time; drives review and difficulty.
- **Streak** — tracks consecutive-day consistency, current and best; supports grace/repair.
- **Achievement** — catalog entry: criteria, name, description, reward.
- **PlayerAchievement** — links a player to an earned achievement with the moment earned.
- **Statistics** — aggregates for dashboards and insights (accuracy, reps, per-category/bias breakdowns, trends).
- **Notification** — represents a nudge/message with type, state (read/unread), and target player.

Each entity has **one** reason to change. Content entities never store player state; player entities never redefine content.

---

## 4. Relationships

**Identity**
- A **Player** has exactly one **Profile**.
- A **Player** has one **Progress** rollup and one **Streak** record.

**Content structure**
- A **Category** groups many **Biases** and many **Scenarios**.
- A **Bias** can appear in many **Scenarios**; a **Scenario** can teach one or more **Biases** (many-to-many).
- A **ScenarioPack** contains many **Scenarios**; a **Scenario** may belong to one or more packs.
- A **Scenario** contains multiple **Choices** (2–4).
- A **Choice** leads to exactly one **Outcome**; a **Choice** may map to a **Bias** (the trap it embodies).

**Play**
- A **Player** has many **Sessions**.
- A **Session** contains many **Attempts**.
- An **Attempt** references one **Scenario** and the one **Choice** the player selected, and surfaces that choice's **Outcome**.
- An **Attempt** may produce one **Reflection**.
- An **Attempt** generates one or more **XPTransactions**.

**Progress & mastery**
- Many **XPTransactions** roll up into a Player's **Progress** (total XP → **Level** via global thresholds).
- A **Player** has many **BiasMastery** records — one per **Bias** engaged.
- **Attempts** update the relevant **BiasMastery**.
- A **Player** has many **PlayerAchievements**, each referencing one global **Achievement**.
- **Statistics** are derived from a Player's **Attempts**, **XPTransactions**, and **BiasMastery**.

**Engagement**
- A **Player** receives many **Notifications**.

_Cardinality summary:_ Player 1—1 Profile · Player 1—* Session · Session 1—* Attempt · Scenario 1—* Choice · Choice 1—1 Outcome · Bias *—* Scenario · Player 1—* BiasMastery · Player *—* Achievement (via PlayerAchievement).

---

## 5. Entity Lifecycles

- **Content (Bias, Category, Scenario, Choice, Outcome, ScenarioPack):** authored/curated outside gameplay; created and versioned by the team; published, updated, or retired. Never deleted destructively once played — retired/archived so historical Attempts stay meaningful. Immutable from the player's side.
- **Player / Profile:** created at sign-up; updated via settings; on account deletion, player-owned data is removed or anonymized per privacy policy.
- **Session:** created when play begins; accumulates Attempts; closed with a summary when the sitting ends or times out; retained for history.
- **Attempt:** created on each scenario play; effectively immutable once recorded (append-only fact); retained as the basis for stats and mastery.
- **Reflection:** created after an attempt; immutable once created (never edited or deleted); retained with the attempt.
- **XPTransaction:** created on award; immutable; never edited or deleted (ledger integrity). Corrections are new compensating transactions.
- **Progress / Statistics:** created with the player; continuously updated as derived rollups; rebuildable from source events.
- **BiasMastery:** created on first engagement with a bias; updated per relevant attempt; decays over time by rule.
- **Streak:** created with player; updated daily by activity; may reset or repair.
- **Achievement:** authored globally. **PlayerAchievement:** created once when criteria are met; immutable thereafter.
- **Notification:** created by system events; updated (read/dismissed); expired/archived after relevance passes.

Guiding rule: **facts are append-only; rollups are derived and rebuildable; content is versioned, not destroyed.**

---

## 6. Ownership

**Global (authored, shared by all players — read-only to players):**
Bias · Category · Scenario · Choice · Outcome · ScenarioPack · Level (definitions) · Achievement (catalog).

**Player-owned (private to one player):**
Profile · Session · Attempt · Reflection · Progress · XPTransaction · BiasMastery · Streak · PlayerAchievement · Statistics · Notification.

**Boundary:** Global content is never mutated by gameplay. Player-owned data references global content by identity but never copies its definition. This ownership split directly informs later access rules — every player-owned entity is scoped to its owning Player; global content is publicly readable, team-writable.

---

## 7. Future Expansion

The model is designed so upcoming features attach without reshaping the core:

- **Story Mode:** add a narrative-arc entity (e.g., **Storyline / Chapter**) that sequences existing **Scenarios**; player progress reuses **Session**/**Attempt**/**Progress**. No change to the scenario core.
- **Daily Challenges:** a **Challenge** entity referencing a Scenario (or generated one) with a date; completion is a normal **Attempt** tagged to the challenge. Streaks already exist.
- **AI Coach:** attach **Recommendation** / coaching-message entities derived from **Statistics** and **BiasMastery**; surfaced via **Notification**. Reads existing data; adds nothing the core depends on.
- **AI-generated scenarios:** generated content becomes ordinary **Scenario**/**Choice**/**Outcome** records flagged by source; the play model is unchanged.
- **Leaderboards:** ranking views derived from existing **XPTransaction**/**Statistics**; add an opt-in visibility flag on Profile. No new coupling to core play.
- **Multiplayer / Teams:** introduce **Team** and **Membership** entities; **Players** join Teams; team stats aggregate existing player facts. Attempts and content stay per the current model.

Because play is recorded as append-only **Attempts** referencing **global content**, new modes are new *framings* over the same facts — not new cores.

---

## 8. Domain Principles

Every future entity must follow these:

1. **Single responsibility** — one clear concept, one reason to change.
2. **Content vs. state separation** — authored global content never holds player state; player state never redefines content.
3. **Facts are append-only** — record what happened as immutable events (Attempts, XP); derive rollups (Progress, Statistics) from them and keep them rebuildable.
4. **Ownership is explicit** — every entity is clearly global or player-owned; player data is always scoped to its owner.
5. **Reference, don't duplicate** — link to canonical entities by identity; never copy definitions.
6. **Versioned, not destroyed** — retire/archive content instead of deleting, so history stays valid.
7. **Ubiquitous language** — use these exact names everywhere (product, code, schema).
8. **Design for extension** — new features should attach as new entities/relationships, not force core rewrites.
9. **Learning-first meaning** — every entity should trace back to serving recognition, mastery, or player growth.

This document is the blueprint. The database schema — and its access rules — will be derived from it, not the other way around.
