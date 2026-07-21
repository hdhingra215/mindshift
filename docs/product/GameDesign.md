# MindShift — Game Design Document

**Status:** Draft v1 · **Owner:** Game Design · **Last updated:** 2026-07-21

Defines how MindShift plays from the player's perspective. Behavioral psychology + game design + AI, in service of building real thinking skills. No implementation or technical architecture here — this is the design bible for the experience.

---

## 1. Game Overview

**What it is.** A single-player decision game. Players face realistic scenarios, make choices under pressure, and discover the cognitive biases steering their judgment — then learn to counter them. Short, rewarding loops; premium feel; adult tone.

**Core fantasy.** *"I'm sharpening my mind."* The player is a thinker in training — outsmarting their own brain, catching the traps most people fall into, watching their judgment measurably improve.

**Learning through gameplay.** Biases aren't taught in lectures; they're *experienced*. The player falls into a trap, feels the "gotcha," then understands why. Insight is the reward, and the gameplay is the teacher. Every mechanic exists to reinforce recognition and transfer.

---

## 2. Core Gameplay Loop

From open to multiple scenarios completed:

1. **Open app** → land on dashboard: progress, streak, and a clear "Play" call to action.
2. **Start session** → game serves a scenario at the player's current difficulty/mastery.
3. **Read scenario** → realistic situation with context and stakes.
4. **Decide** → choose a response (single choice, ranking, or limited picks).
5. **Reveal outcome** → immediate result of the choice.
6. **Bias reveal** → the game names the bias(es) at play; the "aha" moment.
7. **AI explanation** → personalized, plain-language why-it-happened and how-to-counter-it.
8. **Reflect** → short prompt or takeaway the player internalizes.
9. **Reward** → XP, mastery update, streak progress, any achievement unlock — with satisfying feedback.
10. **Continue or exit** → next scenario served seamlessly, or a clean session summary if stopping.
11. **Session summary** → reps completed, XP gained, biases practiced, growth shown; nudge to return.

The loop is fast, self-contained per scenario, and chains smoothly so "just one more" feels natural.

---

## 3. Session Design

- **Average session:** 3–7 minutes; ~3–6 scenarios.
- **Quick play:** a single scenario in under a minute — usable in a spare moment.
- **Longer sessions:** players can chain scenarios freely; the loop supports 15+ minute runs without fatigue via variety and pacing.
- **Mobile-first:** designed for one-thumb play on a phone. Large tap targets, minimal reading load per screen, no dependence on hover, instant resume. Desktop is an enhancement, not the baseline.
- **Interruptible:** progress saves per scenario; leaving mid-session never loses reps.

---

## 4. Player Journey

- **First launch (Discover):** fast onboarding — one guided scenario that delivers an "aha" within 60 seconds. No long tutorial. The hook is the first bias reveal.
- **Early play (Learn):** encounters a starter set of common biases; builds vocabulary; sees XP and progress accumulate.
- **Building habit (Return):** streaks, next-action clarity, and visible growth pull the player back. Difficulty begins to adapt.
- **Growth (Practice):** revisits biases in new contexts; mastery per bias rises; harder, subtler scenarios appear.
- **Mastery (Master):** recognizes biases quickly across varied situations; unlocks advanced content; growth curve visible over weeks/months.
- **Long-term (Sustain):** future modes (story, daily, AI-infinite) keep the experience fresh; player self-identifies as a sharper thinker.

---

## 5. Progression System

- **XP:** earned for meaningful engagement with the loop — decision + understanding the feedback — not for guessing. Correct recognition and reflection earn more than blind clicks.
- **Levels:** overall account level from cumulative XP; signals journey stage, unlocks features/content at thresholds. Never a pay/grind wall.
- **Mastery:** per-bias skill rating that rises with correct recognition across varied contexts and decays gently if untouched, prompting review. Mastery — not raw XP — is the true measure of learning.
- **Streaks:** reward consistency (days with meaningful reps). Encouraging, never punishing — no guilt-tripping, forgiving of missed days (e.g., grace/repair), because habit should feel supportive.
- **Unlocks:** new bias categories, scenario packs, harder tiers, cosmetic/profile flourishes, and future modes — earned through progress, gating depth not core play.

