# MindShift — Bias Catalog (MVP)

**Status:** Draft v1 · **Owner:** Product / Learning Design · **Last updated:** 2026-07-23

The initial MVP cognitive biases — **12 biases across the 6 categories** ([Categories.md](./Categories.md)), 2 per family, per [ContentStrategy.md §3](../product/ContentStrategy.md). This is the editorial reference for authoring scenarios and for future seed generation. No schema, no SQL, no seed data. Each bias maps to a `biases` row; the difficulty recommendation is the tier at which the bias is best *introduced* (it later appears across all tiers).

> **Difficulty labels** map to the schema `difficulty_level` enum: Beginner→`easy`, Intermediate→`medium`, Advanced→`hard`, Expert→`expert`.

---

## Category 1 — Memory & Availability

### 1.1 Availability Heuristic *(anchor)*
- **Category:** Memory & Availability
- **Short definition.** Judging how likely or common something is by how easily examples come to mind.
- **Why it matters.** It distorts risk everywhere — fear of rare-but-vivid dangers, ignoring common-but-boring ones — leading to bad money, health, and safety decisions.
- **Real-world examples.** Fearing plane crashes over car rides; overestimating crime after watching the news; judging a product by one memorable review.
- **Common misconceptions.** "I'm using evidence" — but the "evidence" is just what's memorable, not what's representative. It's not the same as being uninformed; informed people fall for it too.
- **Related biases.** Recency bias, salience/vividness (same family); feeds overconfidence.
- **Difficulty recommendation.** Beginner.

### 1.2 Recency Bias
- **Category:** Memory & Availability
- **Short definition.** Overweighting the most recent information or experience when judging or predicting.
- **Why it matters.** It makes people extrapolate the latest trend, over-react to the last data point, and forget the longer pattern — costly in investing, performance reviews, and forecasting.
- **Real-world examples.** Assuming a stock keeps rising because it rose this month; rating an employee on last week alone; judging a whole trip by the final day.
- **Common misconceptions.** "The recent data is the most relevant." Sometimes true, but recency bias applies it blindly, ignoring base rates and older, equally valid evidence.
- **Related biases.** Availability heuristic (reinforcing); anchoring (contrast — first vs. latest).
- **Difficulty recommendation.** Intermediate.

---

## Category 2 — Belief & Evidence

### 2.1 Confirmation Bias *(anchor)*
- **Category:** Belief & Evidence
- **Short definition.** Seeking, favoring, and remembering information that confirms what we already believe.
- **Why it matters.** It quietly shuts down learning and good judgment — we mistake a one-sided search for being well-informed, and never test what we're wrong about.
- **Real-world examples.** Only reading news that agrees with you; researching a purchase to justify the choice you already made; noticing evidence for a hunch and ignoring the rest.
- **Common misconceptions.** "I did my research." Research that only sought support isn't rigor. It's not stupidity or bad faith — it's automatic and affects experts most in their own field.
- **Related biases.** Belief perseverance (same family, reinforcing); feeds overconfidence.
- **Difficulty recommendation.** Beginner.

### 2.2 Belief Perseverance
- **Category:** Belief & Evidence
- **Short definition.** Clinging to a belief even after the evidence that formed it has been discredited.
- **Why it matters.** First impressions and debunked claims keep steering decisions long after they should — in reputations, rumors, and retracted information.
- **Real-world examples.** Distrusting someone after a rumor you later learned was false; holding a health belief after the study was retracted; keeping a first impression despite contrary experience.
- **Common misconceptions.** "I'd change my mind if the facts changed." The facts changing often isn't enough — the belief persists on its own momentum unless actively re-examined.
- **Related biases.** Confirmation bias (reinforcing); anchoring (first belief as anchor).
- **Difficulty recommendation.** Advanced.

---

## Category 3 — Decision & Framing

### 3.1 Framing Effect *(anchor)*
- **Category:** Decision & Framing
- **Short definition.** Deciding differently based on how identical options are worded (as a gain vs. a loss).
- **Why it matters.** Marketers, media, and negotiators exploit framing constantly; recognizing it lets you decide on facts, not phrasing.
- **Real-world examples.** "90% fat-free" vs. "10% fat"; "95% success rate" vs. "5% failure"; discounts framed as gains, fees framed as losses.
- **Common misconceptions.** "The wording doesn't affect a rational person." It affects everyone, reliably — the effect persists even when people are warned about it.
- **Related biases.** Loss aversion (mechanism behind much framing); default/status-quo bias.
- **Difficulty recommendation.** Beginner.

### 3.2 Loss Aversion
- **Category:** Decision & Framing
- **Short definition.** Feeling the pain of a loss more strongly than the pleasure of an equivalent gain, so we over-avoid losses.
- **Why it matters.** It drives inaction, missed opportunities, holding losing investments, and paying too much to avoid small risks.
- **Real-world examples.** Refusing a favorable 50/50 bet; keeping a losing stock to avoid "realizing" the loss; over-insuring against minor risks; staying in a bad plan to avoid a cancellation fee.
- **Common misconceptions.** "Avoiding losses is just being careful." Prudence weighs magnitudes; loss aversion overweights the loss itself, leading to choices that are objectively worse.
- **Related biases.** Framing effect (reinforcing); sunk cost fallacy; status-quo bias.
- **Difficulty recommendation.** Intermediate.

---

## Category 4 — Value & Anchoring

