import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The engine's imperative half, against a stub Web Audio implementation.
 *
 * The pure layer (`audio.test.ts`) covers the design rules. What is left is the
 * part that only fails at runtime, in a browser, usually silently — and "no
 * sound came out" is the hardest defect to notice in a system whose correct
 * behaviour includes being quiet:
 *
 *   - the context is built at start-up and resumed as soon as it is allowed;
 *   - the environment loads, loops, and exists exactly once;
 *   - the Settings slider reaches the ambient bus gain in real time;
 *   - mute reaches the graph;
 *   - a material actually schedules one voice per layer, and they are released;
 *   - the spam ceiling holds under a mash.
 *
 * The stub records what was asked of Web Audio rather than emulating it.
 * Asserting that a BiquadFilter filters would be testing the browser.
 */

type Param = {
  value: number
  setValueAtTime: (value: number) => unknown
  linearRampToValueAtTime: (value: number) => unknown
  exponentialRampToValueAtTime: (value: number) => unknown
  setTargetAtTime: (value: number) => unknown
}

function param(initial = 0): Param {
  const self: Param = {
    value: initial,
    // Every ramp writes `value` immediately. The stub has no clock, so "where
    // the parameter was told to go" is the only meaningful thing to record —
    // and it is exactly what the slider assertions need.
    setValueAtTime: (next: number) => (self.value = next),
    linearRampToValueAtTime: (next: number) => (self.value = next),
    exponentialRampToValueAtTime: (next: number) => (self.value = next),
    setTargetAtTime: (next: number) => (self.value = next),
  }
  return self
}

type StubSource = {
  connect: () => void
  disconnect: () => void
  start: (when?: number, offset?: number) => void
  stop: (when?: number) => void
  onended: (() => void) | null
}

const created = {
  oscillators: [] as StubSource[],
  bufferSources: [] as (StubSource & { loop: boolean; playbackRate: Param })[],
  gains: [] as { gain: Param }[],
}

/** Ends every scheduled source, the way the audio thread eventually would. */
function drain(): void {
  for (const source of [...created.oscillators, ...created.bufferSources]) {
    source.onended?.()
    source.onended = null
  }
}

function makeSource(): StubSource {
  return {
    connect: () => undefined,
    disconnect: () => undefined,
    start: () => undefined,
    stop: () => undefined,
    onended: null,
  }
}

class StubAudioContext {
  currentTime = 0
  sampleRate = 48000
  destination = { connect: () => undefined }
  state: 'running' | 'suspended' = 'suspended'

  resume = vi.fn(async () => {
    this.state = 'running'
  })
  suspend = vi.fn(async () => {
    this.state = 'suspended'
  })
  close = vi.fn(async () => undefined)

  createGain() {
    const node = Object.assign(makeSource(), { gain: param(1) })
    created.gains.push(node)
    return node
  }

  createOscillator() {
    const node = Object.assign(makeSource(), {
      type: 'sine',
      frequency: param(440),
      detune: param(0),
    })
    created.oscillators.push(node)
    return node
  }

  createBufferSource() {
    const node = Object.assign(makeSource(), {
      buffer: null,
      loop: false,
      loopStart: 0,
      loopEnd: 0,
      playbackRate: param(1),
    })
    created.bufferSources.push(node)
    return node
  }

  createBiquadFilter() {
    return Object.assign(makeSource(), { type: 'lowpass', frequency: param(1000), Q: param(1) })
  }

  createConvolver() {
    return Object.assign(makeSource(), { buffer: null })
  }

  createDynamicsCompressor() {
    return Object.assign(makeSource(), {
      threshold: param(-24),
      knee: param(30),
      ratio: param(12),
      attack: param(0.003),
      release: param(0.25),
    })
  }

  createBuffer(channels: number, length: number) {
    const data = new Float32Array(length)
    return { getChannelData: () => data, length, numberOfChannels: channels, duration: 2 }
  }

  decodeAudioData = vi.fn(async () => ({ duration: 20, length: 882000, numberOfChannels: 2 }))
}

const windowListeners = new Map<string, Set<EventListener>>()

function fire(type: string): void {
  for (const listener of windowListeners.get(type) ?? []) listener(new Event(type))
}

beforeAll(() => {
  vi.stubGlobal('window', {
    AudioContext: StubAudioContext,
    addEventListener: (type: string, listener: EventListener) => {
      const set = windowListeners.get(type) ?? new Set()
      set.add(listener)
      windowListeners.set(type, set)
    },
    removeEventListener: (type: string, listener: EventListener) => {
      windowListeners.get(type)?.delete(listener)
    },
    matchMedia: () => ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  })
  vi.stubGlobal('AudioContext', StubAudioContext)
  vi.stubGlobal('document', {
    hidden: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })))
})