Progression rewards *learning*, never memorization or time-served.

---

## 6. Scenario System

- **Structure:** a title/setup, realistic context, clear stakes, and a decision point. Concise — readable on mobile in seconds.
- **Choices:** 2–4 options (or ranking/limited-pick variants). Each choice maps to a thinking pattern; the "trap" options embody specific biases. No obviously-dumb filler answers — plausible options make the trap real.
- **Outcomes:** immediate, believable consequence of the choice. Shows what the bias led to, good or bad.
- **AI explanations:** personalized, plain-language breakdown — which bias, why it fired, how it distorted the choice, and a concrete counter-strategy. Adapts tone/depth to the player.
- **Reflection:** a short takeaway or prompt ("Where might this bias you this week?") to cement transfer. Optional but encouraged; kept lightweight.

Scenarios span life domains (money, work, health, relationships, media) so learning feels relevant and transfers broadly.

---

## 7. Difficulty System

- **How it increases:** subtler biases, higher-stakes context, multiple biases per scenario, less obvious traps, time or information pressure, and combined-concept scenarios at higher tiers.
- **How players improve:** repetition across varied contexts, spaced revisiting, targeted practice on weak biases, and mastery-gated advancement so harder content arrives only when ready.
- **Avoiding frustration:** difficulty adapts to mastery (no sudden walls); wrong answers teach rather than block; no permanent failure; supportive pacing; hints or easier variants when a player struggles repeatedly. Challenge should feel *fair and earned* — flow, not frustration.

---

## 8. Cognitive Bias System

- **Introduction:** biases are introduced experientially — the player meets one inside a scenario, falls into or spots it, then it's named and explained. New biases unlock gradually to avoid overload.
- **Mastery tracking:** each bias has its own mastery signal, rising with correct recognition in diverse contexts and softening over time to surface review needs. A player's bias map shows strengths and blind spots.
- **Revisiting:** spaced repetition resurfaces learned biases in fresh scenarios; weak biases are prioritized; a bias "library/codex" lets players review concepts and counters anytime. Mastery requires recognition across *many* contexts, not one correct answer.

---

## 9. Achievement System

- **Meaningful achievements** reward genuine learning and milestones: mastering a bias, recognizing a bias across N distinct domains, a comeback after a tricky streak of misses, first perfect scenario set, completing a bias category, sustained consistency.
- **No grind-bait:** no "play 1,000 times" busywork, no achievements for meaningless repetition. Each achievement should represent a real skill or journey moment the player is proud of.
- Achievements tell the story of the player's growth — a trophy case of thinking skills, not a chore list.

---

## 10. Reward Philosophy

Rewards motivate *learning*, not compulsion.

- Tie rewards to understanding and mastery, not raw time or clicks.
- Celebrate insight and growth ("you now recognize anchoring across 5 contexts"), not just numbers.
- Use variable reward sparingly and honestly — surprise and delight, never slot-machine manipulation.
- No dark patterns: no artificial scarcity, guilt streaks, or engagement bait.
- The best reward is the "aha" and visible self-improvement; extrinsic rewards support that, never replace it.

---

## 11. Feedback System

- **Visual feedback:** clear, immediate cues on choice and outcome — motion, color, micro-interactions that make results tangible (respecting reduced-motion).
- **Emotional feedback:** the satisfying "gotcha" of a bias reveal and the pride of a correct catch. Encouraging on misses, celebratory on milestones — never shaming.
- **Educational feedback:** names the bias, explains the mechanism, gives a counter-strategy, connects to real life.
- **AI feedback:** personalizes the above — adapts explanation to the player's history, patterns, and level; can highlight recurring blind spots over time.

All four layers fire together at the reveal moment for maximum learning impact.

---

## 12. Motivation System

