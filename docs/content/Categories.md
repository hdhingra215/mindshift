# MindShift — Content Categories

**Status:** Draft v1 · **Owner:** Product / Learning Design · **Last updated:** 2026-07-23

The MVP content categories, one per **bias family** defined in [ContentStrategy.md §3](../product/ContentStrategy.md). Categories organize learning (introduce related biases together), power the bias codex, and structure category-completion achievements. Editorial reference only — no schema, no seed data. Each maps to a `categories` row when content is authored; a bias belongs to exactly one primary category.

> **6 categories** — the six bias families. Each teaches a distinct underlying mental shortcut.

---

## 1. Memory & Availability

- **Purpose.** Teach that the mind mistakes *ease of recall* for *truth, frequency, or importance*. What comes to mind first feels most real — and usually isn't.
- **Target learning outcomes.** Players learn to ask "is this actually likely, or just memorable?"; to notice when a vivid, recent, or dramatic example is steering a judgment; and to seek base rates over anecdotes.
- **Typical scenario themes.** Risk estimation after a dramatic news story; judging frequency from recent personal experience; investment or health decisions driven by a vivid anecdote; hiring/first-impression snap judgments.
- **Difficulty progression.** *Beginner:* one obvious vivid example distorting a clear judgment. *Intermediate:* the memorable cue is subtler and the domain less familiar. *Advanced:* availability competes with real evidence the player must weigh. *Expert:* availability interacts with anchoring or overconfidence under ambiguity.

---

## 2. Belief & Evidence

- **Purpose.** Teach how we seek, weigh, and defend beliefs — favoring what confirms us and resisting what threatens what we already think.
- **Target learning outcomes.** Players learn to actively seek disconfirming evidence, to notice when they're only collecting support, and to update beliefs when facts change rather than defending the old view.
- **Typical scenario themes.** Researching a purchase or opinion and only reading agreeable sources; interpreting ambiguous feedback to fit a prior belief; sticking to a conclusion after its basis is debunked; evaluating a teammate's idea you already dislike.
- **Difficulty progression.** *Beginner:* clearly one-sided evidence-gathering. *Intermediate:* selective interpretation of genuinely ambiguous evidence. *Advanced:* belief perseverance after the original reason is removed. *Expert:* confirmation reinforcing overconfidence, with real trade-offs in what to believe.

---

## 3. Decision & Framing

- **Purpose.** Teach that *how* an option is presented — and how we weigh losses against gains — changes the choice, even when the underlying facts are identical.
- **Target learning outcomes.** Players learn to reframe a decision ("what's the same choice worded as a gain vs. a loss?"), to notice loss-aversion pulling them toward inaction or safety, and to decide on substance, not presentation.
- **Typical scenario themes.** "90% survival" vs. "10% mortality" medical choices; discounts framed as gains vs. surcharges as losses; sticking with a default plan/subscription; avoiding a good bet because the loss stings more than the gain pleases.
- **Difficulty progression.** *Beginner:* an obvious framing flip. *Intermediate:* framing embedded in a realistic pitch. *Advanced:* loss aversion vs. a genuinely good risk. *Expert:* framing + default + loss aversion stacked in a high-stakes call.

---

## 4. Value & Anchoring

- **Purpose.** Teach that judgments of worth, cost, and quantity are hijacked by irrelevant reference points and by what's already been spent.
- **Target learning outcomes.** Players learn to question the first number they hear, to judge value on merits rather than reference points, and to ignore sunk costs when deciding what to do next.
- **Typical scenario themes.** Negotiations anchored by an opening offer; "was $200, now $120" pricing; continuing a failing project because of money/time already invested; mental accounting that treats "found" money differently.
- **Difficulty progression.** *Beginner:* a blatant anchor or obvious sunk cost. *Intermediate:* the anchor is plausible and relevant-seeming. *Advanced:* sunk cost disguised as commitment or loyalty. *Expert:* anchoring and sunk cost reinforcing each other with real trade-offs.

---

## 5. Self & Social

- **Purpose.** Teach that we judge ourselves and others by different, self-flattering rules — over-blaming others' character while excusing our own circumstances.
- **Target learning outcomes.** Players learn to consider situational explanations for others' behavior, to apply the same standard to themselves, and to notice self-serving credit/blame asymmetries.
- **Typical scenario themes.** Blaming a late colleague's character vs. your own bad traffic; taking credit for wins but blaming luck for losses; in-group favoritism on a team; judging a stranger's one action as their whole identity.
- **Difficulty progression.** *Beginner:* a clear character-vs-situation misattribution. *Intermediate:* self-serving framing in a believable work story. *Advanced:* competing plausible attributions the player must weigh. *Expert:* attribution errors tangled with in-group bias and hindsight.

---

## 6. Certainty & Prediction

- **Purpose.** Teach that we are more confident, and feel more able to predict, than reality warrants — especially in hindsight.
- **Target learning outcomes.** Players learn to calibrate confidence to evidence, to plan for how things actually go rather than the best case, and to resist "I knew it all along" rewrites of the past.
- **Typical scenario themes.** Estimating how long a project will take; betting on a "sure thing"; reconstructing a past decision as obvious after the outcome is known; over-trusting a first impression or forecast.
- **Difficulty progression.** *Beginner:* obvious overconfidence or planning optimism. *Intermediate:* subtle over-certainty in a realistic forecast. *Advanced:* hindsight bias reshaping judgment of a past call. *Expert:* overconfidence + planning fallacy + hindsight interacting under uncertainty.

---

_Consistent with [ContentStrategy.md](../product/ContentStrategy.md) and the `categories` structure in the [Database Schema](../database/DatabaseSchema.md). Categories are stable; the biases within them are defined in [BiasCatalog.md](./BiasCatalog.md)._
