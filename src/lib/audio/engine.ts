import { MAX_VOICES, ROOM_DAMPING, ROOM_SECONDS, type CueLayer } from './tokens'
import { getAudioMix, resolveGains, subscribeAudioMix } from './preferences'

/**
 * The audio engine — one graph, built once, for the whole product.
 *
 * ── The graph ───────────────────────────────────────────────────────────────
 *
 *      voices ─┬──────────────────────────► sfxGain ──┐
 *              └─► send ─► convolver ──────┘          ├─► master ─► limiter ─► out
 *      ambience (a recording) ──────────► ambientGain ┘
 *
 * Two buses so "the interface is useful but the room is distracting" is a
 * preference a player can express instead of resolving as silence. One
 * procedurally generated impulse response gives every material the same
 * physical space. A limiter catches the sum, which is what lets the buses run
 * at unity instead of being attenuated into inaudibility.
 *
 * ── Starting: what is actually possible ─────────────────────────────────────
 * The context is constructed the moment the app mounts and `resume()` is
 * attempted immediately, before any interaction. Where the browser allows it,
 * the room is simply there when the page opens.
 *
 * Where it does not, **nothing here can change that.** Chrome, Safari and
 * Firefox all gate audible playback behind either a user gesture or an
 * established relationship with the origin, and every technique that appears to
 * beat the gate — a silent buffer, a muted `<video>`, a zero-length ping — is
 * either detected and blocked or works only by lying about what happened. This
 * module does none of them. It:
 *
 *   1. attempts `resume()` at mount, unprompted;
 *   2. asks `getAutoplayPolicy()` where it exists, so the interface can tell
 *      the truth about whether the room is waiting rather than broken;
 *   3. resumes on the first genuine interaction, then **removes its own
 *      listeners**, because after that the question is settled.
 *
 * The practical upshot, documented in AudioSystem.md §3: on a repeat visit in
 * Chrome the room usually starts on open, because media-engagement history
 * accumulates. On a first visit in any browser it starts on the first click.
 * That is the ceiling of what the platform permits.
 */

type Graph = {
  ctx: AudioContext
  master: GainNode
  sfx: GainNode
  ambient: GainNode
  room: ConvolverNode
  noise: AudioBuffer
}

let graph: Graph | null = null
let armed = false
let activeVoices = 0

const readyListeners = new Set<(graph: Graph) => void>()

/** The graph, if it exists. */
export function getGraph(): Graph | null {
  return graph
}

export function isAudioReady(): boolean {
  return graph !== null
}

/** Whether the browser has actually allowed the context to run. */
export function isAudioRunning(): boolean {
  return graph?.ctx.state === 'running'
}

/**
 * Whether audible playback is permitted right now, as the browser sees it.
 *
 * `getAutoplayPolicy` is Chromium-only; elsewhere the honest answer is "we
 * cannot know without trying", which is reported as `unknown`. Used by the
 * interface to distinguish *waiting for you* from *broken*, and by nothing
 * else — the engine always attempts to start regardless of the answer.
 */
export type AutoplayStance = 'allowed' | 'blocked' | 'unknown'

export function autoplayStance(): AutoplayStance {
  if (graph?.ctx.state === 'running') return 'allowed'

  const query = (
    navigator as Navigator & { getAutoplayPolicy?: (type: string) => string }
  ).getAutoplayPolicy

  if (typeof query !== 'function') return 'unknown'
  try {
    return query.call(navigator, 'audiocontext') === 'allowed' ? 'allowed' : 'blocked'
  } catch {
    return 'unknown'
  }
}

/**
 * Run once the graph exists — immediately if it already does.
 *
 * How the ambience layer starts without polling: it declares what it wants at
 * any time and is called back when there is somewhere to put it.
 */
export function onAudioReady(listener: (graph: Graph) => void): () => void {
  if (graph) listener(graph)
  readyListeners.add(listener)
  return () => readyListeners.delete(listener)
}

/**
 * A short, dark impulse response, generated rather than downloaded.
 *
 * Exponentially decaying noise is the standard cheap reverb tail; the damping
 * exponent is what keeps it a quiet stone room instead of a concert hall. Two
 * channels of independent noise give the tail its width.
 */
function buildRoom(ctx: AudioContext): ConvolverNode {
  const length = Math.floor(ctx.sampleRate * ROOM_SECONDS)
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate)

  for (let channel = 0; channel < 2; channel += 1) {
    const samples = impulse.getChannelData(channel)
    for (let i = 0; i < length; i += 1) {
      const decay = (1 - i / length) ** ROOM_DAMPING
      samples[i] = (Math.random() * 2 - 1) * decay
    }
  }

  const convolver = ctx.createConvolver()
  convolver.buffer = impulse
  return convolver
}

