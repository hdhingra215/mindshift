# MindShift — Interaction Principles

**Status:** Draft v1 · **Owner:** Design / Product · **Last updated:** 2026-07-23

The source of truth for **every interaction inside MindShift** — how the product moves, responds, rewards, waits, fails, and delights. This is the interaction handbook: a AAA-studio / Apple-design-team-grade reference detailed enough that any future screen feels like it belongs to the same premium product.

**Implementation-independent by design.** No React, CSS, Tailwind, Framer Motion, or shadcn here — only product, UX, and interaction design. It sits above the [Design System](./DesignSystem.md) (tokens, color, motion tiers, spacing) and the [Brand Guidelines](./BrandGuidelines.md) (voice, personality), and serves the experience defined in [GameDesign.md](../product/GameDesign.md) and [PRD.md](../product/PRD.md). Where this document names a duration, easing, color, or spacing value, it references the Design System token by role — it never redefines one.

> **The one-line brief.** MindShift is *a premium game that quietly makes you think.* Every interaction should read as Linear's precision and Apple's restraint, warmed by Duolingo's rewarding progression — with none of the childishness. Reward curiosity constantly; never become noisy.

**North stars for interaction.** It must never feel like a **textbook**, a **quiz app**, a **corporate dashboard**, or a **children's game**. It must feel **calm, intelligent, rewarding, and quietly surprising** — the interface of a sharp, witty mentor who respects the player as a capable adult.

---

## 1. Interaction Philosophy

How every interaction should feel, in priority order.

- **Calm.** The default state is quiet. Nothing pulses, blinks, or competes for attention unless it earns it. Stillness is the canvas that makes a single moment of motion meaningful. One clear focal point per screen (per Design System §9).
- **Intelligent.** Interactions anticipate intent, remember context, and respond with precision. The product feels like it's *thinking with* the player — surfacing the right next action, the relevant tip, the earned reward — never making them hunt.
- **Rewarding.** Progress is felt, not just recorded. Every meaningful action (a correct catch, a reflection, a mastery tick) gets a small, tasteful acknowledgment. The reward is proportionate to the achievement — a whisper for a tap, a warm beat for a milestone.
- **Surprising (quietly).** Delight arrives in small, unexpected, on-brand touches that reward curiosity — a contextual line, a hover that reveals a thought, a milestone that lands just right. Surprise is a seasoning, never the meal.
- **Never distracting.** No interaction ever pulls focus from thinking. Motion, color, and sound serve comprehension and reward; the instant they compete with the player's reasoning, they're wrong. When in doubt, do less.

**The felt arc.** Interactions should carry the player along the brand's emotional journey — *curious → challenged → surprised → enlightened → accomplished* — and never leave them confused, patronized, or bored.

**Responsiveness is respect.** Common interactions feel instant (<100ms perceived, per PRD). Latency is acknowledged immediately (optimistic state, skeleton, or a "thinking" beat) so the player never wonders whether their tap registered. A fast, certain interface signals a product that has its act together.

**Restraint as a feature.** The confidence to *not* animate, *not* celebrate, *not* notify is what separates premium from gamified. Every effect spends attention; spend it only where it buys understanding or earned joy.

---

## 2. Motion Principles

Motion guides attention, explains cause and effect, and rewards progress. It never decorates. Built on Design System §7 (motion tiers) and the Brand animation philosophy.

### Duration (reference the Design System tiers by role)

- **`motion-fast` (120–150ms)** — hover, press, small state changes, toggles, focus. The interface should feel immediate.
- **`motion-base` (200–250ms)** — most enter/exit transitions: cards, list items, tooltips, inline reveals.
- **`motion-slow` (300–400ms)** — larger surfaces: modals, sheets, page/route transitions, the scenario→outcome reveal.
- **`motion-celebrate` (400–700ms)** — reserved *exclusively* for genuine milestones (level up, achievement, mastery, pack completion). If it fires often, it's misused.

**Rule of thumb:** the larger the surface or the more significant the moment, the longer (but never sluggish) the motion. Small things move fast; big things move deliberately.

### Easing

- **Entrances:** ease-out — quick to start, gently settling. Things arrive with confidence and come to rest.
- **Exits:** ease-in — accelerate away. Departing elements don't linger.
- **Movement / repositioning:** gentle ease-in-out — natural, physical.
- **Never linear** for UI motion (reads mechanical). Reserve any spring/overshoot for celebration beats only, and keep it subtle — a hint of life, never a bounce-house.

