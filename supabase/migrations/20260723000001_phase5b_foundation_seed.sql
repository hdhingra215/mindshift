-- ============================================================================
-- MindShift — Phase 5B: MVP Foundation Seed Data
-- ============================================================================
-- Seeds ONLY the foundational, authored global content:
--   categories, biases, levels, achievements.
--
-- Source of truth (editorial):
--   docs/content/Categories.md      — the 6 bias families
--   docs/content/BiasCatalog.md     — the 12 MVP biases (2 per family)
--   docs/content/Levels.md          — the 10-level growth ladder
--   docs/content/Achievements.md    — the 14 MVP achievements
--   docs/product/ContentStrategy.md — difficulty tier <-> enum mapping, philosophy
--   docs/database/DatabaseSchema.md — table shapes, JSONB payloads
--
-- Contract for this migration:
--   * No schema changes, no new tables, no RLS changes, no enum changes.
--   * Slugs are the canonical long-term identifiers. UUIDs stay the PKs and
--     are generated in-DB (gen_random_uuid) on first insert; future seed data
--     (scenario packs, scenarios) links to this content BY SLUG, never by a
--     hardcoded UUID.
--   * Idempotent: every insert upserts on its natural key (slug /
--     level_number), so re-running this migration re-asserts content without
--     duplicating rows or churning UUIDs.
--   * Relationships resolved by slug subquery (biases.category_id) so ordering
--     and generated UUIDs never need to be known ahead of time.
--
-- Assumptions (documented — see the migration summary):
--   * levels.xp_required and achievements.xp_reward / criteria carry concrete
--     values. The editorial docs deliberately deferred exact numbers to
--     "economy tuning" / "seed authoring" (ContentStrategy §9, Levels §5,
--     Achievements design overview). This migration IS that seed-authoring
--     step, so it commits a first, philosophy-aligned set of values. They are
--     tunable later via ordinary content updates (no schema impact).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. categories — the six bias families (Categories.md)
--    Editorial order preserved via sort_order.
-- ----------------------------------------------------------------------------
insert into public.categories (slug, name, description, icon, sort_order) values
  (
    'memory-availability',
    'Memory & Availability',
    'How the mind mistakes ease of recall for truth, frequency, and importance. What comes to mind first feels most real — and usually isn''t. You''ll learn to ask whether something is actually likely, or merely memorable.',
    'brain',
    1
  ),
  (
    'belief-evidence',
    'Belief & Evidence',
    'How we seek, weigh, and defend beliefs — favoring what confirms us and resisting what threatens what we already think. You''ll learn to hunt for disconfirming evidence and to update your mind when the facts change.',
    'search-check',
    2
  ),
  (
    'decision-framing',
    'Decision & Framing',
    'How the presentation of a choice — and the weight we give losses over gains — changes the decision, even when the underlying facts are identical. You''ll learn to decide on substance, not wording.',
    'frame',
    3
  ),
  (
    'value-anchoring',
    'Value & Anchoring',
    'How judgments of worth, cost, and quantity get hijacked by irrelevant reference points and by what''s already been spent. You''ll learn to question the first number and to ignore sunk costs.',
    'anchor',
    4
  ),
  (
    'self-social',
    'Self & Social',
    'How we judge ourselves and others by different, self-flattering rules — over-blaming others'' character while excusing our own circumstances. You''ll learn to hold one standard for everyone, yourself included.',
    'users',
    5
  ),
  (
    'certainty-prediction',
    'Certainty & Prediction',
    'How we grow more confident, and feel more able to predict, than reality warrants — especially in hindsight. You''ll learn to calibrate confidence to evidence and to plan for how things actually go.',
    'target',
    6
  )
on conflict (slug) do update set
  name        = excluded.name,
  description = excluded.description,
  icon        = excluded.icon,
  sort_order  = excluded.sort_order,
  updated_at  = now();

-- ----------------------------------------------------------------------------
-- 2. biases — the 12 MVP biases (BiasCatalog.md), 2 per family.
--    category_id resolved by slug so no generated UUID is ever hardcoded.
--    difficulty = the tier at which the bias is INTRODUCED
--    (Beginner->easy, Intermediate->medium, Advanced->hard).
-- ----------------------------------------------------------------------------
insert into public.biases
  (slug, name, short_description, full_explanation, counter_strategy, difficulty, category_id)
