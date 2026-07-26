import type { MasteryTier } from './types'

/**
 * The five mastery tiers.
 *
 * Named for what the player can *do*, not for how much they have ground —
 * "Aware" and "Practiced" describe states of skill, where "Bronze/Silver/Gold"
 * would describe a collection. Mastery is the measure of learning, so the
 * ladder has to read like one (Levels.md: a tier says how far your thinking has
 * come, never how many hours you logged).
 *
 * ── On colour ───────────────────────────────────────────────────────────────
 * DesignSystem §1 gives each accent exactly one semantic role, and this ladder
 * stays inside those roles rather than treating the palette as a gradient:
 *
 *   muted    — nothing recorded yet; absence, not a grade
 *   warning  — you can name it and it still catches you: literally a caution
 *   reward   — progress, which is the token's documented job
 *   success  — reliable correct catches, which is the token's documented job
 *   brand    — the milestone; the one moment worth spending brand purple on
 *
 * No new colours, no raw hex. Every tier also carries a label and an icon, so
 * tier is never communicated by colour alone (InteractionPrinciples §12).
 *
 * Ranges are inclusive and contiguous across 0–100; `getMasteryTier` relies on
 * that, and the boundaries are the only place they are written down.
 */
export const MASTERY_TIERS = [
  {
    id: 'unfamiliar',
    label: 'Unfamiliar',
    icon: 'circle-dashed',
    min: 0,
    max: 19,
    toneClass: 'text-muted-foreground',
    fillClass: 'bg-muted-foreground',
    description: 'You haven’t caught this one yet. That’s the normal starting point.',
  },
  {
    id: 'aware',
    label: 'Aware',
    icon: 'eye',
    min: 20,
    max: 39,
    toneClass: 'text-warning',
    fillClass: 'bg-warning',
    description: 'You can name it. It still catches you — which is exactly how this stage feels.',
  },
  {
    id: 'practiced',
    label: 'Practiced',
    icon: 'target',
    min: 40,
    max: 64,
    toneClass: 'text-reward',
    fillClass: 'bg-reward',
    description: 'You spot it more often than not. The reflex is forming.',
  },
  {
    id: 'skilled',
    label: 'Skilled',
    icon: 'shield-check',
    min: 65,
    max: 84,
    toneClass: 'text-success',
    fillClass: 'bg-success',
    description: 'You catch it reliably, and in more than one kind of situation.',
  },
  {
    id: 'mastered',
    label: 'Mastered',
    icon: 'sparkles',
    min: 85,
    max: 100,
    toneClass: 'text-brand',
    fillClass: 'bg-brand',
    description: 'It rarely gets past you. That’s a trained reflex, not a lucky guess.',
  },
] as const satisfies readonly [MasteryTier, ...MasteryTier[]]

/** The scale mastery is expressed on. Percentages, 0 to this. */
export const MASTERY_MAX = 100
