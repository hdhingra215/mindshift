# MindShift — Level System

**Status:** Draft v1 · **Owner:** Product / Game Design · **Last updated:** 2026-07-23

The player level system: a visible signal of the journey from *unaware* to *sharp thinker*. Editorial/design reference — no XP numbers, no schema, no seed data. Maps to the `levels` table (`level_number`, `title`, `unlocks`) when authored. Exact XP thresholds are set later in economy tuning ([ContentStrategy.md §9](../product/ContentStrategy.md) — reward learning, never grind).

---

## 1. Philosophy

Levels **signal the journey, not status to grind for**. A level says "here's how far your thinking has come," not "here's how many hours you logged." Per [GameDesign.md](../product/GameDesign.md) and [CLAUDE.md](../../CLAUDE.md): fair progression, never a pay/grind wall; XP scaffolds intrinsic growth; **mastery — not level — is the true measure of learning.**

Principles:

- **Steady and earned.** Early levels come quickly (fast onboarding momentum); later levels take more, so advancement always feels earned but never grindy.
- **Cumulative, never lost.** Level reflects total XP earned over time. Levels never decrease — the player's journey only moves forward (mastery may decay to prompt review; *level* does not).
- **A map, not a leaderboard.** Level orients the player in their own growth. Competition (leaderboards) is a separate, opt-in, future concern — level is personal.
- **Meaning over magnitude.** Each level means something (a stage of thinking), not just a bigger number. The ladder tells a story.

---

## 2. Number of MVP levels

**10 levels.** Enough to give the MVP a satisfying beginning-to-mastery arc with frequent early wins, few enough that each level is meaningful and reachable within MVP content. Post-MVP can extend the ladder (prestige tiers, more levels) without redesign — the model already supports arbitrary `level_number`s.

---

## 3. Naming convention

Levels are named for **stages of a thinker's growth** — from first awareness to mastery. Adult, aspirational, never cutesy or childish. Each name is a small identity the player grows into.

| Level | Title | Stage meaning |
|---|---|---|
| 1 | **Curious Mind** | Just arrived; open and ready to learn. |
| 2 | **Observer** | Starting to notice biases in scenarios. |
| 3 | **Questioner** | Beginning to doubt easy first answers. |
| 4 | **Skeptic** | Actively distrusting the obvious pull. |
| 5 | **Clear Thinker** | Recognizing common biases reliably. |
| 6 | **Pattern Seeker** | Spotting biases across different contexts. |
| 7 | **Bias Spotter** | Catching subtle, disguised traps. |
| 8 | **Sharp Mind** | Untangling interacting biases. |
| 9 | **Strategist** | Countering biases deliberately, in the moment. |
| 10 | **Clarity** | Mastery — clear thinking as a trained reflex. |

Naming rationale: the arc moves from *awareness* (1–2) → *doubt* (3–4) → *recognition* (5–6) → *skill* (7–9) → *mastery* (10). The titles double as a self-narrative ("I'm a Clear Thinker now") that reinforces intrinsic motivation.

---

## 4. Visual progression

Design intent for how levels *look and feel* (built to [DesignSystem.md](../design/DesignSystem.md) and CLAUDE.md UI standards — clean, minimal, premium, accessible; motion respects `prefers-reduced-motion`):

- **A single evolving emblem**, not a pile of badges. One level emblem that visibly matures across the ladder (e.g., a motif that grows more refined/luminous), so progression reads at a glance.
- **Tiered visual language.** Grouped bands (awareness / recognition / skill / mastery) share a visual family, with a distinct, more premium treatment for the final level to make mastery feel earned.
- **Progress toward next level** always visible (a calm progress indicator), so the next step is clear — supporting the "next-action clarity" that drives return visits.
- **Celebratory but tasteful level-up moment.** A brief, satisfying transition naming the new title and what it means (and any unlock) — delight without over-animation or slot-machine feel.
- **Accessible by default.** Level state never conveyed by color/emblem alone — always paired with the title text and numeric level; sufficient contrast; readable on mobile first.

---

## 5. Unlock philosophy

Levels may gate the *arrival* of new content and features, always as **pacing, never as a wall**:

- **Reveal, don't restrict.** Unlocks introduce new biases, harder tiers, or features gradually to prevent overload (per GameDesign — new biases unlock gradually), not to withhold value the player has earned.
- **Learning-gated, not grind-gated.** Advanced content should arrive when the player is *ready* (progression tracks growing skill), so difficulty never spikes into a wall. Unlocks align with the difficulty framework ([ContentStrategy.md §4](../product/ContentStrategy.md)).
- **Never pay-gated.** No unlock is ever purchasable or grind-locked. Everything is reachable through normal, fair play.
- **Meaningful unlocks only.** Each unlock is something the player wants (new biases to explore, new challenge, a codex feature) — never a hollow reward. Curiosity ("which bias next?") is a primary return driver; unlocks feed it honestly.
- **Flexible, data-driven.** What each level unlocks is defined in the level's `unlocks` payload at authoring time, so pacing can be tuned without code changes.

_Specific per-level unlock mappings and XP thresholds are defined during economy tuning and seed authoring, guided by this philosophy. This document fixes the ladder and its intent, not the numbers._
