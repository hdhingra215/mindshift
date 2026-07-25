/**
 * Animation engine — Anime.js adapter layer.
 *
 * ── Engine architecture ──────────────────────────────────────────────────────
 * MindShift runs two animation libraries, deliberately, with a hard boundary:
 *
 *   Anime.js (PRIMARY) — everything imperative and sequenced. Timelines, page
 *     reveals, chained animations, hover and press micro-interactions, cursor
 *     effects, particles, text reveals, counters, celebration beats.
 *
 *   Motion (SECONDARY) — only where it is genuinely the better tool: scroll
 *     linkage (`useScroll`), viewport detection (`useInView`), gestures and
 *     layout animation. See `./scroll.ts`.
 *
 * The rule that keeps this from rotting: if an animation is *driven by time*,
 * it belongs to Anime.js. If it is *driven by scroll position, viewport entry
 * or a gesture*, it belongs to Motion. Never implement the same effect twice.
 *
 * Everything here is reduced-motion aware and returns a revertible handle, so
 * callers can always clean up — a timeline that outlives its element is a leak.
 */

import {
  animate,
  createTimeline,
  cubicBezier,
  createSpring,
  stagger,
  utils,
  type EasingParam,
  type JSAnimation,
  type Spring,
  type TargetsParam,
  type Timeline,
} from 'animejs'

import {
  DURATION,
  EASE_CURVE,
  MAX_PARTICLES_PER_BURST,
  SPRING,
  STAGGER,
  TRAVEL,
  type DurationToken,
  type EaseToken,
  type SpringToken,
  type StaggerToken,
  type TravelToken,
} from './tokens'
import { prefersReducedMotion, resolveDuration } from './reduced-motion'

/**
 * Anime.js easing functions built once from the shared curves. Building them at
 * module scope means a reveal does not allocate a bezier solver per call.
 */
export const ANIME_EASE: Record<EaseToken, EasingParam> = {
  enter: cubicBezier(...EASE_CURVE.enter),
  exit: cubicBezier(...EASE_CURVE.exit),
  move: cubicBezier(...EASE_CURVE.move),
  celebrate: cubicBezier(...EASE_CURVE.celebrate),
}

/** Anime.js springs built once from the shared spring parameters. */
export const ANIME_SPRING: Record<SpringToken, Spring> = {
  pointer: createSpring(SPRING.pointer),
  surface: createSpring(SPRING.surface),
  reward: createSpring(SPRING.reward),
}

export type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'none'

export type RevealOptions = {
  /** Duration tier. Defaults to `base`. */
  duration?: DurationToken
  /** Easing tier. Defaults to `enter`. */
  ease?: EaseToken
  /** Where the element travels *from*. `none` fades in place. */
  from?: RevealDirection
  /** Travel distance tier. Defaults to `base`. */
  distance?: TravelToken
  /** Interval between siblings when `targets` resolves to more than one node. */
  stagger?: StaggerToken | number
  /** Delay before the first element moves, in ms. */
  delay?: number
  /** Fired once the whole reveal has settled. */
  onComplete?: () => void
}

const AXIS_BY_DIRECTION: Record<
  Exclude<RevealDirection, 'none'>,
  { axis: 'translateY' | 'translateX'; sign: 1 | -1 }
> = {
  up: { axis: 'translateY', sign: 1 },
  down: { axis: 'translateY', sign: -1 },
  left: { axis: 'translateX', sign: 1 },
  right: { axis: 'translateX', sign: -1 },
}

function resolveStagger(value: RevealOptions['stagger']): number {
  if (value === undefined) return 0
  return typeof value === 'number' ? value : STAGGER[value]
}

/**
 * The reveal — the single entrance animation the whole product uses.
 *
 * Every "content arrives" moment (page, section, heading, list, card grid)
 * funnels through here so entrances share one identity. Under reduced motion
 * the travel is dropped entirely and only opacity resolves, instantly.
 *
 * Returns the animation so the caller can `.revert()` it on unmount.
 */
export function reveal(targets: TargetsParam, options: RevealOptions = {}): JSAnimation {
  const {
    duration = 'base',
    ease = 'enter',
    from = 'up',
    distance = 'base',
    stagger: staggerToken,
    delay = 0,
    onComplete,
  } = options

  const reduced = prefersReducedMotion()
  const step = reduced ? 0 : resolveStagger(staggerToken)
  const motion = reduced || from === 'none' ? null : AXIS_BY_DIRECTION[from]

  return animate(targets, {
    opacity: [0, 1],
    ...(motion ? { [motion.axis]: [TRAVEL[distance] * motion.sign, 0] } : {}),
    duration: resolveDuration(DURATION[duration], reduced),
    ease: ANIME_EASE[ease],
    delay: step > 0 ? stagger(step, { start: delay }) : delay,
    ...(onComplete ? { onComplete: () => onComplete() } : {}),
  })
}

export type ExitOptions = Pick<RevealOptions, 'duration' | 'distance' | 'onComplete'> & {
  /** Where the element travels *to*. Defaults to `up` (departs upward). */
  to?: RevealDirection
}

/**
 * The exit counterpart. Uses the exit curve so departing elements accelerate
 * away rather than lingering, and never blocks — callers may proceed
 * immediately regardless of whether this has finished.
 */
