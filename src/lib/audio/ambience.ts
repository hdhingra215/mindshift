import { prefersReducedMotion, subscribeReducedMotion } from '@/lib/motion'

import ambienceUrl from '@/assets/sounds/ambience-observatory.mp3?url'
import { getGraph, loadSample, onAudioReady } from './engine'
import { getAudioMix, isAudible, subscribeAudioMix } from './preferences'

/**
 * The environment — one recording, filtered into rooms.
 *
 * ── What this replaced, and why ─────────────────────────────────────────────
 * Phase 8.8 built the environment from oscillators: a sub, two detuned bodies,
 * a fifth, noise, and an LFO on a filter. On paper that is a slow, evolving
 * room tone. Through a speaker it is a fan. No amount of tuning fixes it,
 * because the problem is not the settings — a steady bank of oscillators has no
 * irregularity in it, and irregularity is the whole difference between a
 * *place* and a *machine*.
 *
 * The bed is now a CC0 recording (`assets/sounds/LICENSE.md`): a guitar note
 * stretched into an atmospheric texture. It drifts because it was played, not
 * generated. Nothing in this file synthesises anything.
 *
 * ── Rooms are filters, not tracks ───────────────────────────────────────────
 * One decoded buffer and one looping source for the life of the session. A room
 * is a lowpass, a highpass, a level and a playback rate applied to that source.
 * Moving between rooms retunes; it never crossfades two recordings and never
 * allocates a second source — which is also why there cannot be duplicate
 * ambience however many surfaces declare a room.
 *
 * ── Cost ────────────────────────────────────────────────────────────────────
 * One buffer source, two filters, two gains. Every change is an `AudioParam`
 * ramp on the audio thread: no rAF loop, no interval, no React render.
 */

export type SoundEnvironment = 'silent' | 'observatory' | 'play' | 'archive' | 'twin'

export type BedSettings = {
  /** Level of the recording on the ambient bus. */
  level: number
  /** Lowpass — how much of the texture's top is present. Distance. */
  cutoff: number
  /** Highpass — how much body is removed. Thinness. */
  body: number
  /**
   * Playback rate. Slower is deeper and larger: the one setting that changes
   * the material's character rather than merely filtering it.
   */
  rate: number
  /** How much of the reverb room the bed sits in. Space, not volume. */
  space: number
}

const SILENT: BedSettings = { level: 0, cutoff: 800, body: 60, rate: 1, space: 0 }

/**
 * The rooms.
 *
 * Read the `level` column down the list and the design is visible: `play` is the
 * quietest place in the product, because the decision materials have to stand
 * out against it and because someone reading a scenario is thinking.
 */
const ENVIRONMENTS: Record<SoundEnvironment, BedSettings> = {
  silent: SILENT,

  /** Open, present, unhurried. The reference tuning — the room as recorded. */
  observatory: { level: 0.85, cutoff: 4200, body: 55, rate: 1, space: 0.18 },

  /** Close and focused. Darker and further off, so the decision is the event. */
  play: { level: 0.42, cutoff: 1500, body: 70, rate: 0.97, space: 0.1 },

  /** Restrained and archival: thinner, drier, a little more distant. */
  archive: { level: 0.58, cutoff: 2600, body: 150, rate: 0.99, space: 0.14 },

  /** Sparse and strange. Thin, slowed, and well back in the room. */
  twin: { level: 0.5, cutoff: 3000, body: 320, rate: 0.92, space: 0.34 },
}

/** How much further open a fully-established run leaves the texture. */
const MOMENTUM_CUTOFF_HZ = 1400
/** How much more of the room a fully-established run puts around it. */
const MOMENTUM_SPACE = 0.16

/**
 * Momentum → the room, as a pure function.
 *
 * **The rule:** a longer run makes the world *richer and more resolved* — never
 * louder and never faster. With a recording rather than oscillators, the two
 * things carrying resolution are *openness* and *space*: the texture's upper
 * detail comes through, and it sits in more room. Neither is a level.
 *
 * `level` and `rate` are returned untouched, deliberately. A louder or busier
 * room under a long streak is pressure dressed up as atmosphere (§12.22), and
 * the unit suite asserts both invariants for every room.
 */
export function resolveBed(environment: SoundEnvironment, momentum: number | null): BedSettings {
  const base = ENVIRONMENTS[environment]
  if (environment === 'silent' || momentum === null) return base

  const run = Math.min(1, Math.max(0, momentum))
  return {
    ...base,
    cutoff: base.cutoff + run * MOMENTUM_CUTOFF_HZ,
    space: base.space + run * MOMENTUM_SPACE,
  }
}

/* ── The declaration stack ──────────────────────────────────────────────────
 *
 * A screen *declares* its room, the same way it declares the world's warmth.
 * The most recent declaration wins, so a transient surface — the Twin speaking
 * mid-scenario — can take the room over and hand it straight back on unmount,
 * without the screen underneath knowing anything happened.
 */

type Declaration = {
  id: number
  environment: SoundEnvironment
  momentum: number | null
}

let nextId = 1
let stack: Declaration[] = []

function current(): Declaration | null {
  return stack.at(-1) ?? null
}

/* ── The bed ────────────────────────────────────────────────────────────── */

