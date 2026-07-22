# MindShift — Content Strategy

**Status:** Draft v1 · **Owner:** Product / Learning Design · **Last updated:** 2026-07-23

The editorial source of truth for every piece of content in MindShift — biases, scenarios, choices, outcomes, reflections, achievements. It defines *what good content is* and *how it teaches*, independent of implementation. No schema, no SQL, no seed data. It sits beside [GameDesign.md](./GameDesign.md) (the experience bible) and [PRD.md](./PRD.md) (the product bible); where they touch, this document governs the *content itself*, GameDesign governs the *feel of play*, and the [Domain Model](../architecture/DomainModel.md) / [Database Schema](../database/DatabaseSchema.md) govern *structure*.

> **Terminology bridge.** This document uses the editorial difficulty tiers **Beginner · Intermediate · Advanced · Expert**. These map 1:1 onto the schema's `difficulty_level` enum: `easy → Beginner`, `medium → Intermediate`, `hard → Advanced`, `expert → Expert`. Authors think in tiers; the database stores enum values.

---

## 1. Vision

MindShift teaches cognitive biases the way you learn to ride a bike — by doing, wobbling, and correcting, not by reading a manual. Every bias is taught **experientially**: the player is placed inside a realistic decision, makes a choice under mild pressure, and *feels* the trap close before it is named. Only then does the game explain what happened. Insight is the reward; the scenario is the teacher.

The content exists to build a **reflex**, not a vocabulary. A player who can define "anchoring" has learned nothing that transfers. A player who catches themselves anchoring on a first number in a real negotiation has learned the thing that matters. All content is judged against that bar: *does this build the reflex to catch the bias in the wild?*

Three commitments shape every piece of content:

- **Experience before explanation.** The player acts first; the teaching lands second, when it is earned and felt.
- **Realism over abstraction.** Scenarios come from money, work, health, relationships, and daily life — the domains where biases actually cost people.
- **Respect the player.** Adult tone. No condescension, no gamified sugar coating, no lectures. The player is a capable person sharpening a skill.

---

## 2. Learning Philosophy

### How players should learn

Learning in MindShift follows a deliberate arc, repeated every scenario:

1. **Immersion** — the player is dropped into a concrete situation with real stakes and incomplete information, exactly as decisions arrive in life.
2. **Commitment** — they choose. The choice must feel consequential; there is no "I'll come back to this."
3. **Revelation** — the outcome and the bias are surfaced. If they fell into the trap, they feel the "gotcha" — the productive discomfort that makes a lesson stick.
4. **Understanding** — the outcome explains the *mechanism*: why the mind does this, why it fired here, how it distorted the choice.
5. **Transfer** — the counter-strategy and reflection connect the lesson to the player's own life, so the pattern generalizes beyond this one scenario.

This mirrors how expertise actually forms: **desirable difficulty** (making the player struggle a little improves retention), **immediate feedback**, **elaboration** (explaining the why), and **spaced, varied practice**.

### How scenarios reinforce understanding

- **Recognition across contexts, not repetition of one.** A bias is only "learned" when the player recognizes it in domains they have not seen it in before. Content deliberately reintroduces each bias in fresh clothing — different domain, different framing, different stakes — so mastery means *pattern recognition*, not *scenario memorization*.
- **Interleaving.** Later content mixes biases so the player must first *identify which trap is in play* before countering it — the real-world skill. Early content isolates one bias at a time to build vocabulary.
- **Spaced resurfacing.** Biases the player has met resurface after a gap (and sooner if mastery is decaying), turning single exposures into durable memory. This is why mastery decays gently over time — to prompt review, never to punish.
- **Productive failure.** A wrong choice is never a dead end or a penalty. It opens the most valuable teaching moment. Missing a bias should feel like *discovering a blind spot*, not *losing*.

### How replayability works

Replayability is a **learning mechanism**, not a retention trick. It comes from:

- **Varied contexts per bias** — the same bias authored across many domains, so replay is re-practice in new situations.
- **Interleaved sets** — the order and combination of scenarios changes what skill a session exercises.
- **Adaptive resurfacing** — weak and decaying biases are prioritized, so no two players' review paths are identical, and a returning player is always served what they most need to revisit.
- **Depth on repeat** — a player replaying a scenario they once failed should be able to succeed *and* recognize why, closing the loop. Replay proves growth to the player.

