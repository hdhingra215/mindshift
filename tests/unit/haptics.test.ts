import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  MIN_PERCEPTIBLE_MS,
  motorTime,
  PATTERNS,
  scalePattern,
  type HapticPattern,
} from '@/lib/haptics/patterns'
import { DEFAULT_MIX } from '@/lib/audio/tokens'
import { setAudioMix } from '@/lib/audio/preferences'

/**
 * The haptics layer.
 *
 * Two things matter here and nothing else does. First, that it **never throws**
 * — the API is absent on iOS, absent on every desktop, and present-but-throwing
 * in some embedded browsers, so the unsupported path is the majority path.
 * Second, that it **cannot buzz**: every restraint rule is a number in the
 * engine, and a number is exactly the kind of thing that gets "tuned" later.
 */

const patternNames = Object.keys(PATTERNS) as HapticPattern[]

/** Install a fake motor and record what it was asked to do. */
function installMotor(): number[][] {
  const calls: number[][] = []
  vi.stubGlobal('navigator', {
    vibrate: (pattern: number | number[]) => {
      calls.push(Array.isArray(pattern) ? pattern : [pattern])
      return true
    },
  })
  return calls
}


/**
 * Load the haptics engine against a clean module graph.
 *
 * Two reasons this is not a plain top-level import. The motion system caches
 * one `MediaQueryList` on first use — correct in a browser, and sticky across
 * tests that need the preference to differ. And the preferences store is module
 * state, so the engine must read the *same* instance a test writes to.
 */
async function loadHaptics() {
  vi.resetModules()
  const engine = await import('@/lib/haptics/engine')
  const preferences = await import('@/lib/audio/preferences')
  engine.resetHapticThrottles()
  return { ...engine, ...preferences }
}

beforeEach(() => {
  vi.stubGlobal('window', {
    matchMedia: () => ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })
  // The motion barrel pulls in Anime.js, which reads `document` and starts its
  // rAF loop at import time. Both are stubbed rather than avoided: the haptics
  // engine reads the reduced-motion gate through that barrel, which is the
  // documented way to reach it.
  vi.stubGlobal('requestAnimationFrame', () => 0)
  vi.stubGlobal('cancelAnimationFrame', () => undefined)
  vi.stubGlobal('document', {
    hidden: false,
    documentElement: { style: { setProperty: () => undefined, removeProperty: () => undefined } },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })
  setAudioMix(DEFAULT_MIX)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the patterns', () => {
  it('keeps every pattern under 90 ms of motor time', () => {
    // Raised from 60 ms in 8.10: the old ceiling produced pulses that were
    // technically correct and physically imperceptible. Still far below the
    // point where a pattern stops being a tap and becomes a buzz.
    for (const name of patternNames) {
      expect(motorTime(name)).toBeLessThanOrEqual(90)
    }
  })

  it('makes every pulse long enough to actually be felt', () => {
    // The 8.9 set had 4 ms pulses. An LRA has barely spun up by then, so the
    // pattern was a rumour rather than a tap — which is exactly the complaint
    // this phase exists to answer.
    for (const name of patternNames) {
      const value = PATTERNS[name]
      const pulses = typeof value === 'number' ? [value] : value.filter((_, i) => i % 2 === 0)
      for (const pulse of pulses) expect(pulse).toBeGreaterThanOrEqual(MIN_PERCEPTIBLE_MS)
    }
  })

  it('gives every pattern a distinct shape, not just a distinct length', () => {
    // Two patterns of different length but identical form feel like the same
    // sensation at different volumes. The set has to be legible by rhythm.
    const shapes = patternNames.map((name) => JSON.stringify(PATTERNS[name]))
    expect(new Set(shapes).size).toBe(patternNames.length)
  })

  it('inverts the discovery rather than punishing it', () => {
    // `affirm` rises, `discover` falls, and they cost the motor exactly the
    // same. Distinguishable with the screen off, and neither is the harsher.
    expect(motorTime('discover')).toBe(motorTime('affirm'))
    expect(PATTERNS.discover).not.toEqual(PATTERNS.affirm)
  })

  it('never repeats a pulse more than three times', () => {
    // Structure is allowed — a mechanism has two stages. Repetition for
    // emphasis is how buzzing starts.
    for (const name of patternNames) {
      const value = PATTERNS[name]
      const pulses = typeof value === 'number' ? 1 : Math.ceil(value.length / 2)
      expect(pulses).toBeLessThanOrEqual(3)
    }
  })

  it('makes the commitment the most substantial ordinary pattern', () => {
    expect(motorTime('commit')).toBeGreaterThan(motorTime('select'))
    expect(motorTime('select')).toBeGreaterThan(motorTime('brush'))
  })
})

