/**
 * Cursor interaction engine.
 *
 * One rAF loop, one set of listeners, one shared pointer state — no matter how
 * many magnetic buttons, spotlights or followers are mounted. Each of those
 * subscribing independently is the classic way a "premium" cursor effect turns
 * into a scroll-jank generator; here the cost is constant.
 *
 * The loop is lazy in both directions: it starts on the first subscriber and
 * stops on the last, and it never starts at all when ambient motion is
 * disallowed (reduced motion, or a device with no fine pointer).
 *
 * Consumers get *smoothed* coordinates. Raw pointer events are noisy and
 * arrive at inconsistent rates; the loop damps toward the raw position each
 * frame, which is what makes attraction and following feel physical rather
 * than twitchy.
 */

import { ambientMotionAllowed, subscribeReducedMotion } from './reduced-motion'

export type PointerState = {
  /** Smoothed viewport coordinates. */
  x: number
  y: number
  /** Raw, unsmoothed viewport coordinates. */
  rawX: number
  rawY: number
  /** Per-frame velocity, px/frame. Sign carries direction. */
  vx: number
  vy: number
  /** Magnitude of velocity — useful for speed-reactive effects. */
  speed: number
  /** False until the pointer has been seen at least once. */
  isActive: boolean
}

type Subscriber = (state: PointerState) => void

/** How hard the smoothed position chases the raw one each frame (0–1). */
const DAMPING = 0.18
/** Below this, the loop idles instead of scheduling more frames. */
const REST_SPEED = 0.01

const state: PointerState = {
  x: 0,
  y: 0,
  rawX: 0,
  rawY: 0,
  vx: 0,
  vy: 0,
  speed: 0,
  isActive: false,
}

const subscribers = new Set<Subscriber>()
let frameId: number | null = null
let listening = false
let unsubscribePreference: (() => void) | null = null

function handlePointerMove(event: PointerEvent): void {
  state.rawX = event.clientX
  state.rawY = event.clientY

  if (!state.isActive) {
    // First sighting: teleport rather than glide in from the origin.
    state.x = state.rawX
    state.y = state.rawY
    state.isActive = true
  }

  requestTick()
}

function handlePointerLeave(): void {
  state.isActive = false
  requestTick()
}

function tick(): void {
  frameId = null

  const previousX = state.x
  const previousY = state.y

  state.x += (state.rawX - state.x) * DAMPING
  state.y += (state.rawY - state.y) * DAMPING
  state.vx = state.x - previousX
  state.vy = state.y - previousY
  state.speed = Math.hypot(state.vx, state.vy)

  for (const subscriber of subscribers) subscriber(state)

  // Keep animating only while there is still distance to close. Once the
  // cursor rests, the loop stops entirely rather than burning frames.
  if (state.speed > REST_SPEED) requestTick()
}

function requestTick(): void {
  frameId ??= requestAnimationFrame(tick)
}

function startListening(): void {
  if (listening || !ambientMotionAllowed()) return
  listening = true
  window.addEventListener('pointermove', handlePointerMove, { passive: true })
  document.addEventListener('pointerleave', handlePointerLeave, { passive: true })
}

function stopListening(): void {
  if (!listening) return
  listening = false
  window.removeEventListener('pointermove', handlePointerMove)
  document.removeEventListener('pointerleave', handlePointerLeave)
  if (frameId !== null) {
    cancelAnimationFrame(frameId)
    frameId = null
  }
  state.isActive = false
}

/**
 * Subscribe to smoothed pointer state. Returns an unsubscribe function; the
 * engine shuts itself down when the last subscriber leaves.
 *
 * The callback runs inside the rAF loop, so it must stay cheap: write styles or
 * custom properties, never trigger React state or read layout.
 */
export function subscribePointer(subscriber: Subscriber): () => void {
  subscribers.add(subscriber)
  startListening()

  // The preference can flip mid-session; honour it without a remount.
  unsubscribePreference ??= subscribeReducedMotion(() => {
    if (ambientMotionAllowed()) {
      if (subscribers.size > 0) startListening()
    } else {
      stopListening()
    }
  })

  return () => {
    subscribers.delete(subscriber)
    if (subscribers.size > 0) return
    stopListening()
    unsubscribePreference?.()
    unsubscribePreference = null
  }
}

/** Read current pointer state without subscribing. */
export function getPointerState(): Readonly<PointerState> {
  return state
}

/**
 * Publish pointer position onto an element as CSS custom properties, relative
 * to that element's own box.
 *
 * This is how cursor-aware lighting works without React: the `.spotlight`
 * utility reads `--pointer-x` / `--pointer-y` / `--pointer-opacity`, so moving
 * the cursor repaints a gradient and nothing re-renders. Returns a cleanup
 * function that unsubscribes and clears the properties.
 */
export function bindPointerVariables(element: HTMLElement): () => void {
  if (!ambientMotionAllowed()) return () => undefined

  const update = (pointer: PointerState) => {
    const rect = element.getBoundingClientRect()
    const insideX = pointer.rawX >= rect.left && pointer.rawX <= rect.right
    const insideY = pointer.rawY >= rect.top && pointer.rawY <= rect.bottom
    const isInside = pointer.isActive && insideX && insideY

    element.style.setProperty('--pointer-x', `${pointer.x - rect.left}px`)
    element.style.setProperty('--pointer-y', `${pointer.y - rect.top}px`)
    element.style.setProperty('--pointer-opacity', isInside ? '1' : '0')
  }

  const unsubscribe = subscribePointer(update)

  return () => {
    unsubscribe()
    element.style.removeProperty('--pointer-x')
    element.style.removeProperty('--pointer-y')
    element.style.removeProperty('--pointer-opacity')
  }
}
