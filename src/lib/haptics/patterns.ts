/**
 * Haptic patterns — the physical vocabulary, in milliseconds.
 *
 * ── The one dimension ───────────────────────────────────────────────────────
 * `navigator.vibrate` exposes **duration only**. There is no amplitude, no
 * sharpness, no waveform — nothing the Taptic-style APIs in native code offer.
 * So everything a pattern can say it says with the length of its pulses and the
 * gaps between them, and *perceived strength is dwell time*.
 *
 * ── Why the scale moved again in 8.11 ───────────────────────────────────────
 * 8.9 authored the set under a 60 ms ceiling with pulses as short as 4 ms.
 * 8.10 doubled that to a 90 ms ceiling with a 8 ms floor and called it fixed.
 * It still was not: on the phones people actually hold, the motor is an LRA
 * with a real **spin-up cost**. Measured against the hardware rather than
 * against a number in a file:
 *
 *   ≤10 ms   nothing reaches the surface of the case. The pulse is a rumour.
 *   ~15 ms   detectable if you are holding the phone still and expecting it.
 *   ~25 ms   a definite, light tap — the floor for anything that means
 *            "I registered you".
 *   ~45 ms   a confident tap. The right weight for taking a decision.
 *   ~90 ms   weighted. Reads as a mechanism seating, not as a longer tap.
 *   >180 ms  a single pulse stops being an event and becomes a buzz.
 *
 * So the floor is 14 ms, the lightest pattern in the set is 18 ms, and the
 * ceiling on total motor time is 220 ms. Nothing here is a buzz: the longest
 * *single* pulse is 100 ms, and every pattern above one pulse is shaped.
 *
 * ── The rules, restated ─────────────────────────────────────────────────────
 * 1. **Perceptible.** No pulse below `MIN_PERCEPTIBLE_MS`, before or after the
 *    intensity slider scales it. A pulse nobody can feel is a bug, not
 *    restraint.
 * 2. **Rare.** Attached to consequence, and throttled where a player can
 *    produce the moment continuously.
 * 3. **Distinct.** Every pattern differs from every other in *shape* — single,
 *    rising, falling, symmetrical, or crescendo — not merely in length. A
 *    player should be able to tell a commitment from a discovery with the
 *    screen off, which is the actual test of whether this is worth having.
 * 4. **Shaped, never sustained.** Weight comes from a second, heavier stage
 *    after a gap — the way a physical mechanism seats — never from holding one
 *    pulse longer.
 */

/**
 * Pulse floor, ms.
 *
 * A scaled pulse shorter than this is not a gentler tap, it is a missing one —
 * so the intensity control rounds up to this rather than fading into nothing.
 * Raised from 8 ms in 8.11: 8 ms was below the point an LRA has spun up.
 */
export const MIN_PERCEPTIBLE_MS = 14

/** Longest total motor time any one pattern may spend. */
export const MAX_MOTOR_MS = 220

/** Longest any *single* pulse may run before it reads as a buzz. */
export const MAX_PULSE_MS = 100

/**
 * The vocabulary, authored at full intensity.
 *
 * Read the shapes down the list: the family is single → rising → falling →
 * symmetrical → crescendo, which is the same gradient the sound materials use.
 */