export function dismiss(targets: TargetsParam, options: ExitOptions = {}): JSAnimation {
  const { duration = 'fast', to = 'up', distance = 'sm', onComplete } = options
  const reduced = prefersReducedMotion()
  const motion = reduced || to === 'none' ? null : AXIS_BY_DIRECTION[to]

  return animate(targets, {
    opacity: [1, 0],
    ...(motion ? { [motion.axis]: [0, -TRAVEL[distance] * motion.sign] } : {}),
    duration: resolveDuration(DURATION[duration], reduced),
    ease: ANIME_EASE.exit,
    ...(onComplete ? { onComplete: () => onComplete() } : {}),
  })
}

/**
 * Build a timeline with the product's defaults already applied.
 *
 * Prefer this over `createTimeline` directly: it guarantees the shared easing
 * and duration tier, and collapses correctly under reduced motion, so a
 * sequenced moment never has to re-derive the house rhythm.
 */
export function timeline(options: { duration?: DurationToken; ease?: EaseToken } = {}): Timeline {
  const { duration = 'base', ease = 'enter' } = options
  return createTimeline({
    defaults: {
      duration: resolveDuration(DURATION[duration]),
      ease: ANIME_EASE[ease],
    },
  })
}

/**
 * Press feedback — the most important game-feel micro-interaction there is
 * (InteractionPrinciples §3). The tap must land physically before anything
 * else happens.
 *
 * Skipped entirely under reduced motion: a press is already confirmed by the
 * focus ring and the state change that follows, so nothing is lost.
 */
export function pressFeedback(target: TargetsParam, scale = 0.97): JSAnimation | null {
  if (prefersReducedMotion()) return null
  return animate(target, {
    scale: [1, scale, 1],
    duration: DURATION.fast,
    ease: ANIME_EASE.move,
  })
}

/**
 * A counting number — XP, mastery, streaks. The value animates *toward* its new
 * total so the change reads as cause and effect rather than a silent swap.
 *
 * Writes `textContent` directly rather than driving React state: a per-frame
 * `setState` would re-render the subtree 60 times a second for a cosmetic
 * effect. The committed value must still be rendered by React for correctness —
 * this only animates the visual approach to it.
 */
export function countTo(
  element: HTMLElement,
  to: number,
  options: { from?: number; duration?: DurationToken; format?: (value: number) => string } = {}
): JSAnimation {
  const { from = 0, duration = 'slow', format = (value: number) => String(Math.round(value)) } = options
  const reduced = prefersReducedMotion()

  if (reduced) {
    element.textContent = format(to)
    return animate(element, { opacity: 1, duration: 1 })
  }

  const counter = { value: from }
  return animate(counter, {
    value: to,
    duration: DURATION[duration],
    ease: ANIME_EASE.move,
    onUpdate: () => {
      element.textContent = format(counter.value)
    },
  })
}

export type ParticleBurstOptions = {
  /** Particle count. Clamped to `MAX_PARTICLES_PER_BURST`. */
  count?: number
  /** CSS colour for the particles. Defaults to the brand token. */
  color?: string
  /** How far particles travel, in px. */
  spread?: number
}

/**
 * A contained particle burst for reward moments.
 *
 * Deliberately small and local — InteractionPrinciples §13 prohibits
 * full-screen confetti, so this is anchored to the element that earned it and
 * capped at a dozen particles. Nodes are created outside React, animated on the
 * compositor, and removed on completion; the returned function tears down early
 * if the element unmounts mid-flight.
 */
export function particleBurst(
  anchor: HTMLElement,
  options: ParticleBurstOptions = {}
): () => void {
  if (prefersReducedMotion()) return () => undefined

  const { count = 8, color = 'var(--brand)', spread = 48 } = options
  const total = Math.min(count, MAX_PARTICLES_PER_BURST)
  const rect = anchor.getBoundingClientRect()
  const originX = rect.left + rect.width / 2
  const originY = rect.top + rect.height / 2

  const layer = document.createElement('div')
  layer.setAttribute('aria-hidden', 'true')
  layer.style.cssText = `position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:var(--z-cursor);`

  const particles = Array.from({ length: total }, () => {
    const node = document.createElement('span')
    node.style.cssText = `position:absolute;left:${originX}px;top:${originY}px;width:4px;height:4px;border-radius:9999px;background:${color};will-change:transform,opacity;`
    layer.append(node)
    return node
  })

  document.body.append(layer)

  const animation = animate(particles, {
    translateX: () => (Math.random() - 0.5) * spread * 2,
    translateY: () => -Math.random() * spread - spread / 3,
    scale: [{ to: 1, duration: DURATION.fast }, { to: 0, duration: DURATION.base }],
    opacity: [{ to: 1, duration: DURATION.fast }, { to: 0, duration: DURATION.base }],
    duration: DURATION.celebrate,
    ease: ANIME_EASE.enter,
    delay: stagger(STAGGER.tight),
    onComplete: () => layer.remove(),
  })

  return () => {
    animation.revert()
    layer.remove()
  }
}

/**
 * Detach every running animation from these targets.
 *
 * Needed when an animation is interrupted rather than completed — a stray
 * timeline that keeps writing to a detached node is exactly how animation
 * memory leaks happen. Pair with `animation.revert()`, which restores the
 * pre-animation values; this stops anything still driving them.
 */
export function stopMotion(targets: TargetsParam): void {
  utils.remove(targets)
}

export { animate, stagger, utils }
export type { JSAnimation, Timeline, TargetsParam }