values
  -- Category 1 — Memory & Availability -------------------------------------
  (
    'availability-heuristic',
    'Availability Heuristic',
    'Judging how likely or common something is by how easily examples come to mind.',
    'The mind treats ease of recall as evidence of frequency: if an example springs to mind quickly, it feels common and probable. But recall is driven by what is vivid, recent, or emotional — not by what is statistically true. A single dramatic news story can make a rare event feel imminent while a common, undramatic risk fades into the background. The trap is subtle because it masquerades as reasoning from evidence, when the "evidence" is simply whatever is easiest to picture. Being well-informed is no defense — memorable cases hijack experts and beginners alike.',
    'Before trusting a gut estimate, ask: "Am I reasoning from actual frequency, or just from the most memorable example?" Go find the base rate — the boring statistic — before you trust the vivid story.',
    'easy',
    (select id from public.categories where slug = 'memory-availability')
  ),
  (
    'recency-bias',
    'Recency Bias',
    'Overweighting the most recent information or experience when judging or predicting.',
    'Fresh information carries a disproportionate pull. The last data point, the most recent quarter, the final day of a trip — these dominate judgment while older, equally valid evidence quietly drops out of view. The mind mistakes "latest" for "most relevant," extrapolating short-term trends into the future and over-reacting to the newest signal. Sometimes recent data genuinely matters most, but recency bias applies that rule blindly, ignoring the longer pattern and the base rate. It is why one strong month reshapes a forecast and one bad week colors an entire performance review.',
    'Widen the window. Before deciding, deliberately weigh the full history rather than the latest event — ask "What does the long-run pattern say?" and give older evidence equal standing.',
    'medium',
    (select id from public.categories where slug = 'memory-availability')
  ),
  -- Category 2 — Belief & Evidence -----------------------------------------
  (
    'confirmation-bias',
    'Confirmation Bias',
    'Seeking, favoring, and remembering information that confirms what we already believe.',
    'Once a belief takes hold, the mind becomes its advocate rather than its judge. We search for supporting evidence, interpret ambiguity in our favor, and remember the hits while forgetting the misses — all while feeling thoroughly rigorous. A one-sided search feels exactly like "doing the research," which is what makes the bias so quiet and so common. It is not a failure of intelligence or honesty; it is automatic, and it grips experts most inside their own field, where prior conviction runs deepest. The cost is steep: it shuts down learning by never testing what we might have wrong.',
    'Argue the other side on purpose. Before you conclude, ask "What evidence would prove me wrong?" — then go looking for it as hard as you looked for support.',
    'easy',
    (select id from public.categories where slug = 'belief-evidence')
  ),
  (
    'belief-perseverance',
    'Belief Perseverance',
    'Clinging to a belief even after the evidence that formed it has been discredited.',
    'Beliefs outlive their reasons. Once an impression forms — from a rumor, a first study, a first meeting — it develops its own momentum and persists even after its original basis is retracted or disproven. We assume we would update the moment the facts changed, but the facts changing often is not enough; the belief has detached from its evidence and now stands on habit alone. Removing the reason rarely removes the conclusion. This is why debunked claims keep steering decisions, and why a false first impression can quietly shape a relationship long after it should have dissolved.',
    'When a belief''s original evidence collapses, rebuild from zero. Ask: "If I were meeting this fact for the first time today, with no prior opinion, what would I actually conclude?"',
    'hard',
    (select id from public.categories where slug = 'belief-evidence')
  ),
  -- Category 3 — Decision & Framing ----------------------------------------
  (
    'framing-effect',
    'Framing Effect',
    'Deciding differently based on how identical options are worded — as a gain or as a loss.',
    'The same facts, dressed in different words, produce different choices. "90% survival" and "10% mortality" describe an identical outcome, yet one reassures and the other alarms; "95% success" and "5% failure" pull decisions in opposite directions. The frame sets a reference point the mind anchors to, and preferences follow the wording rather than the substance. This is not a lapse only irrational people make — the effect is reliable and persists even when people are explicitly warned it is happening. Marketers, media, and negotiators exploit it precisely because it works on everyone.',
    'Re-state the option in the opposite frame before you decide. If a gain-framed choice still holds when you word it as a loss, it is the substance guiding you — not the phrasing.',
    'easy',
    (select id from public.categories where slug = 'decision-framing')
  ),
  (
    'loss-aversion',
    'Loss Aversion',
    'Feeling the pain of a loss more strongly than the pleasure of an equal gain, so we over-avoid losses.',
    'A loss tends to hurt about twice as much as an equivalent gain feels good, and that asymmetry warps decisions toward avoiding losses at almost any cost. It drives people to refuse favorable bets, cling to losing investments to avoid "realizing" the loss, over-insure against minor risks, and stay in bad plans to dodge a small cancellation fee. It is easy to mistake this for prudence, but prudence weighs magnitudes honestly; loss aversion inflates the loss itself, producing choices that are objectively worse. The result is inaction and missed opportunity, dressed up as caution.',
    'Judge the expected outcome, not the sting. Ask: "If I held no current position, would I take this deal on its merits?" — and weigh the potential gain and loss on the same scale.',
    'medium',
    (select id from public.categories where slug = 'decision-framing')
  ),
  -- Category 4 — Value & Anchoring -----------------------------------------
  (
    'anchoring',
    'Anchoring',
    'Relying too heavily on the first number or piece of information when judging value or quantity.',
    'The first figure that lands — an opening offer, a sticker price, an initial estimate — silently sets the range within which all later judgment happens. Every subsequent guess adjusts from that anchor, and the adjustment is almost always insufficient, leaving the final judgment pulled toward a starting point that may be arbitrary or entirely irrelevant. Even random numbers, demonstrably unconnected to the question, still move estimates. We believe we have reasoned our way free of the anchor; in fact we have merely drifted a little from it. It is why the opening number in any negotiation carries such quiet power.',
    'Set your own reference point first. Decide what something is worth — or what a fair estimate looks like — before you hear their number, then judge the anchor against your figure, not the reverse.',
    'easy',
    (select id from public.categories where slug = 'value-anchoring')
  ),
  (
    'sunk-cost-fallacy',
    'Sunk Cost Fallacy',
    'Continuing something because of what''s already invested — money, time, effort — rather than its future value.',
    'Past investment feels like a reason to continue, but the resources already spent are gone whichever path you choose. The only rational question is the value from here forward, yet the mind treats quitting as "wasting" what was put in, and so throws good resources after bad. This keeps people in failing projects, in movies watched to the end "because I paid," and in doomed commitments long past the point of sense. Persistence gets mistaken for commitment or loyalty, which makes the trap feel virtuous. But honoring a sunk cost does not recover it — it only adds to the loss.',
    'Ignore what is already spent; it is gone on every path. Ask only: "Starting fresh today, knowing what I know now, would I choose to invest more from here?"',
    'medium',
    (select id from public.categories where slug = 'value-anchoring')
  ),
  -- Category 5 — Self & Social ---------------------------------------------
  (
    'fundamental-attribution-error',
    'Fundamental Attribution Error',
    'Over-attributing others'' behavior to their character while under-weighting their situation.',
    'When someone else stumbles, we reach for character — they are lazy, rude, careless — and overlook the situation that shaped the act. The late colleague is unreliable, not stuck in traffic; the curt stranger is unpleasant, not having the worst day of their life. The revealing asymmetry is that we excuse our own identical behavior by pointing to circumstance. We see our own situation from the inside but only others'' actions from the outside, so their context stays invisible. It feels like accurately reading people; it is systematically ignoring half the story.',
    'Before you judge character, ask: "What situation could lead a reasonable person to do this?" — and apply the same generosity you would want applied to your own bad day.',
    'easy',
    (select id from public.categories where slug = 'self-social')
  ),
  (
    'self-serving-bias',
    'Self-Serving Bias',
    'Taking credit for successes as our own ability, but blaming failures on outside factors.',
    'Success gets attributed inward — to skill, effort, intelligence — while failure gets attributed outward, to bad luck, unfair conditions, or other people. The same kind of event receives opposite explanations depending only on whether it flatters us. This protects the ego in the short term but blocks growth: we cannot learn from failures we never own, and we strain relationships by claiming credit we shared. It feels like simple fairness to oneself, but fairness would apply one standard; this applies two. It is the mirror image of how we judge others, and just as invisible from the inside.',
    'When something goes well, ask what luck or help contributed; when it goes badly, ask what was in your control. Run the same causal test on your wins and your losses.',
    'medium',
    (select id from public.categories where slug = 'self-social')
  ),
  -- Category 6 — Certainty & Prediction ------------------------------------
  (
    'overconfidence-effect',
    'Overconfidence Effect',
    'Being more certain about our judgments and abilities than accuracy justifies.',
    'Confidence and accuracy are only loosely linked, yet we treat the feeling of certainty as if it were proof. We bet big on "sure things," skip the backup plan, and trust a snap judgment without checking — then are genuinely surprised to be wrong. The gap is hard to see precisely because certainty is a feeling from the inside, invisible to introspection; often the least skilled are the most sure, lacking the knowledge to see what they are missing. Overconfidence quietly drives under-preparation and ignored risks across money, work, and safety, where being wrong costs the most.',
    'Attach a number to your certainty, then stress-test it: "What would have to be true for me to be wrong, and how would I know?" Widen your estimates and build in a margin for what you cannot foresee.',
    'medium',
    (select id from public.categories where slug = 'certainty-prediction')
  ),
  (
    'hindsight-bias',
    'Hindsight Bias',
    'Seeing past events as having been predictable once we know how they turned out — "I knew it all along."',
    'Once we know the outcome, the path to it feels inevitable, and we misremember our past uncertainty as foresight. A startup''s failure looks obvious after it fails; a decision looks reckless once we see how it ended — even when, at the time, the outcome genuinely was not clear. Knowing the answer reshapes our memory of what we believed before we knew it. This quietly corrupts learning: we cannot fairly evaluate past decisions, we over-blame others for "obvious" misses, and we grow falsely confident in our own foresight. The feeling of inevitability is manufactured by the outcome, not earned by prediction.',
    'Judge a past decision by what was knowable at the time, not by how it turned out. Record predictions before the outcome arrives, so you can see what you actually knew rather than what you now think you knew.',
    'hard',
    (select id from public.categories where slug = 'certainty-prediction')
  )