export const PATTERNS = {
  /** Light passing over something. The lightest, and the most frequent. */
  brush: 18,

  /**
   * A blind spot lighting up under the cursor. **Two quick glints**, close
   * together and both light — a sensation with a sparkle in it rather than a
   * tap, so noticing a bias never feels like choosing one.
   */
  glint: [16, 26, 20],

  /** A mark on an instrument: a rail notch, an XP tick. Definite, tiny. */
  hairline: 26,

  /** A choice takes. A clean, unambiguous tap — the workhorse. */
  select: 45,

  /**
   * A commitment. Two stages with the weight in the second, so it feels like a
   * mechanism seating rather than a double-tap. The pattern a player should
   * recognise with their eyes shut.
   */
  commit: [40, 45, 90],

  /**
   * Insight on the line. The heaviest thing in the product.
   *
   * Three stages where a commitment has two, and the last is the longest pulse
   * in the set. A stake is a commitment *with something at risk*, and it is the
   * one moment allowed to feel like more than the answer that preceded it.
   */
  stake: [34, 40, 52, 40, 100],

  /** Something resolved as it should. **Rising** — short into long. */
  affirm: [30, 50, 62],

  /**
   * Something opened the other way. **Falling** — long into short.
   *
   * Exactly the same motor time as `affirm`, inverted. A miss is a discovery
   * (§12.20), so it is not weaker, longer or harsher than a catch — it is the
   * same event running the other way, which is also what makes the two
   * instantly distinguishable.
   */
  discover: [62, 50, 30],

  /** The metric the player is here for. **Symmetrical** — a struck balance. */
  mark: [44, 40, 44],

  /** A milestone. **Crescendo**, and the richest pattern in the set. */
  milestone: [26, 40, 38, 40, 92],

  /** Something arrived: a reveal, a room change, the Twin speaking. Soft rise. */
  reveal: [24, 35, 40],
} as const

export type HapticPattern = keyof typeof PATTERNS

/**
 * Weight class — what a pattern is allowed to interrupt.
 *
 * The anti-buzz floor exists to stop *repetition*, and until 8.11 it applied to
 * everything equally. That produced the defect this phase was reported for: a
 * player hovers an option (light pulse), clicks it 40 ms later, and the
 * commitment — the single most important haptic in the product — is swallowed
 * by the floor the hover just closed. The interface felt dead at exactly the
 * moment it should have felt certain.
 *
 * So `light` patterns queue behind the floor, and `decisive` ones do not: an
 * act the player deliberately took always reaches the motor. Decisive patterns
 * are still bounded by their moment's own throttle, and there are only five of
 * them, all of which require a click.
 */
export const WEIGHT: Record<HapticPattern, 'light' | 'decisive'> = {
  brush: 'light',
  glint: 'light',
  hairline: 'light',
  reveal: 'light',
  select: 'decisive',
  commit: 'decisive',
  stake: 'decisive',
  affirm: 'decisive',
  discover: 'decisive',
  mark: 'decisive',
  milestone: 'decisive',
}

/** Whether this pattern may interrupt the anti-buzz floor. */
export function isDecisive(pattern: HapticPattern): boolean {
  return WEIGHT[pattern] === 'decisive'
}

/** Total motor time of a pattern, ms — the pulses, not the gaps. */
export function motorTime(pattern: HapticPattern): number {
  return pulsesOf(PATTERNS[pattern]).reduce((total, ms) => total + ms, 0)
}

/** The pulses of a pattern, ignoring the silences. */
export function pulses(pattern: HapticPattern): number[] {
  return pulsesOf(PATTERNS[pattern])
}

/** Even indices are pulses; odd indices are the silences between them. */
function pulsesOf(value: number | readonly number[]): number[] {
  if (typeof value === 'number') return [value]
  return value.filter((_, index) => index % 2 === 0)
}

/**
 * Scale a pattern by the player's intensity preference.
 *
 * Since the API has no amplitude, intensity **is** duration: the pulses stretch
 * and shrink while the gaps hold, so the pattern keeps its rhythm and only its
 * weight changes. Scaling the gaps too would turn "lighter" into "slower",
 * which is a different sensation entirely.
 *
 * Returns null at zero intensity — off, not imperceptible.
 */
export function scalePattern(
  pattern: HapticPattern,
  intensity: number,
): number | number[] | null {
  const clamped = Math.min(1, Math.max(0, intensity))
  if (clamped === 0) return null

  const scale = (ms: number) => Math.max(MIN_PERCEPTIBLE_MS, Math.round(ms * clamped))

  const value = PATTERNS[pattern]
  if (typeof value === 'number') return scale(value)
  return value.map((ms, index) => (index % 2 === 0 ? scale(ms) : ms))
}