Replay must never feel like grinding the same content for points. If a replay teaches nothing new, it has failed this strategy.

---

## 3. Cognitive Bias Taxonomy

Biases are grouped into **families** — categories that share an underlying mental shortcut. Families exist to organize learning (introduce related biases together), power the bias "codex," and structure category-completion achievements. A bias lives in exactly one primary family for clarity, even when it has secondary affinities.

### Bias families

1. **Memory & Availability** — biases from what comes to mind easily. *Examples: availability heuristic, recency bias, salience/vividness bias.* The mind mistakes "easy to recall" for "likely" or "important."

2. **Belief & Evidence** — biases in how we seek, weigh, and protect beliefs. *Examples: confirmation bias, belief perseverance, disconfirmation avoidance.* We defend what we already think.

3. **Decision & Framing** — biases from how options are presented and how we weigh gains vs. losses. *Examples: framing effect, loss aversion, default/status-quo bias.* The same choice, framed differently, flips our decision.

4. **Value & Anchoring** — biases in how we judge worth, cost, and numbers. *Examples: anchoring, sunk cost fallacy, mental accounting.* Irrelevant reference points hijack our sense of value.

5. **Self & Social** — biases about ourselves and other people. *Examples: fundamental attribution error, self-serving bias, in-group bias, hindsight bias about others.* We judge ourselves and others by different, self-flattering rules.

6. **Certainty & Prediction** — biases in confidence and forecasting. *Examples: overconfidence effect, hindsight bias, planning fallacy, optimism bias.* We are surer, and more predictable to ourselves, than reality warrants.

### How biases relate to each other

- **Reinforcing pairs** — some biases stack and amplify each other (e.g., *confirmation bias* feeds *overconfidence*; *anchoring* deepens *sunk cost*). Advanced content pairs these deliberately.
- **Opposing framings** — some biases are best understood against their mirror (e.g., *loss aversion* vs. *optimism bias*; *recency* vs. *anchoring on the first*). Teaching one clarifies the other.
- **Shared mechanism** — biases within a family share a root cause; understanding the family mechanism accelerates learning each member.
- **Cross-family cousins** — a few biases (e.g., *hindsight bias*) touch multiple families; the codex may cross-link these while keeping a single primary family.

These relationships drive content sequencing: introduce a family's anchor bias first, then its cousins, then interleave across families, then combine reinforcing pairs at higher difficulty.

### Recommended MVP scope

**12 biases across the 6 families (2 per family).** Rationale:

- **Breadth without dilution.** Six families give players a mental map of the whole territory; two biases each is enough to teach a family's mechanism without shipping a shallow survey.
- **Authorable at premium quality.** Each bias needs multiple scenarios across multiple domains and difficulty tiers. Twelve biases is the largest set that can be authored to MindShift's quality bar for MVP, not the largest set possible.
- **Progression headroom.** Twelve supports a satisfying beginner-to-expert arc and category-completion achievements, while leaving the obvious expansion path (more biases per family) for post-MVP.

Recommended MVP anchor biases (one high-recognition bias per family to lead with): *availability heuristic, confirmation bias, framing effect, anchoring, fundamental attribution error, overconfidence effect.* The second bias per family is chosen for contrast or reinforcement with the anchor.

> Exact bias selection is finalized during authoring, not fixed here. This section defines the *shape* of the MVP library, not its literal contents (no seed data per this phase).

---

## 4. Difficulty Framework

Four tiers. Difficulty is about **cognitive challenge and subtlety**, never about obscurity, trick wording, or withheld information. A harder scenario is one where the bias is better disguised and the correct reasoning is more demanding — not one where the writing is less clear.

| Tier | Schema enum | The player's job |
|---|---|---|
| **Beginner** | `easy` | Meet one bias in an obvious, single-domain situation. Build vocabulary and the basic recognition reflex. |
| **Intermediate** | `medium` | Recognize a bias when it is less flagged, in a less familiar domain, among believable alternatives. |
| **Advanced** | `hard` | Identify which of several possible biases is actually driving the situation; resist a well-disguised trap. |
| **Expert** | `expert` | Untangle interacting/reinforcing biases under ambiguity, where even strong choices carry trade-offs. |