on conflict (slug) do update set
  name              = excluded.name,
  short_description = excluded.short_description,
  full_explanation  = excluded.full_explanation,
  counter_strategy  = excluded.counter_strategy,
  difficulty        = excluded.difficulty,
  category_id       = excluded.category_id,
  updated_at        = now();

-- ----------------------------------------------------------------------------
-- 3. levels — the 10-level growth ladder (Levels.md).
--    xp_required: fast early wins, escalating later (steady & earned, never
--    grindy). unlocks: data-driven pacing payload — biases (by slug), the
--    difficulty tiers newly available, and feature reveals. Reveal, never wall.
-- ----------------------------------------------------------------------------
insert into public.levels (level_number, xp_required, title, unlocks) values
  (
    1, 0, 'Curious Mind',
    '{"biases": ["availability-heuristic", "confirmation-bias"], "difficulties": ["easy"], "features": ["core_loop", "bias_codex"]}'::jsonb
  ),
  (
    2, 100, 'Observer',
    '{"biases": ["framing-effect", "anchoring"], "features": ["reflection"]}'::jsonb
  ),
  (
    3, 250, 'Questioner',
    '{"biases": ["fundamental-attribution-error"], "features": ["confidence_rating"]}'::jsonb
  ),
  (
    4, 500, 'Skeptic',
    '{"biases": ["recency-bias"], "difficulties": ["medium"]}'::jsonb
  ),
  (
    5, 900, 'Clear Thinker',
    '{"biases": ["overconfidence-effect", "loss-aversion"]}'::jsonb
  ),
  (
    6, 1400, 'Pattern Seeker',
    '{"biases": ["sunk-cost-fallacy", "self-serving-bias"], "features": ["interleaved_sets"]}'::jsonb
  ),
  (
    7, 2100, 'Bias Spotter',
    '{"biases": ["belief-perseverance"], "difficulties": ["hard"]}'::jsonb
  ),
  (
    8, 3000, 'Sharp Mind',
    '{"biases": ["hindsight-bias"], "features": ["reinforcing_pairs"]}'::jsonb
  ),
  (
    9, 4200, 'Strategist',
    '{"difficulties": ["expert"], "features": ["counter_strategy_drills"]}'::jsonb
  ),
  (
    10, 5800, 'Clarity',
    '{"features": ["mastery_capstone", "all_content"]}'::jsonb
  )
