import type { BiasPoint, TeaserChoice } from './types'

/**
 * Landing-page content.
 *
 * All copy lives here rather than inside components so the voice can be edited
 * in one place — and so a copy change never risks a layout regression. Voice
 * follows BrandGuidelines and InteractionPrinciples §9: the sharp, witty mentor
 * who respects the reader as a capable adult.
 */

/**
 * The hero's two readings.
 *
 * They differ by a single word. That is the point: the lens reveals a change so
 * small it could be a misreading, which is exactly how a bias feels from the
 * inside. A dramatic swap would read as a gimmick.
 */
export const HERO_SURFACE = 'You see things as they are.'
export const HERO_TRUTH = 'You see things as you are.'

export const HERO_SUBHEAD =
  'MindShift is a game that catches your mind in the act — then shows you the tell.'

/**
 * The playable teaser: a framing-effect scenario (BiasCatalog §3.1).
 *
 * Framing was chosen over the other eleven biases because it is the only one
 * that can be *demonstrated by the interface itself*. The reveal rewrites the
 * options the visitor just read into their opposite frame, so the page performs
 * the bias rather than describing it. Nothing else on the landing page does as
 * much work in as few words.
 */
export const TEASER_PROMPT = 'Two suppliers. Same part, same price, same delivery window.'
export const TEASER_QUESTION = 'Which do you go with?'

export const TEASER_CHOICES: readonly TeaserChoice[] = [
  {
    id: 'framed-gain',
    label: 'Supplier A — 90% of shipments arrive on time.',
    rewritten: 'Supplier A — 1 in 10 shipments arrives late.',
    isCatch: false,
    verdict:
      'You went with the reassuring sentence. A reads as reliable and B reads as risky — but they describe the same supplier, one in gains, one in losses. That preference is the framing effect, and it survives even when people are warned about it.',
  },
  {
    id: 'framed-loss',
    label: 'Supplier B — 1 in 10 shipments arrives late.',
    rewritten: 'Supplier B — 90% of shipments arrive on time.',
    isCatch: false,
    verdict:
      'You went with the blunt sentence — often a good instinct, and still the framing effect. A and B describe identical performance; one is worded as a gain, one as a loss. You chose the phrasing, not the supplier.',
  },
  {
    id: 'identical',
    label: 'They are the same number. I would ask about something else.',
    rewritten: 'They are the same number. I would ask about something else.',
    isCatch: true,
    verdict:
      'Caught it. You converted both statements to the same underlying fact before choosing — which is the entire counter-move for framing. Most people compare the wording and never notice they were handed one supplier twice.',
  },
]

export const TEASER_BIAS_NAME = 'The Framing Effect'
export const TEASER_BIAS_DEFINITION =
  'Deciding differently based on how identical options are worded — as a gain, or as a loss.'
export const TEASER_REWRITE_NOTE = 'Watch the options. Nothing about them changed but the wording.'

/**
 * The three beats of the core loop (GameDesign §2), compressed to their
 * essentials. Presented as one continuous progression rather than three
 * feature cards — the loop is a sequence, and the layout should say so.
 */
export const LOOP_STAGES = [
  {
    id: 'decide',
    ordinal: '01',
    title: 'Decide',
    body: 'A realistic situation with real stakes and no obviously wrong answer. Every option is one a sensible person would pick.',
  },
  {
    id: 'discover',
    ordinal: '02',
    title: 'Discover',
    body: 'The outcome lands, the bias is named, and you find out what your mind did while you thought you were reasoning.',
  },
  {
    id: 'rewire',
    ordinal: '03',
    title: 'Rewire',
    body: 'The same trap returns later, wearing different clothes. Catching it there is the moment it becomes a reflex.',
  },
] as const

/**
 * The twelve MVP biases (BiasCatalog), scattered as an unlit constellation.
 *
 * Positions are hand-placed rather than generated: a random field clumps, and a
 * regular grid reads as a table. These are spread to feel like a star chart —
 * discoverable, slightly irregular, nothing overlapping at any breakpoint.
 */
export const BIAS_CONSTELLATION: readonly BiasPoint[] = [
  { slug: 'availability-heuristic', name: 'Availability Heuristic', category: 'Memory & Availability', x: 12, y: 24 },
  { slug: 'recency-bias', name: 'Recency Bias', category: 'Memory & Availability', x: 26, y: 62 },
  { slug: 'confirmation-bias', name: 'Confirmation Bias', category: 'Belief & Evidence', x: 38, y: 18 },
  { slug: 'belief-perseverance', name: 'Belief Perseverance', category: 'Belief & Evidence', x: 8, y: 78 },
  { slug: 'framing-effect', name: 'Framing Effect', category: 'Decision & Framing', x: 52, y: 46 },
  { slug: 'loss-aversion', name: 'Loss Aversion', category: 'Decision & Framing', x: 66, y: 14 },
  { slug: 'anchoring', name: 'Anchoring', category: 'Value & Anchoring', x: 44, y: 82 },
  { slug: 'sunk-cost-fallacy', name: 'Sunk Cost Fallacy', category: 'Value & Anchoring', x: 78, y: 58 },
  { slug: 'fundamental-attribution-error', name: 'Fundamental Attribution Error', category: 'Self & Social', x: 62, y: 74 },
  { slug: 'self-serving-bias', name: 'Self-Serving Bias', category: 'Self & Social', x: 88, y: 32 },
  { slug: 'overconfidence-effect', name: 'Overconfidence Effect', category: 'Certainty & Prediction', x: 22, y: 42 },
  { slug: 'hindsight-bias', name: 'Hindsight Bias', category: 'Certainty & Prediction', x: 92, y: 76 },
]

/** The bias the teaser teaches — lit permanently once the visitor plays it. */
export const TEASER_BIAS_SLUG = 'framing-effect'
