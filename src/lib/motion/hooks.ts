/**
 * React bindings for the motion system.
 *
 * These hooks exist to solve one recurring problem: an Anime.js animation is
 * imperative and outlives the render that created it, so every one needs a
 * matching teardown. Rather than trusting each component to remember, the
 * lifecycle is encoded once here — mount, animate, revert, clean inline styles.
 *
 * Nothing in this file re-renders on animation frames. Effects write to the DOM
 * directly; React owns structure and state, the engines own pixels.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { createScope, type Scope } from 'animejs'

import { countTo, reveal, stopMotion, type RevealOptions } from './engine'
import { bindPointerVariables, subscribePointer, type PointerState } from './pointer'
import { ambientMotionAllowed, prefersReducedMotion } from './reduced-motion'
import { DURATION, EASE_CURVE, SPRING, type DurationToken } from './tokens'

/**
 * An Anime.js scope bound to a container element.
 *
 * A scope tracks every animation created inside it and reverts them all in one
 * call, which is the only reliable way to guarantee no timeline survives an
 * unmount. Use it whenever a component owns more than a single animation.
 */
export function useAnimeScope(
  ref: RefObject<HTMLElement | null>,
  setup: (scope: Scope) => void,
  deps: readonly unknown[] = []
): void {
  const setupRef = useRef(setup)
  setupRef.current = setup

  useEffect(() => {
    const root = ref.current
    if (!root) return

    const scope = createScope({ root }).add((self) => {
      if (self) setupRef.current(self)
    })
    return () => scope.revert()
    // The caller controls re-runs; `setup` is intentionally read from a ref so
    // an inline closure does not thrash the scope on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/**
 * Reveal an element (and optionally its children) once, on mount.
 *
 * The workhorse behind every "content arrives" primitive. Set `enabled` to
 * false to hold the reveal until some condition is met — a scroll trigger, or
 * data finishing loading — and it will run the moment it flips true.
 *
 * Runs in a layout effect rather than a passive one so the animation's opening
 * frame is committed *before* the browser paints. In a passive effect the
 * element paints once at full opacity and then snaps to zero, which reads as a
 * flash on anything revealing at mount — most visibly a hero.
 */
export function useReveal(
  ref: RefObject<HTMLElement | null>,
  options: RevealOptions & { enabled?: boolean; selector?: string } = {}
): void {
  const { enabled = true, selector, ...revealOptions } = options
  const optionsRef = useRef(revealOptions)
  optionsRef.current = revealOptions
  const hasRun = useRef(false)

  useLayoutEffect(() => {
    const root = ref.current
    if (!root || !enabled || hasRun.current) return

    hasRun.current = true
    const targets = selector ? Array.from(root.querySelectorAll<HTMLElement>(selector)) : root
    if (Array.isArray(targets) && targets.length === 0) return

    const animation = reveal(targets, optionsRef.current)
    return () => {
      animation.revert()
      stopMotion(targets)
    }
  }, [ref, enabled, selector])
}

export type CountToOptions = {
  /** Where the count starts. Defaults to zero. */
  from?: number
  /** Duration tier. Numbers are small things; `base` is usually right. */
  duration?: DurationToken
  /** Render a value as text. Defaults to a rounded integer. */
  format?: (value: number) => string
}

/**
 * Count an element's text up to a number.
 *
 * The reward primitive: a value that *arrives* rather than appears reads as
 * something the player earned. Re-runs whenever the target changes, so a second
 * award in the same view counts on from where the first landed instead of
 * restarting at zero.
 *
 * `countTo` already collapses to an instant write under reduced motion, so the
 * number is always correct and never depends on the animation running.
 */
export function useCountTo(
  ref: RefObject<HTMLElement | null>,
  to: number | null,
  options: CountToOptions = {}
): void {
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    const element = ref.current
    if (!element || to === null) return

    const animation = countTo(element, to, optionsRef.current)
    return () => {
      animation.revert()
    }
  }, [ref, to])
}

export type MagneticOptions = {
  /** How far the element leans toward the cursor, as a fraction of the offset. */
  strength?: number
  /** Radius around the element within which attraction begins, in px. */
  radius?: number
}

/**
 * Magnetic attraction — the element leans toward a nearby cursor and springs
 * back when it leaves.
 *
 * Implemented as a direct transform write inside the shared pointer loop: no
 * state, no re-render, one composited property. Disabled outright when ambient
 * motion is not allowed, in which case the element is simply a normal element —
 * nothing is lost, because a magnet was never carrying meaning.
 */
export function useMagnetic(
  ref: RefObject<HTMLElement | null>,
  options: MagneticOptions = {}
): void {
  const { strength = 0.28, radius = 96 } = options

  useEffect(() => {
    const element = ref.current
    if (!element || !ambientMotionAllowed()) return

    const onPointer = (pointer: PointerState) => {
      const rect = element.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const deltaX = pointer.x - centerX
      const deltaY = pointer.y - centerY
      const distance = Math.hypot(deltaX, deltaY)

      const pull = distance > radius + Math.max(rect.width, rect.height) / 2 ? 0 : strength
      element.style.transform = `translate3d(${deltaX * pull}px, ${deltaY * pull}px, 0)`
    }

    element.style.willChange = 'transform'
    element.style.transition = `transform ${DURATION.base}ms cubic-bezier(${EASE_CURVE.move.join(',')})`
    const unsubscribe = subscribePointer(onPointer)

    return () => {
      unsubscribe()
      element.style.removeProperty('will-change')
      element.style.removeProperty('transition')
      element.style.removeProperty('transform')
    }
  }, [ref, radius, strength])
}

/**
 * Publish cursor position onto an element as CSS variables, powering the
 * `.spotlight` utility and any other cursor-aware lighting.
 */
export function useCursorGlow(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const element = ref.current
    if (!element) return
    return bindPointerVariables(element)
  }, [ref])
}

