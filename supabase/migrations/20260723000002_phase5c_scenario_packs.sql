-- ============================================================================
-- MindShift — Phase 5C: Scenario Packs Seed Data
-- ============================================================================
-- Seeds ONLY the scenario_packs table: a curated MVP set of themed,
-- domain-framed collections that interleave the 12 MVP biases across the 6
-- families (see docs/content/BiasCatalog.md, Categories.md) into a natural
-- easy -> expert progression (ContentStrategy.md §2 interleaving, §3 families,
-- §4 difficulty framework).
--
-- Contract for this migration:
--   * No schema changes, no new tables, no RLS changes. scenario_packs is used
--     exactly as defined in 20260721000001_layer1_identity_content.sql.
--   * Slugs are the canonical long-term identifiers. Future seeds link
--     scenarios into these packs BY pack slug via scenario_pack_items.
--   * Idempotent: upsert on the natural key (slug); UUID PKs generated in-DB
--     stay stable across re-runs.
--
-- Field reconciliation (schema-strict, per instruction: do not modify schema):
--   scenario_packs exposes only: slug, name, description, cover_image,
--   is_published, sort_order. The phase brief also named short_description,
--   long_description, estimated_difficulty, learning_objectives, and
--   estimated_duration — none have a column and the table has no JSONB payload.
--   Rather than alter the schema, that editorial framing (difficulty feel,
--   rough duration, and the pack's learning objectives) is woven into the
--   premium `description` prose. `cover_image` holds a lucide icon name,
--   consistent with the categories/achievements seed (Phase 5B).
--
--   Progression + families are documented per-pack in comments below so the
--   scenario-authoring phase can honor them without a structural column.
--
-- Publish state:
--   Every pack ships is_published = false. Scenarios are seeded in a LATER
--   phase, so publishing now would surface empty packs — a broken empty state
--   that violates the quality bar (CLAUDE.md Definition of Done: no placeholder
--   content, real empty states). Flip is_published = true per pack once its
--   scenarios exist and pass the §11 content checklist.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- scenario_packs — 6 curated MVP packs, easy -> expert.
--
-- Coverage map (every MVP bias appears in >= 1 pack; every family covered):
--   1 everyday-traps           easy        availability-heuristic, framing-effect, anchoring
--   2 money-and-spending       easy->med   anchoring, sunk-cost-fallacy, loss-aversion, framing-effect
--   3 at-work                  medium      recency-bias, overconfidence-effect, self-serving-bias, fundamental-attribution-error
--   4 people-and-relationships medium      fundamental-attribution-error, self-serving-bias, belief-perseverance, confirmation-bias
--   5 digital-life             med->hard   confirmation-bias, availability-heuristic, recency-bias
--   6 sharp-thinking (capstone) hard->exp  belief-perseverance, hindsight-bias, overconfidence-effect, sunk-cost-fallacy
--
-- Families covered: Memory & Availability, Belief & Evidence, Decision &
-- Framing, Value & Anchoring, Self & Social, Certainty & Prediction — all six.
-- ----------------------------------------------------------------------------
insert into public.scenario_packs (slug, name, description, cover_image, is_published, sort_order) values
  (
    'everyday-traps',
    'Everyday Traps',
    'The traps hiding in ordinary moments — the vivid story that skews a risk, the sticker price that quietly reframes a deal, the wording that nudges a yes. Start here: short, low-stakes everyday decisions that build the core reflex of catching a bias before it catches you. A gentle on-ramp of quick scenarios and your first real "gotcha" moments, drawn from the choices you already make every day.',
    'coffee',
    false,
    1
  ),
  (
    'money-and-spending',
    'Money & Spending',
    'Where clear thinking pays for itself. Anchored prices, sunk costs you keep feeding, the discount framed as a win, the small loss you overpay to avoid — money is where biases cost the most and hide the best. Learn to question the first number, walk away from what is already spent, and judge a deal on substance rather than spin. A focused set across shopping, negotiating, and everyday financial calls.',
    'wallet',
    false,
    2
  ),
  (
    'at-work',
    'At Work',
    'Judgment under pressure, deadlines, and other people. Rating a colleague on their last week alone, backing a forecast with more confidence than it has earned, taking the credit but passing the blame — the workplace runs on fast calls that bias loves to distort. Build the habit of weighing the whole record, calibrating your certainty, and owning outcomes fairly. Realistic professional scenarios, a clear step up in subtlety.',
    'briefcase',
    false,
    3
  ),
  (
    'people-and-relationships',
    'People & Relationships',
    'The people closest to us are where misjudgment hurts most. Reading someone''s whole character from one bad moment, clinging to a first impression long after it has been disproven, noticing only what confirms what you already decided about them. This set trains fairer, slower judgments of others — separating the person from the situation, and updating your view when they have earned it.',
    'heart-handshake',
    false,
    4
  ),
  (
    'digital-life',
    'Digital Life',
    'Feeds, reviews, and endless headlines — an information diet engineered to feed your biases. The dramatic story that warps your sense of what is likely, the search that only confirms your side, the latest hot take that overwrites the longer truth. Learn to see how modern screens distort judgment, and to read them with a sharper, more skeptical eye. A timely set for anyone who lives online.',
    'smartphone',
    false,
    5
  ),
  (
    'sharp-thinking',
    'Sharp Thinking',
    'The capstone. Here biases stop arriving one at a time and start working together — hindsight quietly rewriting a past decision, overconfidence feeding a commitment that should have ended, a discredited belief still steering the call. Ambiguous, higher-stakes scenarios where even strong choices carry trade-offs, and your first job is to name which trap is actually in play. The final test of the reflex you have built: clear thinking when it is hardest.',
    'brain',
    false,
    6
  )
on conflict (slug) do update set
  name         = excluded.name,
  description  = excluded.description,
  cover_image  = excluded.cover_image,
  is_published = excluded.is_published,
  sort_order   = excluded.sort_order,
  updated_at   = now();
