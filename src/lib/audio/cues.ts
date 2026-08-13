import { emit } from './engine'
import { getAudioMix, isAudible } from './preferences'
import { ENVELOPE, MIN_GAP_MS, RESONANCE, type CueSpec } from './tokens'

/**
 * The material catalogue.
 *
 * Nine sounds. Not nine *events* — nine **materials**, which the semantic layer
 * (`lib/feedback/moments.ts`) assigns to moments. That indirection is the whole
 * design: a product with twenty bespoke sounds has no sonic identity, and one
 * with nine materials used consistently has an identity you learn without
 * noticing. Choosing a supplier on the landing page and choosing an answer in a
 * session strike the same wood, because they are the same act.
 *
 * ── How a material is built ─────────────────────────────────────────────────
 * An excitation (noise) through a resonator (a narrow bandpass), sometimes over
 * a body (a low tone that falls). High `q` rings; low `q` is a wash. There is
 * no sustained pitch anywhere in this file — that is what separates a struck
 * object from a beep.
 *
 * ── What is deliberately absent ─────────────────────────────────────────────
 * A generic click. There is no `ui.press`, and `Button` makes no sound by
 * default. Sound marks *consequence* — a choice taken, a commitment made,
 * something revealed — never the fact that a control was clickable.
 */

export const CUES = {
  /**
   * **graze** — presence. A fingertip crossing felt.
   *
   * Barely a sound: no body, no ring, gone in 50 ms. Used only where hovering
   * is itself meaningful, never as a general hover.
   */
  graze: {
    throttleMs: 90,
    layers: [
      { kind: 'strike', band: RESONANCE.felt, q: 2.4, gain: 0.09, space: 0.05, ...ENVELOPE.graze },
    ],
  },

  /**
   * **wood** — a choice takes. A small wooden object set down.
   *
   * The most-used sound in the product, so it is the one that most has to not
   * grate: a definite body, a short ring, almost no top end.
   */
  wood: {
    throttleMs: 55,
    layers: [
      { kind: 'strike', band: RESONANCE.wood, q: 7, gain: 0.34, space: 0.1, ...ENVELOPE.tap },
      { kind: 'strike', band: RESONANCE.felt * 1.3, q: 3, gain: 0.1, ...ENVELOPE.graze },
      { kind: 'body', freq: 150, glideTo: 96, gain: 0.2, cutoff: 320, attack: 0.002, decay: 0.11 },
    ],
  },

  /**
   * **seat** — a commitment. A mechanism seating in two stages.
   *
   * The heaviest tactile moment in the product and the only two-stage material.
   * Dry on purpose: a commitment happens in your hands, not across a room.
   */
  seat: {
    throttleMs: 260,
    layers: [
      { kind: 'strike', band: RESONANCE.wood * 0.7, q: 5, gain: 0.3, ...ENVELOPE.tap },
      { kind: 'body', freq: 190, glideTo: 68, gain: 0.42, cutoff: 260, attack: 0.002, decay: 0.2 },
      { kind: 'strike', band: RESONANCE.chest, q: 9, gain: 0.24, at: 0.075, ...ENVELOPE.tap },
      { kind: 'body', freq: 120, glideTo: 55, gain: 0.26, cutoff: 190, at: 0.075, attack: 0.003, decay: 0.3, space: 0.08 },
    ],
  },

  /**
   * **bloom** — something resolves. Air opening into the room.
   *
   * A wash rather than a strike: the band sweeps upward and the room carries the
   * tail. This is the positive reveal, and it earns its length by having no
   * transient at all — nothing announces it, it simply becomes true.
   */
  bloom: {
    throttleMs: 380,
    layers: [
      { kind: 'strike', band: 380, bandTo: 1700, q: 1.1, gain: 0.24, space: 0.55, ...ENVELOPE.breath },
      { kind: 'strike', band: RESONANCE.glass, q: 12, gain: 0.1, at: 0.16, space: 0.5, ...ENVELOPE.strike },
      { kind: 'body', freq: 165, glideTo: 110, gain: 0.16, cutoff: 300, space: 0.2, attack: 0.05, decay: 0.5 },
    ],
  },

  /**
   * **shade** — something opens the other way. The same event, darker.
   *
   * Layer for layer identical to `bloom`, with the sweep descending instead of
   * rising and the second resonance lower. It is not sadder, quieter or
   * shorter: a wrong answer is a discovery (§12.20), and the audio holds that
   * line exactly as the copy does. The unit suite asserts the parity.
   */
  shade: {
    throttleMs: 380,
    layers: [
      { kind: 'strike', band: 1700, bandTo: 380, q: 1.1, gain: 0.24, space: 0.55, ...ENVELOPE.breath },
      { kind: 'strike', band: RESONANCE.wood * 1.6, q: 12, gain: 0.1, at: 0.16, space: 0.5, ...ENVELOPE.strike },
      { kind: 'body', freq: 165, glideTo: 110, gain: 0.16, cutoff: 300, space: 0.2, attack: 0.05, decay: 0.5 },
    ],
  },

  /**
   * **ring** — a milestone. Glass struck once, left to decay in the room.
   *
   * The only material allowed to last more than a second, and the only one with
   * real high-frequency content. Reserved for mastery and achievements, which
   * is what stops it becoming wallpaper.
   */
  ring: {
    throttleMs: 700,
    layers: [
      { kind: 'strike', band: RESONANCE.glass, q: 22, gain: 0.2, space: 0.6, ...ENVELOPE.ring },
      { kind: 'strike', band: RESONANCE.glass * 1.5, q: 26, gain: 0.08, at: 0.02, space: 0.65, ...ENVELOPE.ring },
      { kind: 'body', freq: 210, glideTo: 140, gain: 0.18, cutoff: 340, space: 0.25, attack: 0.004, decay: 0.6 },
    ],
  },

  /**
   * **tick** — a mark on an instrument. A hairline, and nothing else.
   *
   * XP, scroll notches, small confirmations. Quiet enough to repeat without
   * accumulating into a rattle, which is exactly what it is for.
   */
  tick: {
    throttleMs: 70,
    layers: [
      { kind: 'strike', band: RESONANCE.filament, q: 16, gain: 0.075, space: 0.18, ...ENVELOPE.graze },
    ],
  },

  /**
   * **air** — movement through the space. Navigation, and large reveals.
   *
   * Wide, soft, unpitched, well into the room. Nothing is struck; the space
   * simply moves. The only material with no defined resonance, which is why it
   * never competes with anything else happening on screen.
   */
  air: {
    throttleMs: 220,
    layers: [
      { kind: 'strike', band: 520, bandTo: 1500, q: 0.7, gain: 0.15, space: 0.5, ...ENVELOPE.breath },
    ],
  },

  /**
   * **veil** — the torch. Air, reversed and much smaller.
   *
   * Its own material rather than a quieter `air`, because drawing a light across
   * a surface is a different gesture from moving between rooms — and because
   * this fires more readily than anything else in the product, so it has to be
   * the most restrained thing in it.
   */
  veil: {
    throttleMs: 900,
    layers: [
      { kind: 'strike', band: 1400, bandTo: 620, q: 0.9, gain: 0.07, space: 0.45, attack: 0.09, decay: 0.42 },
    ],
  },
} as const satisfies Record<string, CueSpec>