/**
 * Drive an element to follow the cursor with spring physics — the primitive
 * behind MouseFollower.
 *
 * The follower is decoration by definition, so it does not render at all when
 * ambient motion is disallowed; callers check `ambientMotionAllowed()` before
 * mounting it.
 */
export function usePointerFollower(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const element = ref.current
    if (!element || !ambientMotionAllowed()) return

    let x = 0
    let y = 0
    let velocityX = 0
    let velocityY = 0
    const { stiffness, damping, mass } = SPRING.pointer

    const onPointer = (pointer: PointerState) => {
      // Semi-implicit Euler integration — cheap, stable, and reads as physical.
      const accelerationX = (pointer.rawX - x) * (stiffness / 1000) - velocityX * (damping / 100)
      const accelerationY = (pointer.rawY - y) * (stiffness / 1000) - velocityY * (damping / 100)
      velocityX += accelerationX / mass
      velocityY += accelerationY / mass
      x += velocityX
      y += velocityY

      element.style.transform = `translate3d(${x}px, ${y}px, 0)`
      element.style.opacity = pointer.isActive ? '1' : '0'
    }

    element.style.willChange = 'transform, opacity'
    const unsubscribe = subscribePointer(onPointer)

    return () => {
      unsubscribe()
      element.style.removeProperty('will-change')
      element.style.removeProperty('transform')
      element.style.removeProperty('opacity')
    }
  }, [ref])
}

/**
 * A stable press handler that plays the tap-lands beat on the event target.
 *
 * Returned as a callback so it can be spread onto any element without the
 * caller importing the engine or worrying about reduced motion.
 */
export function usePressFeedback(scale = 0.97): (event: { currentTarget: HTMLElement }) => void {
  return useCallback(
    (event: { currentTarget: HTMLElement }) => {
      if (prefersReducedMotion()) return
      const element = event.currentTarget
      element.animate(
        [{ transform: 'scale(1)' }, { transform: `scale(${scale})` }, { transform: 'scale(1)' }],
        { duration: DURATION.fast, easing: `cubic-bezier(${EASE_CURVE.move.join(',')})` }
      )
    },
    [scale]
  )
}