/** Two seconds of white noise — the excitation behind every material. */
function buildNoise(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const samples = buffer.getChannelData(0)
  for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1
  return buffer
}

function applyMix(target: Graph): void {
  const gains = resolveGains(getAudioMix())
  const now = target.ctx.currentTime
  // Ramped, never stepped: an instant gain change on a running bed is an
  // audible click, and a mute that clicks is a mute that sounds broken. Short
  // enough that the mixer still feels like a live control under the hand.
  target.master.gain.setTargetAtTime(gains.master, now, 0.03)
  target.sfx.gain.setTargetAtTime(gains.sfx, now, 0.03)
  target.ambient.gain.setTargetAtTime(gains.ambient, now, 0.05)
}

function build(): Graph | null {
  if (typeof window === 'undefined' || typeof window.AudioContext !== 'function') return null

  const ctx = new AudioContext()
  const master = ctx.createGain()
  const sfx = ctx.createGain()
  const ambient = ctx.createGain()
  const room = buildRoom(ctx)

  master.gain.value = 0
  sfx.gain.value = 1
  ambient.gain.value = 1

  /*
   * The limiter, and the reason the buses run at unity. Materials can coincide
   * with a reverb tail and a running bed; rather than keeping everything quiet
   * enough that the worst case cannot clip — which is how 8.8 shipped inaudible
   * — the sum is caught here. A safety net, not a sound.
   */
  const limiter = ctx.createDynamicsCompressor()
  limiter.threshold.value = -6
  limiter.knee.value = 8
  limiter.ratio.value = 6
  limiter.attack.value = 0.006
  limiter.release.value = 0.18

  room.connect(sfx)
  sfx.connect(master)
  ambient.connect(master)
  master.connect(limiter)
  limiter.connect(ctx.destination)

  const built: Graph = { ctx, master, sfx, ambient, room, noise: buildNoise(ctx) }
  applyMix(built)
  return built
}

/**
 * Start the engine, and keep trying to start it legally.
 *
 * Builds the context immediately and asks to resume. If the browser refuses,
 * listeners resume it on the first genuine interaction and then remove
 * themselves. Returns a teardown; called once, from the app shell.
 */
export function armAudio(): () => void {
  if (armed) return () => undefined
  armed = true

  const built = build()
  if (!built) return () => { armed = false }
  graph = built
  for (const listener of readyListeners) listener(built)

  // The optimistic attempt. Rejection is the normal case on a first visit and
  // is not an error — it is the browser doing its job.
  void built.ctx.resume().catch(() => undefined)

  /*
   * The fallback. Every one of these is a real interaction the player performed
   * for their own reasons — none is synthesised, and none is a pretext.
   *
   * `wheel` does not grant user activation in every engine, but where it does
   * it is the earliest thing a reader actually does, and attempting a resume
   * that the browser then refuses costs nothing.
   */
  const events: readonly (keyof WindowEventMap)[] = [
    'pointerdown',
    'pointerup',
    'keydown',
    'touchstart',
    'wheel',
  ]

  // Captured rather than reached through `built` on each call: a hoisted
  // function declaration would lose the non-null narrowing established above.
  const { ctx } = built

  const resume = (): void => {
    void ctx
      .resume()
      .then(() => {
        // Once the room is running the question is settled, so the listeners
        // retire rather than firing a promise on every subsequent click.
        if (ctx.state === 'running') stopListening()
      })
      .catch(() => undefined)
  }

  const stopListening = () => {
    for (const event of events) window.removeEventListener(event, resume)
  }

  for (const event of events) {
    window.addEventListener(event, resume, { passive: true })
  }

  // A hidden tab costs nothing: suspending stops the audio clock entirely.
  const onVisibility = () => {
    if (!graph) return
    if (document.hidden) void graph.ctx.suspend()
    else void graph.ctx.resume().catch(() => undefined)
  }
  document.addEventListener('visibilitychange', onVisibility)

  const unsubscribe = subscribeAudioMix(() => {
    if (graph) applyMix(graph)
  })

  return () => {
    stopListening()
    document.removeEventListener('visibilitychange', onVisibility)
    unsubscribe()
    if (graph) void graph.ctx.close()
    graph = null
    armed = false
    activeVoices = 0
  }
}

/**
 * Decode an audio file into the graph's context.
 *
 * The only path by which recorded material enters the product. Returns null
 * rather than throwing: a bed that fails to load must leave a silent, fully
 * working product behind it.
 */
export async function loadSample(url: string): Promise<AudioBuffer | null> {
  const target = graph
  if (!target) return null
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    return await target.ctx.decodeAudioData(await response.arrayBuffer())
  } catch {
    return null
  }
}

