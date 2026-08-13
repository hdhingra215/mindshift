/**
 * Audio tokens — the physical vocabulary of the product's sound.
 *
 * ── What changed in 8.9, and why ────────────────────────────────────────────
 * The first version of this file was a set of *pitches*: sine and square voices
 * arranged into intervals. That is how interface audio ends up sounding like an
 * interface — a beep is a beep however tastefully it is tuned, and a bed made of
 * detuned oscillators is a fan however slowly it breathes.
 *
 * The vocabulary is now **materials, not notes.** Every discrete sound is a
 * short excitation through a resonator: noise struck into a narrow band that
 * rings briefly, plus, where a sound needs weight, a body that falls in pitch
 * the way a struck object does. That is what makes a sound read as *something
 * happening to an object* rather than as a tone played at you. The environment
 * is not synthesised at all — it is a recording (`ambience.ts`).
 *
 * ── The rules ───────────────────────────────────────────────────────────────
 * 1. **No naked oscillator.** A tone exists only as a *body* — low, brief,
 *    falling, always filtered. Never a sustained pitch on its own.
 * 2. **Resonance carries identity.** Two moments differ by the material struck,
 *    not by the note played.
 * 3. **Restraint is the design.** Nine materials for the whole product, and
 *    most controls make no sound at all.
 */

/**
 * Resonant centres, in Hz.
 *
 * These are the *bodies* things are struck into, not a musical scale. Spaced
 * widely enough to tell apart, and all in the range small speakers reproduce.
 */
export const RESONANCE = {
  /** Deep, felt more than heard. Commitment. */
  chest: 180,
  /** A small wooden object. Selection. */
  wood: 420,
  /** Cloth, felt, a fingertip. Presence. */
  felt: 900,
  /** Glass, struck lightly. Detail and marks. */
  glass: 2200,
  /** The very top — a hairline tick. */
  filament: 3400,
} as const

/**
 * Envelope tiers, in seconds. Excitation is always near-instant; what differs
 * is how long the material rings afterwards.
 */
export const ENVELOPE = {
  /** Under the threshold of "a sound played". */
  graze: { attack: 0.002, decay: 0.05 },
  /** A contact. */
  tap: { attack: 0.002, decay: 0.14 },
  /** A struck object with a body. */
  strike: { attack: 0.003, decay: 0.38 },
  /** Something that rings. Milestones and reveals. */
  ring: { attack: 0.004, decay: 1.1 },
  /** Air moving. No transient at all — this one breathes in. */
  breath: { attack: 0.18, decay: 0.7 },
} as const

/**
 * Bus ceilings.
 *
 * All 1.0 by design. The player's preference *is* the level, and the master bus
 * feeds a limiter — that is what protects the output. Phase 8.8 stacked three
 * conservative factors here and shipped the entire system at −32 dBFS, which is
 * inaudible. Attenuating defensively is not a safety mechanism.
 */
export const CEILING = {
  master: 1,
  sfx: 1,
  ambient: 1,
} as const

/**
 * Default preferences.
 *
 * The environment is **on**: the product is a place, and a place that stays
 * silent until you find a switch is not one. Nothing plays before the browser
 * permits it, and the control sits in the top bar at every breakpoint.
 */
export const DEFAULT_MIX = {
  muted: false,
  master: 0.75,
  sfx: 0.8,
  ambient: 0.65,
  /** Haptics follow the same default: present, and one switch from off. */
  haptics: true,
  /**
   * Full strength. The patterns are authored at the intensity they are meant
   * to be felt, so the slider attenuates rather than boosts — there is no
   * hidden headroom a player has to go and find.
   */
  hapticIntensity: 1,
} as const

/**
 * Lifecycle limits.
 *
 * `MAX_VOICES` is the spam ceiling: past it, cues are dropped rather than
 * queued, because an interface sound arriving after the interaction it
 * describes is noise. `MIN_GAP_MS` stops two immediate cues stacking into one
 * broken-sounding smear.
 */
export const MAX_VOICES = 12
export const MIN_GAP_MS = 40

/** Reverb impulse length, seconds. The size of the room, and its only cost. */
export const ROOM_SECONDS = 2.4
/** How dark the room is. A bright tail would make a small room a hall. */
export const ROOM_DAMPING = 3.6

/**
 * Phrase positions, in ms.
 *
 * Several surfaces can arrive in the same frame — an outcome, a wager result, a
 * Twin verdict, mastery, XP. Played at once they are one muddy noise; given
 * these offsets they are a sequence settling, in the order the eye reads them.
 */
export const PHRASE = {
  lead: 0,
  second: 420,
  third: 700,
  fourth: 980,
  tail: 1180,
} as const

/**
 * A body: low, brief, falling. The weight under a strike, never a note. Bodies
 * always glide downward because struck objects do; a body that held its pitch
 * would be the beep this palette exists to avoid.
 */
export type BodyLayer = {
  kind: 'body'
  freq: number
  glideTo: number
  gain: number
  attack: number
  decay: number
  at?: number
  cutoff?: number
  space?: number
}

/** An excitation through a resonator. The product's primary sound. */
export type StrikeLayer = {
  kind: 'strike'
  /** Resonant centre — the material being struck. */
  band: number
  /** Sweep the resonance. Movement without pitch. */
  bandTo?: number
  /**
   * How sharply the material rings. Low is a dull thud or a wash; high is a
   * struck body with a definite tone. This one number is most of a material's
   * character.
   */
  q: number
  gain: number
  attack: number
  decay: number
  at?: number
  space?: number
}

export type CueLayer = BodyLayer | StrikeLayer

export type CueSpec = {
  /** Layers of one event. Never two events pretending to be one. */
  layers: readonly CueLayer[]
  /** Minimum gap between repeats of *this* cue, ms. */
  throttleMs: number
}