### What changes as difficulty increases

- **Subtlety of the trap** — from clearly signposted to deeply embedded in plausible reasoning.
- **Ambiguity** — from one clearly better choice to genuine trade-offs where the "best" answer is defensible rather than obvious.
- **Bias interplay** — from one isolated bias to multiple interacting biases the player must disentangle.
- **Domain distance** — from familiar everyday domains to less familiar or higher-stakes contexts, stretching transfer.
- **Distractors** — from one weak wrong option to several strong, believable alternatives.
- **Reasoning depth** — from "spot the bias" to "spot it, name why it fired, and choose the least-distorted path."
- **Support** — heavier scaffolding (hints, guiding framing) early; lighter or none later.

What does **not** change: clarity of writing, fairness of the setup, and the presence of a genuine lesson. Difficulty never comes from ambiguity in *what is being asked* — only from difficulty in *the thinking itself*.

---

## 5. Scenario Design

A scenario is one realistic decision situation. It is the atomic unit of teaching.

- **Length.** Short. Roughly **40–120 words** of context — enough to establish a believable situation and real stakes, short enough to read on mobile in under a minute. Beginner scenarios sit at the short end; Expert scenarios may run longer to support ambiguity, but brevity is always a virtue. Every sentence must earn its place.
- **Writing style.** Concrete, second-person ("You are…"), present tense, grounded in specifics (a number, a name, a deadline). Adult, plain, and neutral — the prose must not tip the player off to the trap. No jargon, no psychology terms in the setup (those belong in the outcome).
- **Realism.** Situations are drawn from real life — money, work, health, relationships, consumer choices, teamwork. A player should think "this could be me." No contrived puzzles or fantasy framings that let the player treat it as an abstract game.
- **Ambiguity.** Calibrated to tier. Beginner scenarios have a clearly better choice; Expert scenarios present genuine trade-offs. Ambiguity is always *honest* — never created by hiding information the player would reasonably have. If a real person in this situation would know something, the player knows it too.
- **Branching.** MVP scenarios are **single-decision** (one situation → one choice → one outcome), matching the domain model (an attempt records one choice). Multi-step branching narratives are explicitly a **future** capability (see §12 and Story Mode) and must not be assumed by authored content now. This keeps the core loop short, the data model clean, and every scenario independently reusable and interleavable.
- **Replayability.** Each scenario is authored to stand alone and to be resurfaced. It teaches one primary bias clearly enough that a returning player can succeed on replay and recognize *why* — proving growth.
- **Educational goals.** Every scenario declares (for authors, not players) its **primary bias**, its **domain**, its **difficulty tier**, and the **one thing the player should take away**. If a scenario cannot state its single takeaway in one sentence, it is not ready.

---

## 6. Choice Design

Choices are how the player commits. They are where the trap lives.

- **Believability first.** Every choice must be something a reasonable person might actually do. A choice no one would pick is wasted space and signals the answer.
- **No obvious correct answer.** The biased choice must be *attractive* — it should feel like the natural, sensible move, because that is exactly why real people fall for the bias. If the trap is obviously wrong, the scenario teaches nothing.
- **The trap is the point.** At least one choice embodies the target bias and should feel *right* to someone under its influence. The better choice requires the player to resist the pull, not to spot an obviously silly option.
- **Parallel and fair.** Choices are similar in length, tone, specificity, and confidence. No choice is tells-worthy by its wording (longer, hedged, or more detailed answers must not correlate with correctness). No "all of the above," no joke options.
- **Count.** Typically **3–4 choices.** Enough for real distractors, few enough to decide quickly on mobile. Higher tiers lean toward 4 with stronger distractors.
- **Independence from order.** Correctness must never depend on position; presentation order can vary. No positional patterns across the library.

---

## 7. Outcome Design

The outcome is the payoff — where experience becomes understanding. It fires *after* the choice and carries the full teaching load.

**Explanation structure** (consistent every time, so players learn the rhythm):

1. **What happened** — the concrete consequence of the player's choice, tied to the scenario.
2. **The bias named** — which cognitive bias was in play, stated plainly.
3. **The mechanism** — *why* the mind does this and *why it fired here*: the shortcut, the trigger, the distortion.
4. **The counter-strategy** — one concrete, memorable tactic to catch or defeat this bias next time.
5. **The transfer** — a brief bridge to real life: where this shows up beyond the scenario.