/**
 * Whether another voice may start.
 *
 * Past the ceiling a cue is dropped rather than queued: an interface sound that
 * arrives after the interaction it describes is noise, and a player mashing a
 * control should hear the interface stay calm, not build a backlog.
 */
function claimVoice(): boolean {
  if (activeVoices >= MAX_VOICES) return false
  activeVoices += 1
  return true
}

function releaseVoice(): void {
  activeVoices = Math.max(0, activeVoices - 1)
}

/** Live voice count. Exposed for the lifecycle assertions in the unit suite. */
export function voiceCount(): number {
  return activeVoices
}

/**
 * Shape one layer's amplitude.
 *
 * Attack is linear (a curve is inaudible at these lengths) and release is
 * exponential toward a floor rather than zero: `exponentialRampToValueAtTime`
 * is undefined at zero, and a linear release reads as a cut rather than a decay
 * — which on a struck material is the difference between an object and a click.
 */
function shape(gain: GainNode, peak: number, at: number, attack: number, decay: number): void {
  const floor = 0.0001
  gain.gain.setValueAtTime(floor, at)
  gain.gain.linearRampToValueAtTime(Math.max(peak, floor), at + attack)
  gain.gain.exponentialRampToValueAtTime(floor, at + attack + decay)
}

function sendToRoom(target: Graph, from: GainNode, amount: number, at: number): void {
  const send = target.ctx.createGain()
  send.gain.setValueAtTime(amount, at)
  from.connect(send)
  send.connect(target.room)
}

/**
 * A body: a low tone that falls. Never sustained — the glide is mandatory in
 * the type for exactly that reason.
 */
function playBody(target: Graph, layer: Extract<CueLayer, { kind: 'body' }>, at: number): void {
  if (!claimVoice()) return
  const { ctx } = target
  const end = at + layer.attack + layer.decay

  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(layer.freq, at)
  osc.frequency.exponentialRampToValueAtTime(layer.glideTo, end)

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(layer.cutoff ?? layer.freq * 2.5, at)
  filter.Q.setValueAtTime(0.7, at)

  const amp = ctx.createGain()
  shape(amp, layer.gain, at, layer.attack, layer.decay)

  osc.connect(filter)
  filter.connect(amp)
  amp.connect(target.sfx)
  if (layer.space) sendToRoom(target, amp, layer.space, at)

  osc.onended = () => {
    releaseVoice()
    osc.disconnect()
    filter.disconnect()
    amp.disconnect()
  }
  osc.start(at)
  osc.stop(end + 0.02)
}

/** An excitation through a resonator — the product's primary sound. */
function playStrike(target: Graph, layer: Extract<CueLayer, { kind: 'strike' }>, at: number): void {
  if (!claimVoice()) return
  const { ctx } = target
  const end = at + layer.attack + layer.decay

  const source = ctx.createBufferSource()
  source.buffer = target.noise
  source.loop = true
  // Start at a different point each time. Identical excitation on every strike
  // is what makes repeated interface sounds feel mechanical; real materials are
  // never struck in exactly the same place twice.
  const offset = Math.random() * (target.noise.duration - layer.attack - layer.decay - 0.05)

  const resonator = ctx.createBiquadFilter()
  resonator.type = 'bandpass'
  resonator.frequency.setValueAtTime(layer.band, at)
  if (layer.bandTo !== undefined) {
    resonator.frequency.exponentialRampToValueAtTime(layer.bandTo, end)
  }
  resonator.Q.setValueAtTime(layer.q, at)

  const amp = ctx.createGain()
  shape(amp, layer.gain, at, layer.attack, layer.decay)

  source.connect(resonator)
  resonator.connect(amp)
  amp.connect(target.sfx)
  if (layer.space) sendToRoom(target, amp, layer.space, at)

  source.onended = () => {
    releaseVoice()
    source.disconnect()
    resonator.disconnect()
    amp.disconnect()
  }
  source.start(at, Math.max(0, offset))
  source.stop(end + 0.02)
}

/**
 * Schedule the layers of one cue as a single event.
 *
 * All layers are scheduled against one start time on the audio clock, so their
 * relative offsets are sample-accurate regardless of what the main thread is
 * doing. That is what makes a two-stage seat read as *one* mechanism rather
 * than as two sounds that happened to be near each other.
 */
export function emit(layers: readonly CueLayer[], delaySeconds = 0): void {
  if (!graph) return
  const start = graph.ctx.currentTime + delaySeconds + 0.005

  for (const layer of layers) {
    const at = start + (layer.at ?? 0)
    if (layer.kind === 'body') playBody(graph, layer, at)
    else playStrike(graph, layer, at)
  }
}