### Hierarchy of motion

Motion has a spending priority. In any given moment, the *most important* thing may move; everything else holds still.

1. **Feedback motion** (a choice registering, an outcome revealing) — highest priority; always present.
2. **Reward motion** (XP, mastery, unlock) — second; proportionate to significance.
3. **Navigational motion** (route/surface transitions) — orienting, quick, unobtrusive.
4. **Ambient motion** (a slow logo breath, a hover flourish) — lowest; the first to be cut under load or reduced-motion.

Two celebratory motions never fire simultaneously. Reward beats queue and resolve in sequence, briefly, so a single moment reads clearly rather than a scramble.

### When motion should happen

- To show **cause and effect** — where something came from, where it went, what a tap produced.
- To **direct attention** to the one thing that changed or now matters.
- To make **feedback tangible** — the correct/incorrect beat, XP accruing, a bias being named.
- To **reward** a genuine milestone.
- To **soften** state changes so the interface never "jumps."

### When motion should NOT happen

- On elements the player isn't acting on or looking at.
- Repeatedly on the same element (no idle loops competing for attention; the ambient logo breath is the rare, deliberate exception and stays barely perceptible).
- To decorate a static screen "because it feels empty" — fix the emptiness with content (§4), not animation.
- During dense reading (a scenario context should be still while being read).
- When it would delay the player — motion must never gate the ability to proceed. The player can always tap through.

### Accessibility & `prefers-reduced-motion` (first-class)

- **Honor `prefers-reduced-motion` everywhere.** When set: replace movement/scale/parallax with instant state changes or a gentle opacity fade (≤ `motion-fast`). Nothing translates, bounces, or parallaxes.
- **Meaning survives without motion.** Every outcome communicated by motion is *also* communicated by color, icon, text, and layout. Remove all animation and the interface still tells the whole story (a correct answer still reads correct; XP still shows the new total).
- **No motion is ever the sole signal** of success, error, or state.
- **Performance is accessibility.** Prefer transform/opacity-class motion; hold 60fps; never animate expensive layout. A janky animation is worse than none.
- No flashing, strobing, or rapid oscillation, ever (see §13 and §12).

---

## 3. Micro-interactions

Principles for each interactive primitive. Consistent states across the whole product (default, hover, focus-visible, pressed, disabled, loading where relevant), per Design System §9. States communicate through more than color (§12).

**Buttons.**
- Primary buttons are rare and precious — one clear primary action per view, in the terracotta accent. Everything else is secondary/tertiary (neutral).
- Hover: a subtle lift or surface-lightening (`motion-fast`). Press: a small, immediate compress/settle — the button feels physically pushed. Release confirms.
- On async actions: the button itself becomes the loading surface (label → in-place "thinking" state, disabled but not jumpy), never a disconnected spinner elsewhere.
- Disabled buttons look unmistakably inactive and, where useful, hint *why* (via adjacent text or tooltip) rather than silently refusing.

**Inputs.**
- Calm by default; focus brings a clear accent focus ring (Design System `ring`) — never removed.
- Validation is **quiet and late**: validate on blur or submit, not on every keystroke; never flash red while someone is still typing. Errors resolve inline, close to the field, in the gentle error tone with an icon + text (§6).
- Success on a field (where meaningful) is understated — a check, not fireworks. Placeholders hint; they never replace labels.

**Cards.**
- Resting cards are still and flat-forward with subtle depth. Interactive cards signal it on hover (gentle lift/surface-lighten) and give a clear pressed state.
- The whole card is the target where it represents one thing (a scenario, a pack); tap targets are generous (≥44px, Design System §10).
- Selection is obvious without shouting — an accent border or fill shift plus a check/state text, never color alone.

**Dialogs.**
- Enter on `motion-slow` with a soft scrim; focus moves into the dialog and is trapped until dismissed. Escape and scrim-click close (unless a destructive confirmation warrants a deliberate choice).
- One job per dialog. Return focus to the triggering element on close. No stacking dialogs on dialogs.

