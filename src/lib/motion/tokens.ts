/**
 * Motion tokens — the single source of truth for scripted motion.
 *
 * Mirrors the CSS custom properties in `src/styles/globals.css` so that a CSS
 * transition and an Anime.js timeline land on the same rhythm. Values encode
 * DesignSystem §7 and InteractionPrinciples §2; nothing in the product should
 * hardcode a duration, easing curve or travel distance.
 *
 * Curves are stored as raw cubic-bezier control points because both engines
 * consume them, in different shapes:
 *   - Anime.js wants an easing function  → `ANIME_EASE` (see ./engine)
 *   - Motion wants a 4-tuple            → `EASE_CURVE`
 */

/**
 * Duration tiers. The larger the surface or the more significant the moment,
 * the longer the motion — small things move fast, big things move deliberately.
 */
export const DURATION = {
  /** Hover, press, focus, toggles — the interface feeling immediate. */
  fast: 140,
  /** Most enter/exit transitions: cards, list items, tooltips, inline reveals. */
  base: 220,
  /** Larger surfaces: modals, sheets, route transitions, the outcome reveal. */
  slow: 340,
  /** Genuine milestones only: level up, achievement, mastery, pack complete. */
  celebrate: 560,
} as const

export type DurationToken = keyof typeof DURATION

/**
 * Easing curves. Entrances arrive and settle (ease-out), exits accelerate away
 * (ease-in), repositioning is symmetrical. Never linear for UI motion.
 */
export const EASE_CURVE = {
  enter: [0.16, 1, 0.3, 1],
  exit: [0.7, 0, 0.84, 0],
  move: [0.65, 0, 0.35, 1],
  /** A whisper of overshoot. Celebration beats only — never a bounce-house. */
  celebrate: [0.34, 1.4, 0.64, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>

export type EaseToken = keyof typeof EASE_CURVE

/**
 * Spring parameters, expressed once and adapted per engine. Springs are for
 * things that follow a pointer or settle physically — not for entrances.
 */
export const SPRING = {
  /** Cursor followers, magnetic pull — responsive, barely any wobble. */
  pointer: { stiffness: 260, damping: 26, mass: 0.6 },
  /** Panels and drawers settling into place. */
  surface: { stiffness: 180, damping: 24, mass: 1 },
  /** Reward beats. Slightly looser so it reads as alive. */
  reward: { stiffness: 220, damping: 18, mass: 0.9 },
} as const satisfies Record<string, { stiffness: number; damping: number; mass: number }>

export type SpringToken = keyof typeof SPRING

/**
 * Stagger intervals (ms between siblings). Keeps grouped reveals reading as one
 * gesture rather than a queue of separate animations.
 */
export const STAGGER = {
  tight: 24,
  base: 45,
  loose: 80,
} as const

export type StaggerToken = keyof typeof STAGGER

/**
 * Travel distances (px). Entrances move a short, believable distance — enough
 * to imply arrival, never enough to read as a slide-show.
 */
export const TRAVEL = {
  xs: 4,
  sm: 8,
  base: 14,
  lg: 24,
} as const

export type TravelToken = keyof typeof TRAVEL

/**
 * Layering scale. Mirrors the `--z-*` CSS variables; a fixed ladder prevents
 * the z-index arms race that makes overlays unpredictable.
 */
export const Z_LAYER = {
  base: 0,
  raised: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  toast: 50,
  cursor: 60,
} as const

export type ZLayerToken = keyof typeof Z_LAYER

/** Cap on simultaneous particles per burst — a budget, not a spectacle. */
export const MAX_PARTICLES_PER_BURST = 12
