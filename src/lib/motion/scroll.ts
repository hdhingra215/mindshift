/**
 * Scroll experience engine — Motion adapter layer.
 *
 * This is the one area where Motion, not Anime.js, is the right tool: it links
 * animation values directly to scroll progress without a React render per
 * frame, and its viewport observer is battle-tested. Anime.js owns time-driven
 * motion; this file owns scroll- and viewport-driven motion. See `./engine.ts`
 * for the full boundary.
 *
 * Everything here returns MotionValues or plain booleans, so consuming
 * components stay declarative and no scroll handler is ever hand-written.
 *
 * Reference: https://motion.dev/docs/react-scroll-animations
 */

import { useEffect, useRef, useState, type RefObject } from 'react'
import { useInView, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react'

import { SPRING } from './tokens'
import { prefersReducedMotion, subscribeReducedMotion } from './reduced-motion'

/**
 * Live reduced-motion preference as React state.
 *
 * Kept here rather than using Motion's `useReducedMotion` so that both engines
 * read one implementation — a single definition of "reduced" across Anime.js,
 * Motion and CSS.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion)
  useEffect(() => subscribeReducedMotion(setReduced), [])
  return reduced
}

export type ParallaxOptions = {
  /**
   * Travel in px across the element's full scroll pass. Positive drifts the
   * layer down (it lags the page — reads as *further away*); negative drifts it
   * up (leads the page — reads as *closer*).
   */
  distance?: number
  /** Smooth the value with a spring. Off by default — parallax is already smooth. */
  smooth?: boolean
}

/**
 * Parallax translation for a layer, driven by that layer's own scroll pass.
 *
 * Returns a MotionValue for `y`; feed it straight into a `motion.div` style.
 * Under reduced motion the value is pinned at 0 — the layer still renders, it
 * simply stops moving, so no content is ever lost.
 */
export function useParallax(
  ref: RefObject<HTMLElement | null>,
  options: ParallaxOptions = {}
): MotionValue<number> {
  const { distance = 60, smooth = false } = options
  const reduced = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  const raw = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [-distance / 2, distance / 2])
  const smoothed = useSpring(raw, SPRING.surface)

  return smooth && !reduced ? smoothed : raw
}

export type RevealInViewOptions = {
  /** Fraction of the element that must be visible before it counts. */
  amount?: number
  /** Reveal only the first time. Defaults to true — re-revealing is noise. */
  once?: boolean
  /** Shrink the viewport box so the reveal fires slightly before the edge. */
  margin?: string
}

/**
 * Whether an element has entered the viewport far enough to reveal.
 *
 * Under reduced motion this returns `true` immediately: content must never be
 * gated behind an animation that is not going to run.
 */
export function useRevealInView(
  ref: RefObject<Element | null>,
  options: RevealInViewOptions = {}
): boolean {
  const { amount = 0.25, once = true } = options
  const reduced = useReducedMotion()
  const inView = useInView(ref, { amount, once })
  return reduced || inView
}

/**
 * Scroll progress (0→1) through a section — the backbone of scroll-driven
 * storytelling. Compose with `useTransform` to drive opacity, scale, colour or
 * a progress indicator.
 */
export function useSectionProgress(ref: RefObject<HTMLElement | null>): MotionValue<number> {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  return scrollYProgress
}

/**
 * Whole-page scroll progress, smoothed. For reading indicators and
 * scroll-linked chrome.
 */
export function usePageProgress(): MotionValue<number> {
  const { scrollYProgress } = useScroll()
  return useSpring(scrollYProgress, SPRING.surface)
}

/**
 * A ref plus its in-view flag, for the common case where a component only needs
 * "am I visible yet" and does not care about the ref plumbing.
 */
export function useInViewRef<T extends HTMLElement>(
  options: RevealInViewOptions = {}
): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null)
  return [ref, useRevealInView(ref, options)]
}

export { useScroll, useTransform, useSpring, useInView }
export type { MotionValue }