- **Why they come back:** visible growth, curiosity ("which bias next?"), streak/habit, mastery pursuit, and genuinely fun, bite-sized sessions.
- **Intrinsic (primary):** mastery, curiosity, self-improvement, the pleasure of insight, competence, autonomy. This is the core engine.
- **Extrinsic (supporting):** XP, levels, achievements, streaks, unlocks — scaffolding that points back toward intrinsic growth, never the sole draw.
- Design leans intrinsic-first so motivation is durable and healthy, not dependency-driven.

---

## 13. Replayability

- Large, growing library of scenarios across many domains.
- Adaptive difficulty and spaced repetition keep content matched and fresh.
- Multiple biases and combinations create high variety.
- Mastery decay and review loops give reason to return to old concepts.
- Future modes (daily, story, infinite AI) add new frames on the core loop.
- AI-generated scenarios (future) provide effectively endless novelty.
- Progression and achievements give long-horizon goals over months.

---

## 14. AI Integration

AI enhances, never replaces, the game.

- **Enhances:** personalized explanations, adaptive difficulty, review recommendations, reflection/coaching, and (future) scenario generation and an AI coach.
- **Never replaces:** core game logic, scoring, outcomes, and bias mapping stay deterministic and authored — the game is trustworthy and consistent without AI.
- **Guardrails:** AI content is reviewed/constrained for accuracy and on-brand tone; graceful fallback to authored explanations if AI is unavailable. AI makes the experience feel personal and infinite; the game remains a game with or without it.

---

## 15. Game Balance Principles

- **Fair:** difficulty matches mastery; no cheap traps or unwinnable states; plausible choices only.
- **Educational:** every scenario teaches a real, correctly-represented concept; entertainment never overrides accuracy.
- **Enjoyable:** pacing, variety, and reward keep flow; sessions stay light and satisfying.
- Balance the tension between *fun* and *rigor* so neither wins at the other's expense. Tune reward rates to feel earned, progression to feel steady, and challenge to sit in the flow channel.

---

## 16. Failure Philosophy

Wrong answers are the primary teaching moment, not a punishment.

- No harsh penalties, no lives lost, no dead ends — a miss opens an explanation, not a wall.
- The "gotcha" of falling for a bias is *reframed as the lesson*: "almost everyone does this — here's why, and here's the catch."
- Misses feed mastery review, not shame. Recovering and later recognizing the same bias is celebrated.
- Failing forward: every wrong choice makes the next recognition more likely.

---

## 17. Success Philosophy

Success in MindShift is **becoming a clearer thinker**, not a high score.

- True success = recognizing biases quickly and correctly across varied real-life contexts (rising mastery).
- In-game success moments: correct catches, mastering a bias, growth over time, sustained practice.
- Success is personal and progress-based — measured against the player's own growth, not others (leaderboards are optional/future and never the point).
- The ultimate win is transfer: catching a bias in real life outside the game.

---

## 18. Future Game Modes

- **Story Mode:** narrative campaigns where decisions carry through a connected arc; biases taught in immersive context.
- **Daily Challenges:** a fresh daily scenario/set; streak-friendly; shared prompt for the community.
- **Infinite AI Mode:** endless AI-generated scenarios tuned to the player's mastery — never run out.
- **Team Challenges:** cooperative or comparative play for cohorts, classrooms, or workplaces.
- **Seasonal Events:** themed limited-time scenario packs and challenges to refresh engagement.

All future modes reframe the same trustworthy core loop; none dilute the learning focus.

---

## 19. Design Principles

Every future mechanic must follow these:

1. **Teach through experience** — mechanics create insight, not lectures.
2. **Reward learning, not memorization or grind.**
3. **Fun first** — if it isn't enjoyable, it won't teach.
4. **Fail forward** — mistakes teach; nothing shames or blocks.
5. **Intrinsic over extrinsic** — support mastery and curiosity, avoid addiction loops.
6. **Fair and adaptive** — challenge matches the player; flow, not frustration.
7. **Accurate and honest** — science-grounded; no dark patterns.
8. **Mobile-first and accessible** — playable by anyone, anywhere.
9. **AI enhances, never replaces** core mechanics.
10. **Premium quality** — every mechanic feels intentional and polished.
11. **Reinforce the core loop** — new mechanics deepen recognition and transfer, never distract from them.