on conflict (level_number) do update set
  xp_required = excluded.xp_required,
  title       = excluded.title,
  unlocks     = excluded.unlocks,
  updated_at  = now();

-- ----------------------------------------------------------------------------
-- 4. achievements — the 14 MVP achievements (Achievements.md).
--    criteria: a small, consistent rule DSL ({"type": ..., <params>}) the
--    achievement engine will evaluate against player facts. Every rule rewards
--    learning behavior (understanding, transfer, consistency, curiosity,
--    metacognition) — never volume or time served.
--    xp_reward: scaled to rarity / difficulty of the milestone.
-- ----------------------------------------------------------------------------
insert into public.achievements
  (slug, name, description, icon, criteria, xp_reward, is_active)
values
  -- Understanding ----------------------------------------------------------
  (
    'first-insight',
    'First Insight',
    'You completed your first scenario and read the lesson behind it — the full learn-by-experience loop, start to finish. Every reflex begins with a single insight.',
    'sparkles',
    '{"type": "scenarios_completed", "count": 1}'::jsonb,
    50,
    true
  ),
  (
    'caught-in-the-act',
    'Caught in the Act',
    'You correctly recognized a cognitive bias for the first time — not just playing through, but actually spotting the trap. This recognition is the skill MindShift is built to train.',
    'eye',
    '{"type": "correct_recognitions", "count": 1}'::jsonb,
    75,
    true
  ),
  (
    'family-scholar',
    'Family Scholar',
    'You correctly recognized both biases in a single family, grasping the shared mental shortcut beneath them. You understand the mechanism, not just the names.',
    'book-open',
    '{"type": "category_biases_recognized", "scope": "any", "biases_per_category": 2}'::jsonb,
    150,
    true
  ),
  -- Mastery ----------------------------------------------------------------
  (
    'bias-tamed',
    'Bias Tamed',
    'You reached mastery on a single bias — recognizing it reliably across varied situations, not just once. It is becoming a reflex.',
    'shield-check',
    '{"type": "biases_mastered", "count": 1}'::jsonb,
    200,
    true
  ),
  (
    'blind-spot-cleared',
    'Blind Spot Cleared',
    'You caught the same bias across several different domains — money, work, health, relationships. Transfer like this is the hardest and most valuable sign of real learning.',
    'scan-eye',
    '{"type": "bias_distinct_contexts", "distinct_contexts": 4}'::jsonb,
    300,
    true
  ),
  (
    'clear-sight',
    'Clear Sight',
    'You reached mastery across every bias in the MVP curriculum — the rarest recognition in MindShift. Clear thinking, trained and durable across the full set.',
    'telescope',
    '{"type": "biases_mastered", "count": 12}'::jsonb,
    1000,
    true
  ),
  (
    'full-spectrum',
    'Full Spectrum',
    'You completed every bias family, building a full mental map of the territory. You have now met the whole landscape of traps the mind falls into.',
    'layout-grid',
    '{"type": "categories_completed", "count": 6}'::jsonb,
    500,
    true
  ),
  -- Consistency (forgiving) ------------------------------------------------
  (
    'habit-forming',
    'Habit Forming',
    'You practiced across several days in a short span, turning clear thinking into a light, sustainable habit. Consistency, not cramming, builds the reflex.',
    'calendar-check',
    '{"type": "active_days", "distinct_days": 3, "window_days": 7, "grace": true}'::jsonb,
    100,
    true
  ),
  (
    'steady-mind',
    'Steady Mind',
    'You sustained a long streak of meaningful practice, forgiving of the odd missed day. Real skill is built by showing up, honestly, over time.',
    'flame',
    '{"type": "activity_streak_days", "streak_days": 14, "grace": true}'::jsonb,
    250,
    true
  ),
  (
    'comeback',
    'Comeback',
    'You recovered a run of correct recognitions after a rough patch on tricky biases. A miss is not a defeat — it is a blind spot found. This is what bouncing back looks like.',
    'trending-up',
    '{"type": "recovery_run", "misses_before": 3, "correct_after": 3}'::jsonb,
    150,
    true
  ),
  -- Curiosity --------------------------------------------------------------
  (
    'explorer',
    'Explorer',
    'You played at least one scenario from every category, exploring the whole territory. Curiosity across all the families is where mastery starts.',
    'compass',
    '{"type": "categories_sampled", "count": 6}'::jsonb,
    100,
    true
  ),
  (
    'deep-diver',
    'Deep Diver',
    'You went beyond the answer — engaging with full explanations and writing genuine reflections. Depth like this turns a single insight into lasting understanding.',
    'waves',
    '{"type": "reflections_completed", "count": 5}'::jsonb,
    150,
    true
  ),
  (
    'rising-to-the-challenge',
    'Rising to the Challenge',
    'You took on and cleared Advanced scenarios, stretching into harder content when you were ready. Seeking difficulty is the growth mindset in action.',
    'mountain',
    '{"type": "difficulty_completed", "difficulty": "hard", "count": 3}'::jsonb,
    200,
    true
  ),
  -- Metacognition ----------------------------------------------------------
  (
    'well-calibrated',
    'Well Calibrated',
    'Your confidence tracked your accuracy over time — you know what you actually know. Closing that gap is the deepest thinking skill MindShift trains, and the antidote to overconfidence.',
    'gauge',
    '{"type": "confidence_calibration", "calibrated_outcomes": 10, "max_gap": 20}'::jsonb,
    300,
    true
  )
on conflict (slug) do update set
  name        = excluded.name,
  description = excluded.description,
  icon        = excluded.icon,
  criteria    = excluded.criteria,
  xp_reward   = excluded.xp_reward,
  is_active   = excluded.is_active,
  updated_at  = now();