describe('unsupported devices', () => {
  it('reports no support and does not throw when the API is absent', async () => {
    vi.stubGlobal('navigator', {})
    const { hapticsSupported, vibrate } = await loadHaptics()

    expect(hapticsSupported()).toBe(false)
    // The majority path: desktop, and every iOS browser.
    expect(() => vibrate('select')).not.toThrow()
    expect(vibrate('select')).toBe(false)
  })

  it('does not throw when the API exists but rejects the call', async () => {
    vi.stubGlobal('navigator', {
      vibrate: () => {
        throw new Error('blocked by permissions policy')
      },
    })
    const { vibrate } = await loadHaptics()

    expect(() => vibrate('commit')).not.toThrow()
    expect(vibrate('commit')).toBe(false)
  })
})

describe('the gates', () => {
  it('fires on a supported device with the default preferences', async () => {
    const calls = installMotor()
    const { vibrate } = await loadHaptics()

    expect(vibrate('select')).toBe(true)
    expect(calls).toHaveLength(1)
  })

  it('is silent when the player turns haptics off', async () => {
    installMotor()
    const { vibrate, setAudioMix: setMix } = await loadHaptics()

    setMix({ haptics: false })
    expect(vibrate('select')).toBe(false)
  })

  it('is silent when the player mutes everything', async () => {
    installMotor()
    const { vibrate, setAudioMix: setMix } = await loadHaptics()

    // Mute means "silence this thing". A device that keeps buzzing afterwards
    // has ignored the player.
    setMix({ muted: true })
    expect(vibrate('select')).toBe(false)
  })

  it('is silent under reduced motion', async () => {
    installMotor()
    vi.stubGlobal('window', {
      matchMedia: (query: string) => ({
        matches: query.includes('reduce'),
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })

    /*
     * The motion system creates one shared `MediaQueryList` on first use and
     * keeps it — which is right in a browser and means the module graph has to
     * be rebuilt here for the preference to read differently.
     */
    vi.resetModules()
    const { vibrate } = await loadHaptics()

    // A vibrating phone is the most physical output the product has. Reading
    // the preference as "animations only" would be a technicality.
    expect(vibrate('affirm')).toBe(false)
  })
})

describe('throttling', () => {
  it('refuses a second pulse inside the global floor', async () => {
    const calls = installMotor()
    const { vibrate } = await loadHaptics()

    expect(vibrate('select')).toBe(true)
    // Immediately after: two pulses that close together are one buzz.
    expect(vibrate('select')).toBe(false)
    expect(vibrate('commit')).toBe(false)
    expect(calls).toHaveLength(1)
  })

  it('holds a mash to a single pulse', async () => {
    const calls = installMotor()
    const { vibrate } = await loadHaptics()

    for (let i = 0; i < 60; i += 1) vibrate('hairline')
    expect(calls).toHaveLength(1)
  })

  it('honours a longer per-pattern throttle on top of the floor', async () => {
    const calls = installMotor()
    const { vibrate } = await loadHaptics()

    /*
     * One real wait, long enough to clear the 90 ms global floor and nowhere
     * near the pattern's own five-second throttle. That gap is the guard
     * keeping a cursor swept across the hero from becoming a stream of pulses,
     * and it is the only thing this test is about.
     */
    expect(vibrate('brush', { throttleMs: 5000 })).toBe(true)
    await new Promise((done) => setTimeout(done, 140))
    expect(vibrate('brush', { throttleMs: 5000 })).toBe(false)

    expect(calls).toHaveLength(1)
  })
})

describe('intensity', () => {
  /*
   * The Vibration API has no amplitude, so "strength" is dwell time. These
   * assertions are what make the slider a real control rather than a number
   * that persists and does nothing — which is exactly the defect the ambience
   * slider shipped with in 8.9.
   */

  it('scales the pulses and leaves the rhythm alone', () => {
    const full = scalePattern('commit', 1) as number[]
    const half = scalePattern('commit', 0.5) as number[]

    // Pulses (even indices) shrink; gaps (odd indices) hold, because scaling
    // those too would turn "lighter" into "slower" — a different sensation.
    expect(half[0]).toBeLessThan(full[0] as number)
    expect(half[2]).toBeLessThan(full[2] as number)
    expect(half[1]).toBe(full[1])
  })

  it('moves monotonically, so the slider is felt at every step', () => {
    const at = (intensity: number) => scalePattern('select', intensity) as number
    expect(at(1)).toBeGreaterThan(at(0.6))
    expect(at(0.6)).toBeGreaterThan(at(0.3))
  })

  it('turns off at zero rather than fading into a tickle', () => {
    expect(scalePattern('commit', 0)).toBeNull()
    expect(scalePattern('brush', 0)).toBeNull()
  })

  it('never scales a pulse below the point it can be felt', () => {
    // A 1 ms pulse is not a gentler tap, it is a missing one.
    const faint = scalePattern('commit', 0.05) as number[]
    for (const [index, ms] of faint.entries()) {
      if (index % 2 === 0) expect(ms).toBeGreaterThanOrEqual(MIN_PERCEPTIBLE_MS)
    }
  })

  it('is full strength by default — the patterns are authored as designed', () => {
    expect(DEFAULT_MIX.hapticIntensity).toBe(1)
    expect(scalePattern('select', DEFAULT_MIX.hapticIntensity)).toBe(PATTERNS.select)
  })

  it('reaches the device in real time, at the level just chosen', async () => {
    const calls = installMotor()
    const { vibrate, setAudioMix: setMix, resetHapticThrottles } = await loadHaptics()

    setMix({ hapticIntensity: 1 })
    expect(vibrate('select')).toBe(true)

    resetHapticThrottles()
    setMix({ hapticIntensity: 0.4 })
    expect(vibrate('select')).toBe(true)

    // Two pulses of the same pattern, at two settings, must differ.
    expect(calls[1]?.[0]).toBeLessThan(calls[0]?.[0] as number)
  })

  it('is off at zero intensity, however the switch is set', async () => {
    installMotor()
    const { vibrate, setAudioMix: setMix } = await loadHaptics()

    setMix({ haptics: true, hapticIntensity: 0 })
    expect(vibrate('commit')).toBe(false)
  })
})

describe('preferences', () => {
  it('restores every default, including the new ones', async () => {
    const { setAudioMix: setMix, resetAudioMix, getAudioMix } = await loadHaptics()

    setMix({ hapticIntensity: 0.1, haptics: false, ambient: 0.05, muted: true })
    resetAudioMix()

    expect(getAudioMix()).toEqual(DEFAULT_MIX)
  })

  it('accepts a stored preference written before intensity existed', async () => {
    // A player who set their mix in 8.9 must not lose it, and must not end up
    // with an undefined intensity silently disabling their haptics.
    const { audioMixSchema } = await import('@/lib/audio/preferences')
    const legacy = { muted: false, master: 0.5, sfx: 0.5, ambient: 0.5, haptics: true }

    const parsed = audioMixSchema.parse(legacy)
    expect(parsed.hapticIntensity).toBe(DEFAULT_MIX.hapticIntensity)
    expect(parsed.master).toBe(0.5)
  })
})

describe('persistence across a reload', () => {
  /**
   * A reload, simulated: write preferences against one module graph, then build
   * a fresh one over the same storage and read them back. This is the only way
   * to prove the round trip without a browser, and it is worth proving —
   * hydration is where a schema change silently resets everyone's settings.
   */
  function installStorage(seed: Record<string, string> = {}) {
    const store = new Map(Object.entries(seed))
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    })
    return store
  }

  it('remembers the whole mix, intensity included', async () => {
    const store = installStorage()

    const first = await loadHaptics()
    first.setAudioMix({ hapticIntensity: 0.45, ambient: 0.2, haptics: true })
    expect(store.size).toBe(1)

    // A new page load reading the same storage.
    vi.resetModules()
    const reloaded = await import('@/lib/audio/preferences')
    expect(reloaded.getAudioMix().hapticIntensity).toBe(0.45)
    expect(reloaded.getAudioMix().ambient).toBe(0.2)
  })

  it('survives storage being unavailable rather than failing to boot', async () => {
    // Private mode, a quota-full origin, or a locked-down browser. The
    // preference holds for the session; only its memory is lost.
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
    })

    vi.resetModules()
    const preferences = await import('@/lib/audio/preferences')
    expect(preferences.getAudioMix()).toEqual(DEFAULT_MIX)
    expect(() => preferences.setAudioMix({ hapticIntensity: 0.5 })).not.toThrow()
    expect(preferences.getAudioMix().hapticIntensity).toBe(0.5)
  })

  it('falls back to defaults when the stored record is corrupt', async () => {
    installStorage({ 'mindshift:audio': '{ not json' })

    vi.resetModules()
    const preferences = await import('@/lib/audio/preferences')
    expect(preferences.getAudioMix()).toEqual(DEFAULT_MIX)
  })
})
