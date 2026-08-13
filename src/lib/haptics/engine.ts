import { getAudioMix, isHapticsEnabled } from '@/lib/audio'
import { prefersReducedMotion } from '@/lib/motion'

import { scalePattern, type HapticPattern } from './patterns'

/**
 * The haptics engine — the only place in the product that may vibrate a device.
 *
 * `navigator.vibrate` is trivial to call, which is exactly why it needs an
 * owner: scattered through components it becomes impossible to answer "what
 * makes this thing buzz", and impossible to stop it doing so. Every rule about
 * restraint lives here, once.
 *
 * ── Support ─────────────────────────────────────────────────────────────────
 * Vibration is Android/Chromium only in practice. iOS Safari does not implement
 * it and desktop hardware has no motor. That is not an error case — it is the
 * majority case, and the entire API is a **no-op that returns false** wherever
 * it is unavailable. Nothing in the product may depend on a haptic firing.
 */

/** Minimum gap between any two pulses, ms. The anti-buzz floor. */
const MIN_GAP_MS = 90

/**
 * "Never fired" sentinel.
 *
 * Not zero. `performance.now()` counts from page load, so a zero sentinel means
 * every throttle window is still "open" against the origin for its own duration
 * after the page appears — a 1600 ms moment is dead for the first 1.6 seconds
 * of a visit, silently, which is exactly when a visitor is first touching
 * things. Found by a test that asked for a pulse before the clock had run.
 */
const NEVER = Number.NEGATIVE_INFINITY

let lastFired = NEVER
const lastByPattern = new Map<HapticPattern, number>()

/**
 * Whether this device can vibrate at all.
 *
 * Read at call time rather than cached, because a test — and a browser
 * extension — can install the API after this module loads.
 */
export function hapticsSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof (navigator as Navigator & { vibrate?: unknown }).vibrate === 'function'
  )
}

export type VibrateOptions = {
  /**
   * Minimum gap before this specific pattern may repeat, ms. For patterns tied
   * to something a player can produce continuously — a scroll notch, a torch
   * moving — where the global floor alone is not enough.
   */
  throttleMs?: number
}

/**
 * Fire a pattern. Returns whether the device was actually asked to vibrate.
 *
 * Refuses, silently, when: the hardware cannot; the player turned haptics off;
 * the player muted everything; reduced motion is set; or a pulse fired too
 * recently. Callers never check any of that — they name a moment, and this
 * decides whether it is currently appropriate.
 */
export function vibrate(pattern: HapticPattern, options: VibrateOptions = {}): boolean {
  if (!hapticsSupported()) return false

  const mix = getAudioMix()
  if (!isHapticsEnabled(mix)) return false
  /*
   * Reduced motion covers haptics too. The preference is a request for less
   * *physical* stimulus, and a vibrating phone is the most physical output the
   * product has — reading it as "animations only" would be a technicality.
   */
  if (prefersReducedMotion()) return false

  const now = performance.now()
  if (now - lastFired < MIN_GAP_MS) return false

  const throttle = options.throttleMs ?? 0
  if (throttle > 0 && now - (lastByPattern.get(pattern) ?? NEVER) < throttle) return false

  // Scaled at the point of use rather than stored scaled, so moving the
  // intensity slider is felt on the very next pulse with nothing to invalidate.
  const scaled = scalePattern(pattern, mix.hapticIntensity)
  if (scaled === null) return false

  lastFired = now
  lastByPattern.set(pattern, now)

  try {
    navigator.vibrate(scaled)
    return true
  } catch {
    // Some embedded browsers expose the method and throw on use. A haptic that
    // fails is never worth an error surfacing anywhere near the player.
    return false
  }
}

/** Drop the throttle history. Test seam only — nothing in the app calls this. */
export function resetHapticThrottles(): void {
  lastFired = NEVER
  lastByPattern.clear()
}