### 4.1 Anchoring *(anchor)*
- **Category:** Value & Anchoring
- **Short definition.** Relying too heavily on the first number or piece of information when judging value or quantity.
- **Why it matters.** The opening figure in any negotiation, price, or estimate silently sets the range — even when it's arbitrary or irrelevant.
- **Real-world examples.** A high sticker price making a discount feel like a deal; the first salary number framing the whole negotiation; an initial estimate dragging every later guess toward it.
- **Common misconceptions.** "I adjusted away from it." People adjust *insufficiently* from anchors — and even random, obviously irrelevant numbers still pull the judgment.
- **Related biases.** Sunk cost fallacy (reinforcing); recency (contrast); belief perseverance.
- **Difficulty recommendation.** Beginner.

### 4.2 Sunk Cost Fallacy
- **Category:** Value & Anchoring
- **Short definition.** Continuing something because of what's already invested (money, time, effort) rather than its future value.
- **Why it matters.** It traps people in failing projects, bad relationships, and unfinished commitments — throwing good resources after bad.
- **Real-world examples.** Finishing a bad movie "because I paid"; staying in a doomed project for the months already spent; holding a failing plan to avoid "wasting" the investment.
- **Common misconceptions.** "Quitting wastes what I put in." It's already gone either way — the only rational question is future value from here. Persistence isn't the same as commitment.
- **Related biases.** Loss aversion (mechanism); anchoring (reinforcing); belief perseverance.
- **Difficulty recommendation.** Intermediate.

---

## Category 5 — Self & Social

### 5.1 Fundamental Attribution Error *(anchor)*
- **Category:** Self & Social
- **Short definition.** Over-attributing others' behavior to their character while under-weighting their situation.
- **Why it matters.** It fuels unfair judgments, conflict, and poor teamwork — we write people off for one action shaped by circumstances we can't see.
- **Real-world examples.** Assuming a late colleague is lazy (not stuck in traffic); judging a stranger's rudeness as their personality; blaming a struggling teammate's character over their workload.
- **Common misconceptions.** "I'm just reading people accurately." We systematically ignore situation for others — while excusing our *own* identical behavior via circumstance.
- **Related biases.** Self-serving bias (contrast — same asymmetry, applied to self); in-group bias.
- **Difficulty recommendation.** Beginner.

### 5.2 Self-Serving Bias
- **Category:** Self & Social
- **Short definition.** Taking credit for successes (our ability) but blaming failures on outside factors (bad luck, others).
- **Why it matters.** It blocks growth and accountability — we can't learn from failures we never own, and we strain relationships by hogging credit.
- **Real-world examples.** "I aced it because I'm smart; I failed because the test was unfair"; a team lead claiming wins but blaming the team for losses.
- **Common misconceptions.** "I'm just being fair to myself." It's an asymmetry, not fairness — the same event gets opposite explanations depending on whether it flatters us.
- **Related biases.** Fundamental attribution error (mirror); overconfidence; confirmation bias.
- **Difficulty recommendation.** Intermediate.

---

## Category 6 — Certainty & Prediction

### 6.1 Overconfidence Effect *(anchor)*
- **Category:** Certainty & Prediction
- **Short definition.** Being more certain about our judgments and abilities than accuracy justifies.
- **Why it matters.** Overconfidence drives under-preparation, ignored risks, and poor decisions across finance, work, and safety — and it's hard to see from the inside.
- **Real-world examples.** Betting big on a "sure" prediction; skipping a backup plan; over-trusting a quick judgment; "I'm definitely right" before checking.
- **Common misconceptions.** "Confidence reflects competence." Confidence and accuracy are often poorly correlated — the least skilled are frequently the most sure.
- **Related biases.** Hindsight bias (reinforcing); confirmation bias; availability heuristic.
- **Difficulty recommendation.** Intermediate.

### 6.2 Hindsight Bias
- **Category:** Certainty & Prediction
- **Short definition.** Seeing past events as having been predictable once we know how they turned out ("I knew it all along").
- **Why it matters.** It corrupts learning — we can't fairly judge past decisions, we over-blame others for "obvious" misses, and we grow falsely confident in our foresight.
- **Real-world examples.** "That startup's failure was obvious" (after it failed); blaming a doctor/manager for not foreseeing an outcome now known; rewriting a coin-flip call as a sure thing.
- **Common misconceptions.** "It really was predictable." Knowing the outcome makes the path *feel* inevitable; at the time, it genuinely wasn't clear.
- **Related biases.** Overconfidence effect (reinforcing); self-serving bias; belief perseverance.
- **Difficulty recommendation.** Advanced.

---

## MVP set at a glance

| # | Bias | Category | Introduce at |
|---|---|---|---|
| 1 | Availability Heuristic | Memory & Availability | Beginner |
| 2 | Recency Bias | Memory & Availability | Intermediate |
| 3 | Confirmation Bias | Belief & Evidence | Beginner |
| 4 | Belief Perseverance | Belief & Evidence | Advanced |
| 5 | Framing Effect | Decision & Framing | Beginner |
| 6 | Loss Aversion | Decision & Framing | Intermediate |
| 7 | Anchoring | Value & Anchoring | Beginner |
| 8 | Sunk Cost Fallacy | Value & Anchoring | Intermediate |
| 9 | Fundamental Attribution Error | Self & Social | Beginner |
| 10 | Self-Serving Bias | Self & Social | Intermediate |
| 11 | Overconfidence Effect | Certainty & Prediction | Intermediate |
| 12 | Hindsight Bias | Certainty & Prediction | Advanced |

Six **anchor biases** (high-recognition, one per family) lead each family: Availability Heuristic, Confirmation Bias, Framing Effect, Anchoring, Fundamental Attribution Error, Overconfidence Effect. The second bias per family contrasts or reinforces its anchor.

_Consistent with [ContentStrategy.md](../product/ContentStrategy.md) and [Categories.md](./Categories.md). Bias selection is finalized at authoring; this catalog defines the MVP set and its teaching intent._
