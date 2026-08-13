import { useEffect, useRef } from 'react'

import { playCue } from '@/lib/audio'
import { vibrate } from '@/lib/haptics'

import { MOMENTS, type MomentName } from './moments'

/**
 * `signal` — the one call a component makes to say something happened.
 *
 * Both channels fire from a single name, so a moment can never end up audible
 * but not physical (or the reverse) because two call sites drifted apart. Every
 * gate — mute, preferences, reduced motion, hardware support, throttling —
 * lives below this line. A component's job is to know *when*; the system's job
 * is to know *whether* and *what*.
 *
 * Deliberately not a hook. Most moments happen inside an event handler, and a
 * plain function can be called from anywhere without ceremony.
 */
export type SignalOptions = {
  /** Offset the sound within a phrase, ms. See `PHRASE` in the audio tokens. */
  delayMs?: number
}

/**
 * When each moment last fired.
 *
 * A moment-level throttle rather than a per-channel one, because a moment is
 * the thing being repeated: the torch sweeping should be rare *as an event*,
 * not rare in sound and frequent in vibration.
 */
const lastSignalled = new Map<MomentName, number>()

/** As in the layers below: zero would suppress the first seconds of a visit. */
const NEVER = Number.NEGATIVE_INFINITY

export function signal(moment: MomentName, options: SignalOptions = {}): void {
  const spec = MOMENTS[moment]
  const throttleMs = 'throttleMs' in spec ? spec.throttleMs : undefined

  if (throttleMs !== undefined) {
    const now = performance.now()
    if (now - (lastSignalled.get(moment) ?? NEVER) < throttleMs) return
    lastSignalled.set(moment, now)
  }

  if ('cue' in spec && spec.cue) {
    playCue(spec.cue, { delayMs: options.delayMs })
  }

  if ('haptic' in spec && spec.haptic) {
    /*
     * The pulse takes the same phrase offset as the sound.
     *
     * Until 8.11 haptics were never deferred, on the reasoning that a late
     * pulse describes something already past. That is right for one moment and
     * wrong for a reveal screen, where the outcome, the wager result, mastery
     * and XP all mount inside one tick: the anti-buzz floor kept the first and
     * dropped the other four, so most of the product's best haptic moments were
     * never felt at all. Offset, each lands with its own beat.
     *
     * The throttle is keyed by *moment* rather than by pattern, so two moments
     * that happen to share a pattern no longer suppress one another — the torch
     * sweeping the hero (a `brush` every 1.6 s) used to silence the next option
     * hover, which is a different event.
     */
    vibrate(spec.haptic, {
      throttleKey: moment,
      delayMs: options.delayMs,
      ...(throttleMs === undefined ? {} : { throttleMs }),
    })
  }
}

/** Drop the moment throttle history. Test seam only. */
export function resetSignalThrottles(): void {
  lastSignalled.clear()
}

/**
 * Signal a moment once, when a surface appears.
 *
 * The reveal beats — an outcome, a wager settling, a Twin verdict, a milestone
 * — all mount at once, so each one takes a `delayMs` from the `PHRASE` ladder
 * and the group is heard as a sequence settling rather than a collision.
 */
export function useSignalOnMount(
  moment: MomentName | null,
  options: SignalOptions & { enabled?: boolean } = {},
): void {
  const { enabled = true, delayMs } = options
  const fired = useRef(false)

  useEffect(() => {
    if (!moment || !enabled || fired.current) return
    fired.current = true
    signal(moment, { delayMs })
  }, [moment, enabled, delayMs])
}

/**
 * Scrub haptics — a pulse each time a continuous value crosses a stop.
 *
 * The problem this solves: a progress line that follows the scroll wants to
 * feel like something being *moved*, and the naive implementation — vibrate on
 * scroll — produces a continuous buzz that is both unpleasant and a battery
 * drain. So nothing here is tied to scrolling at all. The value is divided into
 * `stops` bands and a pulse fires only when the value *crosses a boundary*,
 * which happens a handful of times across an entire section.
 *
 * Direction is tracked as well as position: scrolling back up re-arms the stop
 * you just left, so the rail feels like a physical detent rather than a
 * one-way animation. The engine's own floor and the moment's throttle sit
 * underneath as a second and third guard.
 *
 * Direction matters, and 8.11 makes the two directions different moments:
 * scrolling down *advances* the rail (a reel winding in, plus a mark to feel),
 * scrolling back up only re-arms it (a light detent, and no sound). Both are
 * throttled at the moment level, and the engine's floor sits underneath — so
 * scrubbing the page back and forth across a boundary cannot produce a stream
 * however hard someone tries.
 *
 * @param value  0–1 progress. Read from a scroll MotionValue by the caller.
 * @param stops  How many detents across the whole range.
 */
export function createScrubber(stops: number): (value: number) => void {
  let lastStop: number | null = null

  return (value: number) => {
    if (stops <= 0 || !Number.isFinite(value)) return

    const clamped = Math.min(1, Math.max(0, value))
    const stop = Math.min(stops - 1, Math.floor(clamped * stops))

    // The first reading establishes position without firing: arriving at a
    // section — or restoring a scroll position — is not crossing anything.
    if (lastStop === null) {
      lastStop = stop
      return
    }

    if (stop === lastStop) return
    const advancing = stop > lastStop
    lastStop = stop
    signal(advancing ? 'rail.advance' : 'rail.return')
  }
}