**Menus.**
- Open on `motion-base`, anchored to their trigger (motion originates *from* the trigger — cause and effect). Full keyboard nav (arrows, Enter, Escape), clear focus-visible on each item.
- Hover and keyboard highlight share one visual language. Close on select, Escape, or outside-click.

**Tooltips.**
- For enrichment, never for essential information. Appear after a short intentional delay on hover/focus (so they don't flicker on pass-through), dismiss instantly on leave.
- Keyboard- and screen-reader-accessible. Concise, in product voice. Tooltips are a place for quiet wit and intelligent tips (§10) — never a dumping ground for critical content.

**Navigation.**
- Orienting and quiet. Current location is always unambiguous (active state via weight/accent + text, not color alone). Route transitions are quick (`motion-slow` max) and directional where it aids the mental model; the player never feels lost or waits on a flourish.
- Mobile-first: primary navigation is thumb-reachable; no reliance on hover.

**Hover.**
- An enhancement layer, never a requirement (mobile has no hover). Reveals affordance and small delight; anything essential is visible or reachable without it. `motion-fast`, subtle.

**Focus.**
- Always visible, always the accent ring, never suppressed. Focus order is logical and matches visual order. Keyboard users get an experience equal to pointer users — including access to hover-revealed content.

**Pressed.**
- Immediate physical acknowledgment on every interactive element (`motion-fast`): a small compress/darken/settle. The player should feel the tap land before anything else happens. This is the single most important "game feel" micro-interaction — it makes the product feel responsive and alive.

**Success (inline).**
- Understated and warm — the muted sage success tone with a check icon and a short human line. A field saved, a setting applied: acknowledge, don't celebrate. Save celebration for genuine milestones.

**Failure (inline).**
- Calm, never alarming — gentle error tone, icon + plain-language text, focus moved to the problem. Never blame, never shout, never block more than necessary (§6).

**Completion (task/step).**
- A clear, satisfying "done" — the element settles into a completed state (check, subtle fill, muted-forward styling) with a brief `motion-base` transition. Completion should feel *resolved*, like a drawer clicking shut.

**Unlocks.**
- The reveal of newly available content (a bias, a tier, a pack, a feature). A tasteful entrance — the new thing arrives with a short `motion-base`–`motion-celebrate` beat and a one-line "what this is / why it's exciting." Framed as *reveal, not restriction* (per Levels §5): "New territory to explore," never "You finally earned this."

**XP gain.**
- Tangible but restrained. XP animates *toward* the progress meter (cause and effect — it goes somewhere), the number counts up briefly, the meter fills with a gentle `motion-base`. No coin showers, no slot-machine roll. XP is scaffolding (per GameDesign §10) — acknowledge it and move on. Under reduced motion: number and meter update instantly.

**Level up.**
- A genuine milestone → `motion-celebrate`. A brief, elegant moment names the new level title and its meaning (per Levels.md, e.g. "Clear Thinker — you recognize common biases reliably now") and any unlock. Warm, tasteful, over in under a second, dismissible. Delight without spectacle — no full-screen confetti (§13).

**Achievement unlock.**
- `motion-celebrate`, sequenced (never simultaneous with a level up — they queue). The achievement presents its name, its meaning, and *why it reflects real growth* (per Achievements.md), not just a badge. Feels like recognition from a mentor, not a pop-up prize. Reviewable later in a calm trophy case; the unlock moment is brief and skippable.

**Streak.**
- Encouraging, forgiving, never guilt-tripping (§13, GameDesign §5). A streak advancing is a small warm acknowledgment. A streak *at risk* is a gentle, optional, non-anxious nudge (warning tone, calm copy) — never a countdown of doom. Grace/repair days are surfaced kindly. Losing a streak is reframed, never punished.

---

## 4. Empty States

Every empty state must **teach, encourage, or delight**. Never a dead "No data." An empty state is a first impression and a coaching opportunity — it should feel intentional, on-brand, and always offer a clear next step.

Principles:
- Explain *why* it's empty and *what to do next* — with one obvious action.
- Warm, human, in product voice. A calm illustration or a single expressive icon where it adds warmth (per Brand illustration style), never clip-art.
- Turn absence into anticipation: hint at what will fill this space.

Examples (copy direction, adapt per surface):

- **Dashboard, brand-new player:** *"Your mind, before training. Play one scenario and watch this space start telling your story."* → **Play your first scenario.**
- **Progress / stats, no reps yet:** *"Nothing to chart yet — every scenario you play draws the next line. Let's make the first mark."*
- **Bias codex, none encountered:** *"Twelve mental traps live here. You'll unlock each one by meeting it in the wild. First up when you're ready."*
- **Achievements, none earned:** *"An empty trophy case is just a case full of potential. Your first insight is one scenario away."*
- **Reflections, none written:** *"This is where your own thinking gets recorded. Answer a reflection after a scenario and your words land here — honest, not polished."*
- **Session history, none:** *"No sessions yet. The best time to start was earlier; the second best is now."*
- **Mastery map, all unstarted:** *"A clean map. Each bias you practice lights up its own corner — and shows you your blind spots, kindly."*
- **Search / filter, no matches:** *"Nothing matches that — yet. Try a broader filter, or explore a pack to see what's here."*
- **Completed everything available:** *"You've cleared everything we've got right now — genuinely impressive. New scenarios are always in the works; your streak and mastery are safe while you wait."*
- **Notifications, none:** *"All quiet. We'll only reach out when there's something genuinely worth your attention."*
- **Streak, not started:** *"No streak going — no pressure. Consistency beats intensity; a few minutes on a few days is the whole trick."*
- **Offline / no connection:** *"You're offline. Your progress is safe — we'll pick up exactly where you left off the moment you're back."*

Every empty state ends pointing forward, never at a wall.

---

## 5. Loading States

The game is **thinking**, not spinning. Never a bare spinner. Loading is an opportunity to reinforce personality and set expectations — a moment that says *"something considered is being prepared for you."*

Principles:
- Prefer **skeletons** that mirror the incoming layout for content loads (so the page assembles rather than pops).
- For meaningful waits (a session preparing, AI generating an explanation), pair a calm progress indicator with a **rotating, on-brand message** that frames the wait as the product working intelligently on the player's behalf.
- Messages are in product voice — witty-but-not-silly, curious, mentor-like. They rotate so a longer wait feels alive; a short wait shows just one.
- Never fake a long wait for drama. If it's fast, show a skeleton and get out of the way. Loading copy sets expectation honestly.
- Under reduced motion: static message + non-animated progress; no shimmer sweeps.

**Rotating loading messages (≥20 — draw from these; keep them fresh, never repeat back-to-back):**

1. Preparing today's challenges…
2. Looking for hidden assumptions…
3. Sharpening your decision toolkit…
4. Loading a situation you might recognize…
5. Setting a trap for your brain to spot…
6. Consulting the science…
7. Lining up your next "aha"…
8. Warming up the thinking muscles…
9. Choosing a scenario worthy of you…
10. Reading the fine print your mind usually skips…
11. Calibrating the difficulty to your sharpness…
12. Hiding the obvious answer a little better…
13. Dusting off a classic mental shortcut…
14. Finding where your intuition might lead you astray…
15. Assembling the choices — all of them plausible…
16. Checking which biases you've been dodging lately…
17. Framing the same facts three different ways…
18. Loading a decision that feels easy (it isn't)…
19. Fetching your progress — proof you're getting sharper…
20. Pouring a fresh scenario…
21. Turning a bias into a puzzle…
22. Getting the details just realistic enough…
23. Quietly raising the stakes…
24. Mapping your blind spots…
25. Almost ready — thinking is worth the wait…

Domain-flavored variants are welcome (e.g. loading a Money & Spending pack: *"Counting the ways a price can fool you…"*), as long as they stay in voice.

---

## 6. Error States

Errors are **calm, human, and never the player's fault**. The tone is a composed mentor handling a hiccup, not a system barking a code. Errors use the gentle error semantic (never alarming red), paired with icon + text, and always offer a way forward.

Principles:
- **Never blame the player.** No "invalid input," no "you did X wrong." The system owns its problems; the player is guided, not scolded.
- **Never robotic.** No raw codes, stack traces, or "Error 500" as the headline. Plain language first; technical detail tucked away only if useful.
- **Always a next step.** Retry, go back, or reassurance that nothing was lost. The player is never stranded.
- **Proportionate.** A field typo is a quiet inline note; a failed save is a calm toast with retry; a hard outage is a full, reassuring state. Never escalate the visual alarm beyond the actual severity.
- **Protect progress.** If anything could be lost, lead with reassurance that it isn't (or how it's recovered).

Examples (copy direction):

- **Network blip:** *"That didn't go through — looks like the connection wavered. Your progress is safe. Try again?"*
- **AI explanation unavailable (fallback):** *"Our AI coach is catching its breath, so here's the full explanation we wrote ourselves — every bit as sharp."* (Graceful fallback per PRD / GameDesign §14 — the player still gets the authored explanation, framed as a feature, not a failure.)
- **Login failed (wrong credentials):** *"That email and password didn't match. Happens to everyone — want to try again or reset it?"* (Never reveal which field was "wrong" beyond what's secure and kind.)
- **Field validation (email):** *"Hmm, that doesn't look like a complete email yet — mind checking it?"*
- **Something genuinely broke:** *"Something on our end slipped. We've noted it and your progress is untouched. Give it another go in a moment."*
- **Session expired:** *"You've been away a while, so we tucked your session away for safety. Sign back in and you're right where you left off."*
- **Rate-limited / too fast:** *"Give it half a beat — we're catching up with you."*
- **Save failed:** *"We couldn't save that just now. Nothing's lost — we'll keep trying, or you can retry manually."*
- **404 / missing:** *"This page seems to have wandered off. Let's get you back to solid ground."* → **Back to dashboard.**

Errors are also written to survive reduced motion and screen readers: announced via a polite live region, focusable, dismissible by keyboard.

---

## 7. Success States

Winning feels **satisfying but elegant** — a warm, well-earned beat, never a carnival. Celebration scales precisely to significance: most successes are quiet acknowledgments; only true milestones get `motion-celebrate`. Always dismissible; never blocking. (Per GameDesign §10 and §13's prohibitions.)

The celebration ladder (smallest → largest):

- **Login:** near-invisible. A calm, personal landing — the dashboard greets by name (§9/§10 daily greeting), progress already visible. No "Welcome back!!!" banner. Returning feels like coming home, not a fanfare.
  - *"Welcome back, Alex. Where were we…"*
- **Signup:** warm and brief — a single confident welcome that sets the tone and points straight at the first scenario, not a tour.
  - *"You're in. Let's find the first trap your mind falls for."* → **Play.**
- **Correct answer:** understated and *reasoning-focused* (§8). A gentle success beat (muted sage, a quiet check, `motion-base`), XP acknowledged, and copy that reinforces the *thinking*, not the player's cleverness.
  - *"Caught it. You weighed the base rate over the vivid story — exactly the move."*
- **Level up:** a genuine milestone → a brief, elegant `motion-celebrate` naming the new level's *meaning* (per Levels.md), warm and skippable.
  - *"Level 5 — Clear Thinker. You're recognizing common biases reliably now."*
- **Achievement:** `motion-celebrate`, sequenced after any level up. Presents the achievement's name and *why it reflects real growth* (per Achievements.md), mentor-toned.
  - *"Blind Spot Cleared — you caught the same bias across four different domains. That's transfer, the hardest kind of learning."*
- **Streak milestone:** warm, forgiving, never pressuring.
  - *"Two weeks of steady practice. Not intensity — consistency. That's how the reflex is built."*
- **Completed pack:** a substantial-but-tasteful moment — a `motion-celebrate` summary of what was learned (biases practiced, growth shown), framed as mastery, with a gentle pointer to what's next.
  - *"Everyday Traps, complete. You've met the biases hiding in ordinary moments — and started catching them. Ready for how they show up with money?"*

Common thread: every success names the *growth*, points forward where useful, and stays elegant. If a success moment ever feels like it's begging for the next tap, it's wrong.

---

## 8. Gameplay Feedback

Feedback is the heart of MindShift — the "aha" engine (GameDesign §11, ContentStrategy §7). Four layers fire together at the reveal: **visual, emotional, educational, and (future) AI-personalized.** The moment must be immediate, believable, and generous — even, especially, when the player was wrong.

**Wrong answers — create curiosity, never say "Incorrect."**
- A miss is the *primary teaching moment*, not a penalty (GameDesign §16). Never a red "Wrong," never a buzzer, never shame.
- The reveal reframes the miss as a discovery: *"You just fell for anchoring — and almost everyone does. Here's the tell you missed."* The tone is a mentor delighted to show you something about your own mind.
- Structure follows ContentStrategy §7: what happened → the bias named → why your mind did it → the counter-strategy → where it shows up in real life. The player leaves curious and equipped, not scolded.
- Visually calm: the outcome uses gentle color and clear hierarchy, the explanation unfolds at a readable pace (still while reading), XP for engagement is still awarded (a miss earns learning XP — never zero, never punishment).
- Emotionally: the "gotcha" is the hook. Falling into the trap should feel like *being let in on a secret*, immediately followed by understanding.

**Correct answers — reinforce the reasoning, not the intelligence.**
- Never "Genius!" / "You're so smart!" Praising intelligence is off-brand and teaches nothing transferable.
- Instead, name *the specific reasoning that worked*: *"You anchored to what the car is actually worth, not the seller's opening number — that's the whole skill."*
- Even a correct answer teaches (ContentStrategy §7): it explains the bias that *could* have fired and why the player's move resisted it, so recognition is reinforced.
- The reward beat is warm but understated (§7) — the insight is the prize, XP is the scaffolding.

**Feedback rules (both cases):**
- **Specific to the choice made**, never generic. The explanation references the actual option the player picked.
- **Honest and accurate** — science first (Brand, ContentStrategy §11). Never oversimplify into wrongness.
- **Paced for comprehension** — the reveal is a moment to absorb, not to rush past; but the player can always advance at their own speed. Never trap them in an animation.
- **Consistent rhythm** — the five-part structure is the same every time, so players learn to anticipate and absorb it (ContentStrategy §7).
- **Reflection is an invitation, never a gate** — offered warmly, personal and open ("When did you last anchor on a first number?"), skippable without friction.
- Under reduced motion, the full feedback still lands via text, color, and icon — motion only sweetens it.

---

## 9. Product Personality

One product, one voice, everywhere — the **sharp, witty mentor** who respects your intelligence (Brand personality). Clear, concise, confident; warm and human; light wit that never mocks the player; second person, active voice, short sentences. The voice is identical whether it's celebrating a level or reporting an error — only the register shifts.

Voice per surface:

- **Onboarding:** confident and fast, never hand-holding. Respects that the player is capable; teaches by *doing* (one scenario, one "aha" in 60 seconds — GameDesign §4), not by touring menus. *"No tutorial. Just a decision. Let's see how your mind handles it."*
- **Settings:** plain, calm, precise. Explains the *why* where a choice isn't obvious; never nannies. Toggles read as clear statements. *"Reduced motion — calmer transitions, same everything else."*
- **Profile:** personal and quietly proud. Frames the player's data as *their growth story*, not vanity metrics. Data controls are clear, respectful, and honest (privacy per PRD). *"Your thinking, tracked honestly — and yours to export or erase anytime."*
- **Dashboard:** orienting and motivating. Leads with next-action clarity and visible growth. A calm daily greeting (§10). *"Welcome back. Your sharpest area this week: spotting framing. Let's push a weaker one."*
- **Authentication:** trustworthy, brief, human. Security without coldness. Never robotic error codes (§6). *"Welcome back — pick up right where you left off."*
- **Notifications:** rare, respectful, genuinely useful (§13 — no noise, no fake urgency). Each one earns its interruption. *"A bias you'd nearly mastered is fading — a two-minute review will lock it in."* Never *"Don't lose your streak!! Come back NOW!"*
- **Achievements:** recognition from a mentor, framed as real growth (Achievements.md), never a chore-tick. *"Comeback — you recovered a run of correct catches after a rough patch. That resilience is the point."*

**Voice guardrails (everywhere):** no jargon unless earned; no corporate filler ("Please be advised…"); no exclamation-point spam; no sarcasm at the player's expense; no manipulation. When unsure, ask: *would a sharp, kind mentor say it this way?*

---

## 10. Delight Moments

Dozens of small, premium touches that reward curiosity and make the product memorable. Delight is **subtle, occasional, and on-brand** — never gimmicky, never in the way. The test: it should make a thoughtful adult smile faintly, not roll their eyes. Any single delight is skippable and never blocks a task.

- **Rotating logo (barely-there):** a slow, rare "shift"/pivot of the mark (echoing the brand's "click of insight" concept) — on load or at a milestone. Ambient, low-priority motion (§2), first to go under reduced-motion.
- **Tiny hover surprises:** a stat that, on hover, reveals a one-line insight ("You've beaten anchoring 9 times out of 10 lately"); an icon with a whisper of life. Enhancement only — never essential (§3 Hover).
- **Contextual messages:** copy that knows where you are — a Money pack loading line about prices; a late-night session noting *"Sharp thinking, even at this hour."*
- **Intelligent tips:** genuinely useful, context-aware micro-coaching in tooltips or quiet cards — *"Notice you tend to miss recency bias in the afternoon? Might be decision fatigue."* Tips teach; they never nag.
- **Milestone celebrations:** the tasteful `motion-celebrate` beats (§7) — earned, elegant, brief.
- **Daily greetings:** a warm, varied, time-aware line on the dashboard — *"Morning. Ready to catch your brain in the act?"* / *"Back again — your judgment's getting a workout this week."* Rotating so it never goes stale; never guilt-based.
- **Clever easter eggs:** rare, understated rewards for the curious — a witty line after a perfect streak of hard scenarios, a hidden acknowledgment for reading every explanation, a knowing nod on a meaningful date. Discovered, never advertised; always in voice.
- **Progress poetry:** framing numbers as growth — *"You now recognize framing across 5 different domains"* instead of *"Framing: 5."*
- **Considered transitions:** the scenario→outcome reveal that lands with just enough weight to feel consequential.
- **The "quiet flex":** occasionally surfacing how far the player has come — *"A month ago this scenario would've caught you."*

Delight budget: a screen should have *at most* one or two delight moments live at once. Delight that becomes frequent becomes noise — and noise is the opposite of premium.

---

## 11. Sound Philosophy (future)

No sound at MVP. Principles only, for if/when it's added.

- **When:** only at high-signal moments — a correct catch, a milestone, a level up. Never on every tap, hover, or transition. The interface is silent by default; sound is a rare accent.
- **Why:** to make key feedback *tangible* and reward genuine (the audio counterpart to the reveal beat), and to deepen game feel — never to demand attention or manufacture engagement.
- **How subtle:** soft, warm, short, low-key — a gentle tone or tactile "tick," never arcade jingles, coin showers, or anything childish. On-brand: calm, premium, intelligent. Think a quiet mechanical keyboard's satisfaction, not a slot machine.
- **Non-negotiables:** sound is **off by default or trivially muteable**, respects OS/device silent settings, is never the sole signal of anything (§12), never startles, and never plays over another. Honor any future "reduced sound"/accessibility preference the way motion honors `prefers-reduced-motion`. No autoplay audio, ever.

---

## 12. Accessibility

Interaction accessibility is a baseline requirement, not a mode. Everything here extends Design System §10 (WCAG 2.1 AA) into behavior.

- **Motion:** honor `prefers-reduced-motion` fully (§2) — movement becomes instant or a gentle fade; meaning never depends on motion. No flashing/strobing content, ever (§13).
- **Keyboard:** every interaction is fully keyboard-operable — logical tab order matching visual order, visible accent focus (never suppressed), Enter/Space to activate, Escape to close overlays, arrow-key navigation where expected, no focus traps (except intentional, escapable dialog traps that return focus on close). Hover-revealed content is reachable by keyboard.
- **Touch:** tap targets ≥44×44px; no reliance on hover or long-press for essential actions; gestures always have a visible, tappable alternative; thumb-reachable primary actions (mobile-first, GameDesign §3).
- **Screen readers:** semantic structure first; meaningful labels on all controls and icon-buttons; decorative visuals hidden from AT; **live regions** announce feedback, toasts, XP, errors, and reveals politely (never spammy); dynamic content changes are communicated, not silent.
- **Reduced motion:** a real, respected experience — not a degraded one. The game is fully enjoyable and rewarding with zero animation.
- **Color independence:** **never convey state by color alone** (critical for correct/incorrect, success/error, streak status). Always pair color with an icon, text label, shape, or position. Verify against color-blind simulation. This is non-negotiable given how central right/wrong feedback is.
- **Cognitive load:** one primary action per screen; plain language; readable pacing; no time pressure that penalizes (any timers are for challenge flavor, never gates that punish slower reading — GameDesign §7/§16); the player can always slow down, re-read, and proceed at their pace.
- **Consistency is accessibility:** predictable patterns (the same feedback rhythm, the same navigation, the same focus behavior everywhere) reduce cognitive load and are themselves an accessibility feature.

---

## 13. Things MindShift Must Never Do

Hard prohibitions. Any screen violating these is wrong, regardless of how "fun" it seems.

- **Giant confetti explosions** or full-screen particle spectacles. Celebration is elegant and contained (§7), never a party trick.
- **Manipulative streak guilt** — no "You'll LOSE your streak!", no shrinking countdowns of doom, no shaming for missed days. Streaks are forgiving and supportive (§3, GameDesign §5).
- **Flashing, strobing, or rapidly oscillating** animation — an accessibility hazard and off-brand (§12).
- **Noisy notifications** — no frequent, low-value, attention-grabbing pings. Each notification earns its interruption or isn't sent (§9).
- **Fake urgency** — no invented countdowns, "only 2 left!", artificial scarcity, or pressure to act now. Honesty is a core value (Brand, GameDesign §10).
- **Dark patterns** — no confirm-shaming ("No, I don't want to get smarter"), no roach-motel flows, no hidden costs, no tricking the player into anything. Ever.
- **Childish mascots** or cartoonish gamification — no bouncing characters guilt-tripping the player, no toy aesthetics (Brand "avoid"). MindShift talks to adults.
- **Addictive mechanics over learning** — no slot-machine variable rewards for their own sake, no engagement-bait, no compulsion loops. Intrinsic motivation first (GameDesign §12); rewards always point back at learning.
- **Blocking the player** with un-skippable animations, forced tours, or celebrations they can't dismiss.
- **Punishing wrong answers** — no lives, no dead ends, no harsh penalties (GameDesign §16). Misses teach.
- **Praising intelligence over reasoning** (§8), or celebrating the player's cleverness instead of their thinking.
- **Color-only state, motion-only meaning, or hover-only essentials** (§12) — accessibility is never sacrificed for polish.
- **Shouting** — no all-caps alarm, aggressive reds, exclamation spam, or urgency the moment doesn't warrant.

---

## Golden Rules

The immutable interaction laws. Every future screen MindShift builds must follow all of them.

1. **Calm by default.** Stillness is the canvas. Motion, color, and sound are spent only where they buy understanding or earned joy.
2. **One clear focus per screen.** One primary action, in the accent. Everything else is subordinate.
3. **Every interaction teaches, rewards, or clarifies** — never just decorates. If it does none of those, remove it.
4. **Feedback reinforces reasoning, never intelligence.** Name the thinking that worked; never say "you're smart."
5. **A wrong answer is a discovery, never a verdict.** Reframe misses as insight; never blame, shame, punish, or block.
6. **Reward proportionately.** A whisper for a tap, an elegant beat for a milestone. No confetti, ever.
7. **The player is never stuck and never rushed.** Always a next step; always able to proceed, slow down, skip, or dismiss.
8. **Errors are calm and the system's fault, never the player's.** Plain language, a way forward, progress protected.
9. **No empty "No data."** Every empty state teaches, encourages, or delights — and points forward.
10. **The game is thinking, not spinning.** Skeletons and on-brand "thinking" copy over bare spinners; never fake a wait.
11. **Accessible by construction.** Full keyboard, screen-reader, and touch support; `prefers-reduced-motion` and color-independence honored — the product is fully rewarding with zero animation.
12. **One voice everywhere** — the sharp, witty, respectful mentor. From onboarding to errors to achievements, it's the same product talking.
13. **Delight is subtle, rare, and premium.** It makes a thoughtful adult smile faintly — never roll their eyes, never wait.
14. **No dark patterns, no fake urgency, no streak guilt, no addiction loops.** Honesty and the player's real growth come before every engagement metric.
15. **Restraint is the house style.** When in doubt, do less. The confidence to not animate, not celebrate, not notify is what makes MindShift premium.

---

_This document is the source of truth for interaction and UX behavior across MindShift. It governs the *feel* of every screen; the [Design System](./DesignSystem.md) governs the *tokens* those screens consume, and [GameDesign.md](../product/GameDesign.md) governs the *play*. When an implementation choice conflicts with these principles, surface the conflict before building. Every future screen must feel like it belongs to the same premium product._