type Bed = {
  source: AudioBufferSourceNode
  low: BiquadFilterNode
  high: BiquadFilterNode
  level: GainNode
  send: GainNode
  stop: () => void
}

let bed: Bed | null = null
let buffer: AudioBuffer | null = null
let loading = false

/** Long ramps. The room should change without anyone catching it changing. */
const GLIDE = 2
const FAST_GLIDE = 0.5

/**
 * Guard trimmed off each end of the loop, in seconds.
 *
 * MP3 carries encoder delay and padding, so a decoded buffer has a few
 * milliseconds of silence bracketing the material; looping the whole buffer
 * would tick once per revolution. The asset is built with a four-second
 * crossfade, so trimming 40 ms costs nothing and removes the seam entirely.
 */
const LOOP_GUARD = 0.04

function buildBed(): Bed | null {
  const graph = getGraph()
  if (!graph || !buffer) return null
  const { ctx } = graph

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true
  source.loopStart = LOOP_GUARD
  source.loopEnd = Math.max(LOOP_GUARD * 2, buffer.duration - LOOP_GUARD)

  const high = ctx.createBiquadFilter()
  high.type = 'highpass'
  high.frequency.value = SILENT.body
  high.Q.value = 0.5

  const low = ctx.createBiquadFilter()
  low.type = 'lowpass'
  low.frequency.value = SILENT.cutoff
  low.Q.value = 0.4

  const level = ctx.createGain()
  level.gain.value = 0

  const send = ctx.createGain()
  send.gain.value = 0

  source.connect(high)
  high.connect(low)
  low.connect(level)
  level.connect(graph.ambient)
  level.connect(send)
  send.connect(graph.room)
  source.start(0, LOOP_GUARD)

  return {
    source,
    low,
    high,
    level,
    send,
    stop: () => {
      source.stop()
      source.disconnect()
      high.disconnect()
      low.disconnect()
      level.disconnect()
      send.disconnect()
    },
  }
}

function writeBed(target: Bed, settings: BedSettings, glide: number): void {
  const graph = getGraph()
  if (!graph) return
  const now = graph.ctx.currentTime

  target.level.gain.setTargetAtTime(settings.level, now, glide)
  target.low.frequency.setTargetAtTime(settings.cutoff, now, glide)
  target.high.frequency.setTargetAtTime(settings.body, now, glide)
  target.send.gain.setTargetAtTime(settings.space, now, glide)
  // The rate glides too — a room that changes size should do it the way a
  // camera moves, not the way a track cuts.
  target.source.playbackRate.setTargetAtTime(settings.rate, now, glide)
}

/**
 * Push the current declaration into the graph.
 *
 * Called on every declaration change, every preference change, when reduced
 * motion flips, and once the graph first exists. Cheap enough to call freely.
 */
export function applyAmbience(): void {
  const declaration = current()
  /*
   * Ambience is the lowest-priority tier of the experience, exactly as ambient
   * motion is on the visual side — so it is the first thing cut under a
   * reduced-motion preference. Discrete materials survive: they are brief, they
   * answer an action the player just took, and they never drift.
   */
  const suppressed =
    !declaration ||
    declaration.environment === 'silent' ||
    prefersReducedMotion() ||
    !isAudible(getAudioMix())

  if (suppressed) {
    // Fade out rather than tear down: the same player will very likely walk
    // straight back in, and a room that has to be rebuilt arrives late.
    if (bed) writeBed(bed, SILENT, FAST_GLIDE)
    return
  }

  // Decoded on first genuine need, never at import. A visitor who silences the
  // product before it starts never pays for the asset at all.
  if (!buffer) {
    if (!loading && getGraph()) {
      loading = true
      void loadSample(ambienceUrl).then((decoded) => {
        loading = false
        buffer = decoded
        // The room may have changed while the file was in flight, so re-resolve
        // rather than assuming the declaration that triggered the load.
        if (decoded) applyAmbience()
      })
    }
    return
  }

  bed ??= buildBed()
  if (!bed) return
  writeBed(bed, resolveBed(declaration.environment, declaration.momentum), GLIDE)
}

/** Declare a room. Returns the handle used to update or withdraw it. */
export function pushSoundscape(environment: SoundEnvironment, momentum: number | null): number {
  const id = nextId++
  stack = [...stack, { id, environment, momentum }]
  applyAmbience()
  return id
}

export function updateSoundscape(
  id: number,
  environment: SoundEnvironment,
  momentum: number | null,
): void {
  stack = stack.map((entry) => (entry.id === id ? { id, environment, momentum } : entry))
  applyAmbience()
}

export function popSoundscape(id: number): void {
  stack = stack.filter((entry) => entry.id !== id)
  applyAmbience()
}

/** How many ambience sources exist. Must never exceed one. */
export function bedCount(): number {
  return bed ? 1 : 0
}

/**
 * Wire ambience to everything that can change it: the graph appearing, the
 * player's preferences, and the OS accessibility setting flipping mid-session.
 * Returns a teardown; called once, from the app shell.
 */
export function bindAmbience(): () => void {
  const stopReady = onAudioReady(() => applyAmbience())
  const stopMix = subscribeAudioMix(() => applyAmbience())
  const stopReduced = subscribeReducedMotion(() => applyAmbience())

  return () => {
    stopReady()
    stopMix()
    stopReduced()
    bed?.stop()
    bed = null
    stack = []
  }
}