export type CueName = keyof typeof CUES

/** Last time each cue fired, on the wall clock. Throttling outlives the graph. */
const lastPlayed = new Map<CueName, number>()

/**
 * "Never played" sentinel. Not zero: `performance.now()` counts from page load,
 * so zero would keep every throttle window closed against the origin for its
 * own duration after the page appears — silencing the first seconds of a visit.
 */
const NEVER = Number.NEGATIVE_INFINITY
let lastAnyPlayed = NEVER

export type PlayOptions = {
  /** Push the cue later on the audio clock, in ms. Used to phrase a sequence. */
  delayMs?: number
}

/**
 * Play a material.
 *
 * Silently does nothing when audio is muted, when the graph does not exist yet,
 * or when the cue would land on top of itself. Callers never check — the
 * semantic layer says what a moment is made of, and the engine decides whether
 * that is currently audible.
 */
export function playCue(name: CueName, options: PlayOptions = {}): void {
  if (!isAudible(getAudioMix())) return

  const delayMs = options.delayMs ?? 0
  // Both guards judge when the cue will be *heard*, not when it was requested —
  // otherwise a deliberately phrased sequence, all requested in one tick, would
  // throttle itself away.
  const at = performance.now() + delayMs
  const previous = lastPlayed.get(name) ?? NEVER
  if (at - previous < CUES[name].throttleMs) return

  // A second guard across all cues, applied only to immediate ones because that
  // is the spam case. Letting a future-scheduled time win here would silence
  // the next real interaction, including a milestone landing in the same tick.
  if (delayMs === 0 && at - lastAnyPlayed < MIN_GAP_MS) return

  lastPlayed.set(name, at)
  if (delayMs === 0) lastAnyPlayed = at
  emit(CUES[name].layers, delayMs / 1000)
}

/** Drop the throttle history. Test seam only — nothing in the app calls this. */
export function resetCueThrottles(): void {
  lastPlayed.clear()
  lastAnyPlayed = NEVER
}