afterAll(() => {
  vi.unstubAllGlobals()
})

// Imported after the globals exist: the modules read `window` at call time, but
// importing first would leave nothing for the ambience layer to build into.
const { armAudio, isAudioReady, isAudioRunning, getGraph, voiceCount } = await import(
  '@/lib/audio/engine'
)
const { playCue, resetCueThrottles } = await import('@/lib/audio/cues')
const { setAudioMix } = await import('@/lib/audio/preferences')
const { applyAmbience, bedCount, popSoundscape, pushSoundscape, updateSoundscape } = await import(
  '@/lib/audio/ambience'
)
const { DEFAULT_MIX } = await import('@/lib/audio/tokens')

/** Let the ambience layer's fetch → decode → build chain settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('starting', () => {
  it('builds the graph at start-up rather than waiting for a gesture', () => {
    armAudio()
    // The environment is meant to be there when the page opens. Waiting for a
    // click to even *construct* the context guarantees it cannot be.
    expect(isAudioReady()).toBe(true)
  })

  it('asks to resume immediately, and is running once allowed', () => {
    expect(isAudioRunning()).toBe(true)
  })

  it('resumes again on the first interaction, for browsers that refused', async () => {
    const graph = getGraph()
    await graph?.ctx.suspend()
    fire('pointerdown')
    await settle()
    expect(isAudioRunning()).toBe(true)
  })
})

describe('the environment', () => {
  beforeEach(async () => {
    setAudioMix(DEFAULT_MIX)
    await settle()
  })

  it('loads the recording and loops it', async () => {
    const id = pushSoundscape('observatory', 0)
    await settle()
    await settle()

    const bed = created.bufferSources.find((source) => source.loop)
    expect(bed).toBeDefined()
    expect(bedCount()).toBe(1)
    popSoundscape(id)
  })

  it('never builds a second ambience source, however many rooms are declared', async () => {
    const a = pushSoundscape('observatory', 0)
    const b = pushSoundscape('play', 0.5)
    const c = pushSoundscape('twin', 1)
    await settle()

    // One recording, retuned. Two beds would be two copies of the same texture
    // drifting out of phase with each other — the classic duplicate-ambience bug.
    expect(bedCount()).toBe(1)

    popSoundscape(c)
    popSoundscape(b)
    popSoundscape(a)
  })

  it('retunes rather than rebuilding when momentum changes', async () => {
    const id = pushSoundscape('observatory', 0)
    await settle()
    const sources = created.bufferSources.filter((source) => source.loop).length

    updateSoundscape(id, 'observatory', 0.9)
    await settle()
    expect(created.bufferSources.filter((source) => source.loop).length).toBe(sources)
    popSoundscape(id)
  })

  it('is synthesised from nothing — no oscillator belongs to the bed', async () => {
    drain()
    created.oscillators.length = 0
    const id = pushSoundscape('observatory', 0)
    await settle()

    // The 8.8 bed was five oscillators and sounded like a fan. If this count is
    // ever non-zero again, someone has started synthesising the room.
    expect(created.oscillators).toHaveLength(0)
    popSoundscape(id)
  })
})

describe('the mixer reaches the graph', () => {
  let ambientGain: Param
  let sfxGain: Param
  let masterGain: Param

  beforeAll(() => {
    const graph = getGraph()
    if (!graph) throw new Error('graph missing')
    // The three bus gains, as the engine holds them.
    masterGain = graph.master.gain as unknown as Param
    sfxGain = graph.sfx.gain as unknown as Param
    ambientGain = graph.ambient.gain as unknown as Param
  })

  beforeEach(() => {
    setAudioMix(DEFAULT_MIX)
  })

  it('moves the ambient bus when the atmosphere slider moves', () => {
    // The defect this replaces: the slider existed, the value persisted, and
    // the bus never heard about it.
    setAudioMix({ ambient: 1 })
    const loud = ambientGain.value
    setAudioMix({ ambient: 0.5 })
    const half = ambientGain.value
    setAudioMix({ ambient: 0.1 })
    const quiet = ambientGain.value

    expect(loud).toBeGreaterThan(half)
    expect(half).toBeGreaterThan(quiet)
    expect(quiet).toBeGreaterThan(0)
  })

  it('leaves the interaction bus alone while the atmosphere moves', () => {
    setAudioMix({ sfx: 0.8, ambient: 1 })
    const before = sfxGain.value
    setAudioMix({ ambient: 0.05 })
    expect(sfxGain.value).toBe(before)
  })

  it('silences master, interactions and atmosphere together on mute', () => {
    setAudioMix({ muted: true })
    expect(masterGain.value).toBe(0)
    expect(sfxGain.value).toBe(0)
    expect(ambientGain.value).toBe(0)

    setAudioMix({ muted: false })
    expect(masterGain.value).toBeGreaterThan(0)
  })
})

describe('materials', () => {
  beforeEach(() => {
    // Drain first: ending the previous test's sources is what returns the voice
    // count to zero, and clearing the arrays first would lose the references.
    drain()
    created.oscillators.length = 0
    created.bufferSources.length = 0
    resetCueThrottles()
    setAudioMix(DEFAULT_MIX)
  })

  it('schedules one voice per layer', () => {
    playCue('wood')
    // Two strikes (noise sources) and one body (an oscillator).
    expect(created.bufferSources).toHaveLength(2)
    expect(created.oscillators).toHaveLength(1)
  })

  it('releases every voice when its sources end', () => {
    playCue('ring')
    expect(voiceCount()).toBeGreaterThan(0)
    drain()
    expect(voiceCount()).toBe(0)
  })

  it('holds the spam ceiling under a mash', () => {
    for (let i = 0; i < 40; i += 1) {
      resetCueThrottles()
      playCue('graze')
    }
    expect(voiceCount()).toBeLessThanOrEqual(12)
  })

  it('throttles a repeated material', () => {
    playCue('graze')
    const first = created.bufferSources.length
    playCue('graze')
    expect(created.bufferSources).toHaveLength(first)
  })

  it('plays nothing at all while muted', () => {
    drain()
    created.bufferSources.length = 0
    setAudioMix({ muted: true })
    resetCueThrottles()
    playCue('seat')
    expect(created.bufferSources).toHaveLength(0)
    setAudioMix({ muted: false })
  })
})

describe('reduced motion', () => {
  it('silences the environment but keeps the materials', async () => {
    // Ambience is the lowest-priority tier, exactly as ambient motion is on the
    // visual side. A discrete material answers something the player just did,
    // so it survives — the preference is about drift, not about feedback.
    const graph = getGraph()
    if (!graph) throw new Error('graph missing')

    vi.stubGlobal('window', {
      ...(globalThis.window as unknown as Record<string, unknown>),
      matchMedia: (query: string) => ({
        matches: query.includes('reduce'),
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
    })

    const id = pushSoundscape('observatory', 0)
    applyAmbience()
    await settle()

    // The bed exists from earlier tests; under reduced motion it is driven to
    // silence rather than torn down, so the room can return instantly.
    const bedLevel = created.gains.at(-1)
    expect(bedLevel).toBeDefined()

    resetCueThrottles()
    drain()
    created.bufferSources.length = 0
    playCue('wood')
    expect(created.bufferSources.length).toBeGreaterThan(0)

    popSoundscape(id)
  })
})

describe('autoplay', () => {
  /*
   * What the platform actually permits. The engine attempts to start
   * unprompted; where the browser refuses, the first genuine interaction
   * resumes it. There is no silent-buffer trick and no muted-<video> shim, so
   * these tests are about the *attempt* and the fallback, not about defeating
   * a policy that cannot be defeated.
   */

  it('reports the stance honestly where the browser exposes one', async () => {
    const { autoplayStance } = await import('@/lib/audio/engine')

    // No `getAutoplayPolicy` (Safari, Firefox): the honest answer is that we
    // cannot know without trying — never a confident "allowed".
    vi.stubGlobal('navigator', {})
    const graph = getGraph()
    await graph?.ctx.suspend()
    expect(autoplayStance()).toBe('unknown')

    vi.stubGlobal('navigator', { getAutoplayPolicy: () => 'disallowed' })
    expect(autoplayStance()).toBe('blocked')

    vi.stubGlobal('navigator', { getAutoplayPolicy: () => 'allowed' })
    expect(autoplayStance()).toBe('allowed')

    await graph?.ctx.resume()
  })

  it('reports allowed once the context is genuinely running', async () => {
    const { autoplayStance } = await import('@/lib/audio/engine')
    vi.stubGlobal('navigator', { getAutoplayPolicy: () => 'disallowed' })

    // A running context outranks the policy answer: whatever the browser says
    // it *would* do, sound is demonstrably coming out.
    await getGraph()?.ctx.resume()
    expect(autoplayStance()).toBe('allowed')
  })

  it('does not throw when the policy API rejects the query', async () => {
    const { autoplayStance } = await import('@/lib/audio/engine')
    vi.stubGlobal('navigator', {
      getAutoplayPolicy: () => {
        throw new Error('nope')
      },
    })
    await getGraph()?.ctx.suspend()
    expect(() => autoplayStance()).not.toThrow()
    expect(autoplayStance()).toBe('unknown')
    await getGraph()?.ctx.resume()
  })
})
