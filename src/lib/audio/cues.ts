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

  /* ── 8.11: four materials, for four moments the first nine could not reach ──
   *
   * Three of them carry a recording (`assets/sounds/soundcn-*.mp3`). None of
   * them replaces or retunes anything above — the nine synthesised materials are
   * unchanged, and so is the environment.
   */

  /**
   * **glint** — a blind spot lighting up. Something noticed, not something done.
   *
   * The quietest material in the product, and the highest: two hairlines a
   * breath apart, well into the room, with no body at all. It has to read as a
   * point of light catching rather than as an interface responding — which is
   * why it is glass and air, has no transient weight, and sits below `tick`.
   */
  glint: {
    throttleMs: 140,
    layers: [
      { kind: 'strike', band: RESONANCE.glass, q: 18, gain: 0.055, space: 0.42, ...ENVELOPE.graze },
      { kind: 'strike', band: RESONANCE.glass * 1.9, q: 24, gain: 0.03, at: 0.045, space: 0.5, ...ENVELOPE.strike },
    ],
  },

  /**
   * **enter** — the one action that takes the player into the product.
   *
   * A switch closing (`switch-001`) over the chest body the commitment
   * materials use. The recording gives it a mechanical, unmistakably *physical*
   * top that noise-through-a-resonator cannot produce; the body under it is what
   * keeps it in the same family as everything else rather than sounding like a
   * borrowed sample. Used exactly once on the page, which is what earns it.
   */
  enter: {
    throttleMs: 600,
    layers: [
      { kind: 'sample', sample: 'switch', gain: 0.5, rate: 1.04, duration: 0.42, space: 0.18 },
      { kind: 'body', freq: 210, glideTo: 72, gain: 0.34, cutoff: 300, attack: 0.002, decay: 0.24 },
      { kind: 'strike', band: RESONANCE.chest, q: 8, gain: 0.16, at: 0.03, space: 0.12, ...ENVELOPE.tap },
    ],
  },

  /**
   * **stake** — Insight goes on the line.
   *
   * `seat` with a weight landing on it: the same two-stage mechanism, plus a
   * short recorded drop (`drop-003`) on the second stage and a lower, longer
   * body. Deliberately heavier than `seat` — committing an answer costs nothing
   * but the answer, and this one costs something the player earned.
   */
  stake: {
    throttleMs: 300,
    layers: [
      { kind: 'strike', band: RESONANCE.wood * 0.7, q: 5, gain: 0.28, ...ENVELOPE.tap },
      { kind: 'body', freq: 180, glideTo: 62, gain: 0.44, cutoff: 240, attack: 0.002, decay: 0.24 },
      { kind: 'sample', sample: 'drop', gain: 0.5, rate: 0.92, duration: 0.19, at: 0.085, space: 0.14 },
      { kind: 'body', freq: 108, glideTo: 48, gain: 0.26, cutoff: 170, at: 0.085, attack: 0.003, decay: 0.36, space: 0.1 },
    ],
  },

  /**
   * **reel** — the progression rail advancing under a scroll.
   *
   * The first third of a reel being wound in (`fish-reel-in`), rate-shifted down
   * and trimmed to a gesture. It is the one material with a *mechanical
   * continuity* to it, which is exactly what a line being drawn down the page
   * needs: something is being pulled, and the pull has a length.
   *
   * Quiet and short by necessity — it can fire a few times per section — and
   * heavily throttled at the moment above it. The rail's reverse crossing stays
   * silent (see `rail.return`); winding back is not an event.
   */
  reel: {
    throttleMs: 520,
    layers: [
      { kind: 'sample', sample: 'reel', gain: 0.3, rate: 0.86, duration: 0.5, release: 0.14, space: 0.3 },
      { kind: 'strike', band: RESONANCE.filament, q: 14, gain: 0.05, space: 0.2, ...ENVELOPE.graze },
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
