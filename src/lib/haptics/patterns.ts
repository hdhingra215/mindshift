/**
 * Haptic patterns — the physical vocabulary, in milliseconds.
 *
 * ── The one dimension ───────────────────────────────────────────────────────
 * `navigator.vibrate` exposes **duration only**. There is no amplitude, no
 * sharpness, no waveform — nothing the Taptic-style APIs in native code offer.
 * So everything a pattern can say it says with the length of its pulses and the
 * gaps between them, and *perceived strength is dwell time*: below roughly
 * 10 ms an LRA has barely finished spinning up, and the pulse is felt as a
 * rumour rather than a tap.
 *
 * That is why the 8.9 set felt weak. It was authored around a 60 ms ceiling
 * with pulses as short as 4 ms — restrained on paper, imperceptible in the
 * hand. Phase 8.10 roughly doubles the scale and, more importantly, gives every
 * pattern a distinct **shape**, because two pulses of the same length are the
 * same sensation however far apart you space them.
 *
 * ── The rules, restated ─────────────────────────────────────────────────────
 * 1. **Short.** Nothing exceeds 90 ms of motor time. Still well under the
 *    threshold where a pulse becomes a buzz.
 * 2. **Rare.** Attached to consequence, and throttled where a player can
 *    produce the moment continuously.
 * 3. **Distinct.** Every pattern differs from every other in *shape* — single,
 *    rising, falling, symmetrical, or crescendo — not merely in length. A
 *    player should be able to tell a commitment from a discovery with the
 *    screen off, which is the actual test of whether this is worth having.
 */

/**
 * Pulse floor, ms.
 *
 * A scaled pulse shorter than this is not a gentler tap, it is a missing one —
 * so the intensity control rounds up to this rather than fading into nothing.
 */
export const MIN_PERCEPTIBLE_MS = 8

/**
 * The vocabulary, authored at full intensity.
 *
 * Read the shapes down the list: the family is single → rising → falling →
 * symmetrical → crescendo, which is the same gradient the sound materials use.
 */
export const PATTERNS = {
  /** Light passing over something. The lightest, and the most frequent. */
  brush: 9,

  /** A mark on an instrument: a rail notch, an XP tick. Definite, tiny. */
  hairline: 16,

  /** A choice takes. A clean, unambiguous tap — the workhorse. */
  select: 26,

  /**
   * A commitment. Two stages with the weight in the second, so it feels like a
   * mechanism seating rather than a double-tap. The one pattern a player should
   * recognise with their eyes shut.
   */
  commit: [30, 35, 48],

  /** Something resolved as it should. **Rising** — short into long. */
  affirm: [20, 45, 38],

  /**
   * Something opened the other way. **Falling** — long into short.
   *
   * Exactly the same motor time as `affirm`, inverted. A miss is a discovery
   * (§12.20), so it is not weaker, longer or harsher than a catch — it is the
   * same event running the other way, which is also what makes the two
   * instantly distinguishable.
   */
  discover: [38, 45, 20],

  /** The metric the player is here for. **Symmetrical** — a struck balance. */
  mark: [26, 30, 26],

  /** A milestone. **Crescendo**, and the only pattern with three pulses. */
  milestone: [20, 35, 20, 35, 50],

  /** Something arrived: a reveal, a room change, the Twin speaking. Soft rise. */
  reveal: [14, 28, 22],
} as const

export type HapticPattern = keyof typeof PATTERNS

/** Total motor time of a pattern, ms — the pulses, not the gaps. */
export function motorTime(pattern: HapticPattern): number {
  return pulsesOf(PATTERNS[pattern]).reduce((total, ms) => total + ms, 0)
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
