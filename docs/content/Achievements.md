# MindShift — Achievement Catalog (MVP)

**Status:** Draft v1 · **Owner:** Product / Game Design · **Last updated:** 2026-07-23

The complete MVP achievement catalog. Achievements celebrate **genuine learning and meaningful milestones** — understanding, consistency, curiosity, and mastery — never grind, time served, or volume ([ContentStrategy.md §10](../product/ContentStrategy.md), [GameDesign.md](../product/GameDesign.md)). Editorial/design reference — no schema, no seed data. Each maps to an `achievements` row (`slug`, `name`, `description`, `criteria`); exact numeric criteria are set at seed authoring.

> **Guardrails (apply to every achievement below).** No dark patterns: no guilt-tripping, no artificial scarcity, no engagement-bait. If chasing a badge would pull a player *away* from learning, it does not ship. Every achievement, on reflection, should feel like recognition of real growth.

---

## Design overview

**14 MVP achievements**, grouped by the learning behavior they reward:

- **Understanding** — recognizing and grasping biases.
- **Mastery** — deep, transferable command of biases.
- **Consistency** — showing up to practice (forgiving, never punishing).
- **Curiosity** — exploring breadth and going deeper.
- **Metacognition** — knowing what you know (confidence calibration).

Criteria describe *what* is rewarded, not exact thresholds (finalized at seed time). "Distinct contexts/domains" always means *different* scenarios/domains — transfer, not repetition.

---

## Understanding

### 1. First Insight
- **Purpose.** Mark the player's first complete learning moment (first scenario + feedback). The activation milestone.
- **Unlock philosophy.** Earned on completing the first scenario and reading its outcome — the moment the core loop first pays off. Immediate, welcoming.
- **Learning behavior rewarded.** Completing the full learn-by-experience loop once.

### 2. Caught in the Act
- **Purpose.** Celebrate the first time the player *correctly recognizes* a bias (not just completes a scenario).
- **Unlock philosophy.** First correct bias recognition. Reinforces that recognition — not mere participation — is the goal.
- **Learning behavior rewarded.** Accurate recognition of a trap.

### 3. Family Scholar
- **Purpose.** Reward understanding a whole bias family.
- **Unlock philosophy.** Encounter and correctly recognize both biases in any one category. Repeatable per family (one achievement, tracked per category) or one-per-family — decided at seed time; either way, no grind.
- **Learning behavior rewarded.** Grasping a shared mental mechanism across related biases.

---

## Mastery

### 4. Bias Tamed
- **Purpose.** Reward true mastery of a single bias.
- **Unlock philosophy.** Reach mastery on one bias (sustained correct recognition across varied contexts, per the mastery signal) — not a raw play count.
- **Learning behavior rewarded.** Durable, context-independent command of one bias.

### 5. Blind Spot Cleared *(transfer)*
- **Purpose.** Reward recognizing a single bias across many *distinct* domains — the core transfer milestone.
- **Unlock philosophy.** Recognize the same bias correctly in N different domains (money, work, health, relationships…). This is the hardest, most meaningful learning signal.
- **Learning behavior rewarded.** Transfer — the reflex generalizing beyond one situation.

### 6. Clear Sight *(mastery capstone)*
- **Purpose.** Recognize mastery across the whole MVP bias set — the learning capstone.
- **Unlock philosophy.** Reach mastery on all 12 MVP biases. The rarest MVP achievement; pure learning, no grind.
- **Learning behavior rewarded.** Broad, durable mastery of the full curriculum.

### 7. Full Spectrum
- **Purpose.** Reward completing every bias family.
- **Unlock philosophy.** Achieve Family Scholar across all 6 categories. Signals a complete mental map of the territory.
- **Learning behavior rewarded.** Breadth of understanding across all mechanisms.

---

## Consistency (forgiving)

### 8. Habit Forming
- **Purpose.** Reward early consistency without pressure.
- **Unlock philosophy.** Practice on several distinct days within a short window (grace/repair days apply — a missed day doesn't reset the spirit of it). Encouraging, never punishing.
- **Learning behavior rewarded.** Turning learning into a light, sustainable habit.

### 9. Steady Mind
- **Purpose.** Reward sustained, honest consistency over a longer span.
- **Unlock philosophy.** Maintain a longer activity streak, forgiving of missed days (streaks never guilt-trip; grace built in). Based on *days with meaningful reps*, not volume.
- **Learning behavior rewarded.** Long-term commitment to the practice.

### 10. Comeback
- **Purpose.** Reward resilience after a rough patch — reframing failure as part of learning.
- **Unlock philosophy.** Recover a run of correct recognitions after a streak of misses on tricky biases. Celebrates persistence through productive failure.
- **Learning behavior rewarded.** Bouncing back; treating misses as blind spots found, not defeats.

---

## Curiosity

### 11. Explorer
- **Purpose.** Reward sampling the full breadth of the game.
- **Unlock philosophy.** Play at least one scenario from every category. Rewards exploration of the whole territory early.
- **Learning behavior rewarded.** Curiosity across all bias families.

### 12. Deep Diver
- **Purpose.** Reward going beyond the answer to genuinely engage with the teaching.
- **Unlock philosophy.** Complete several reflections and/or engage with full explanations across scenarios. Rewards depth of engagement, not clicks.
- **Learning behavior rewarded.** Reflective, elaborative learning that drives transfer.

### 13. Rising to the Challenge
- **Purpose.** Reward voluntarily taking on harder content.
- **Unlock philosophy.** Successfully complete Advanced (or Expert) scenarios. Rewards stretching into difficulty when ready — never forced.
- **Learning behavior rewarded.** Seeking desirable difficulty; growth mindset.

---

## Metacognition

### 14. Well Calibrated
- **Purpose.** Reward knowing what you actually know — closing the gap between confidence and accuracy.
- **Unlock philosophy.** Demonstrate good confidence calibration over time (before/after confidence tracking correct outcomes). Directly teaches the antidote to overconfidence.
- **Learning behavior rewarded.** Metacognition — honest self-assessment, the deepest thinking skill MindShift trains.

---

## Deliberately excluded (anti-grind)

To keep the catalog honest, these are **explicitly not** achievements:

- "Play 100 scenarios" / "Earn X total XP" — volume/grind.
- Login-count or days-registered milestones — time served.
- Speed records that reward guessing over understanding.
- Anything a player would chase at the expense of actual learning.

---

_Consistent with [ContentStrategy.md §10](../product/ContentStrategy.md), [GameDesign.md](../product/GameDesign.md), and the `achievements` structure in the [Database Schema](../database/DatabaseSchema.md). Numeric criteria and copy are finalized at seed authoring; this catalog fixes the set and its intent._