**Learning feedback.** Feedback teaches, it never merely judges. A correct choice still explains the bias that *could* have fired and why the player's reasoning was sound — recognition is reinforced, not just rewarded. Feedback is specific to the choice the player made, not generic.

**Encouragement.** Supportive and honest. A miss is framed as a discovered blind spot and a normal feature of every human mind — the player is in good company, and now they see it. Never shaming, never falsely congratulatory. The tone respects that being wrong is how the reflex is built.

**Educational tone.** Adult, warm, plain-language, and accurate. Explains like a sharp, kind mentor — never a textbook, never a cheerleader. Psychology is made concrete and personal. Accuracy is non-negotiable: no oversimplification that misrepresents the science.

> **AI note.** AI personalizes explanations (adapting depth, tone, and connecting to the player's history) on top of an authored, reviewed baseline. The authored outcome is the source of truth and the fallback; AI enhances, never invents unreviewed teaching. (Per CLAUDE.md AI Guidelines and GameDesign.md.)

---

## 8. Reflection Design

Reflection converts a single insight into transferable understanding. It is optional but encouraged, and it is where learning is personalized by the player themselves.

- **Reflection prompts** are short, open, and personal — they ask the player to connect the bias to *their own* life, not to restate the lesson. Good: "When have you anchored on a first number recently?" Bad: "What is anchoring?" Prompts invite honesty, never test recall. One focused question, not many.
- **Writing style.** Warm, curious, non-judgmental, specific to the bias just experienced. A prompt should feel like a thoughtful friend asking, not a quiz.
- **Reflections are immutable once created** (per the accepted architecture — see [DomainModel.md](../architecture/DomainModel.md) and [RLSStrategy.md](../database/RLSStrategy.md)): a reflection captures an honest in-the-moment takeaway. This is intentional editorially — the value is the snapshot of thinking at that moment, not a polished essay. Content and UX must set that expectation (reflect honestly, not perfectly).

**Confidence scores.** The player optionally rates confidence **before** (how sure they are of their choice) and **after** (how sure they are they understand the bias) on a 0–100 scale.

- **Purpose.** Confidence is a *metacognition* tool — it surfaces the gap between feeling right and being right, which is itself a lesson (especially for overconfidence). A large before-confidence paired with a wrong choice is a teachable, memorable moment.
- **Use, honestly.** Confidence data personalizes coaching and review (targeting overconfident blind spots) and shows the player their own calibration over time. It is never used to shame, gate content, or manipulate. Confidence is a mirror, not a score to optimize.

---

## 9. XP Economy

*(Philosophy only — no exact numbers this phase.)*

XP is **scaffolding that points back toward intrinsic growth**, never the point of play (per GameDesign.md §Reward Philosophy). Principles:

- **Reward learning, not clicks.** XP flows from meaningful engagement — a considered decision plus engaging with the feedback — not from guessing, speed, or volume. Correct recognition and genuine reflection earn more than blind taps.
- **Reward transfer, not memorization.** Recognizing a bias in a *new* context is worth more than repeating a mastered scenario. XP tapers on pure repetition so it can never become a grind.
- **Fair and legible.** Players should intuitively understand why they earned what they earned. XP feels *earned*, never arbitrary or pay-gated.
- **Honest variable reward.** Any surprise/bonus XP is used sparingly and honestly for delight — never as slot-machine manipulation or artificial scarcity.
- **Levels signal journey, not status to grind.** Cumulative XP raises account level, which signals stage and unlocks content — never a wall to grind past.
- **Mastery, not XP, is the true measure.** XP tracks activity; per-bias mastery tracks learning. Content and rewards must keep that hierarchy clear.

Exact XP values, curves, and level thresholds are tuned during economy design against these principles.

---

## 10. Achievement Philosophy

Achievements celebrate **genuine learning and meaningful milestones** — moments worth being proud of — never time served or repetition.

**Deserves an achievement:**

- Mastering a bias (sustained correct recognition across varied contexts).
- Recognizing one bias across N *distinct* domains — the transfer milestone.
- Completing a bias family/category.
- A comeback: recovering after a run of misses on a tricky bias.
- A first perfect run through a scenario set.
- Sustained, honest consistency (streak-based, but forgiving — see below).
- Metacognitive growth: well-calibrated confidence over time.

**Never an achievement:**

- Pure grind ("play 100 scenarios," "earn 10,000 XP").
- Time served or login-count milestones.
- Anything that rewards volume over understanding, or that a player would chase at the expense of actual learning.

**Guardrails.** No dark patterns: no guilt-tripping streak mechanics, no artificial scarcity, no engagement-bait achievements. If an achievement would pull a player *away* from learning to chase the badge, it does not ship. Every achievement should, on reflection, feel like recognition of real growth.

---

## 11. Content Quality Standards

Every scenario must pass this checklist before it ships. If any item fails, it is not done (this operationalizes CLAUDE.md's Definition of Done for content).

**Learning**
- [ ] Teaches exactly one clearly-identified **primary bias**.
- [ ] Has a one-sentence stated **takeaway**.
- [ ] Builds the **reflex to catch the bias**, not just to define it (transfer, not recall).
- [ ] Psychology is **accurate** and not misleadingly oversimplified.

**Scenario**
- [ ] Realistic, concrete, second-person; within the tier's length budget.
- [ ] Setup does **not** telegraph the trap or use psychology jargon.
- [ ] Ambiguity is honest — no information a real person would have is hidden.
- [ ] Difficulty tier is correctly assigned (subtlety, not obscurity).

**Choices**
- [ ] 3–4 believable choices; every wrong option is a plausible real choice.
- [ ] The biased choice is **attractive** — no obvious correct answer.
- [ ] Choices are parallel in length/tone/specificity; wording gives nothing away.
- [ ] Correctness is independent of choice order/position.

**Outcome**
- [ ] Follows the five-part structure (what happened → bias → mechanism → counter → transfer).
- [ ] Feedback is specific to the chosen option and teaches even on a correct answer.
- [ ] Tone is supportive, honest, adult; a miss reads as a blind spot found, not a loss.

**Craft & standards**
- [ ] Reflection prompt (where present) is personal and open, not a recall quiz.
- [ ] Inclusive, respectful, globally understandable; no culturally narrow or exclusionary framing.
- [ ] Accessible language (plain, readable); no reliance on idioms that don't translate.
- [ ] Reviewed for accuracy and tone by a second person before publish.
- [ ] Correctly tagged: primary bias, family, domain, difficulty tier.

---

## 12. Future Expansion

The framework is built so the following extend it **without redesign** — new content inherits the same standards, structure, and quality bar.

### AI-generated scenarios

- **Same rules, new author.** AI-generated scenarios must satisfy *this entire document* — the same taxonomy, difficulty framework, choice/outcome/quality standards. AI is a content *author*, held to the human bar, not a shortcut around it.
- **Human-reviewed before publish.** Per CLAUDE.md and GameDesign.md guardrails, AI content is reviewed/constrained for accuracy and on-brand tone before it reaches players. Content is tagged by source (authored vs. AI-generated — already modeled in the schema) so provenance is always known.
- **Graceful fallback.** If AI is unavailable, the game runs on authored content. AI makes the library feel infinite and personal; it never becomes a single point of failure for the core experience.
- **Guarded generation.** AI generation is scoped by family, bias, domain, and tier so output stays on-taxonomy and balanced — never off-topic or duplicative.

### Community-created content

- **Deferred, not designed away.** Third-party authoring is explicitly out of scope for MVP (per PRD), but the model supports it later: community scenarios are ordinary content flagged by source, entering a **moderation and review pipeline** before publish.
- **Quality gate, not open firehose.** Community content passes the same §11 checklist plus moderation for safety, accuracy, and originality. Reputation/curation systems can gate who authors and what auto-publishes.
- **Attribution and safety.** Authorship attribution, content licensing, and abuse handling are prerequisites before any community authoring ships — designed alongside it, not bolted on.

New modes (Story Mode branching narratives, Daily Challenges, AI Coach) reuse these same content atoms and standards; they are new *framings* over the same well-authored biases, scenarios, choices, and outcomes — never a new content model.

---

_This document is the permanent editorial source of truth for MindShift content. When a content request conflicts with it, surface the conflict before authoring. Keep it consistent with GameDesign.md, PRD.md, and the Domain Model as the product evolves._
