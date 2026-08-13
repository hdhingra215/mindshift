import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  MAX_MOTOR_MS,
  MAX_PULSE_MS,
  MIN_PERCEPTIBLE_MS,
  isDecisive,
  motorTime,
  PATTERNS,
  pulses,
  scalePattern,
  WEIGHT,
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
  it('keeps every pattern inside the motor-time ceiling', () => {
    // 60 ms in 8.9, 90 ms in 8.10, 220 ms here — and the ceiling is not the
    // interesting number, the *shape* is: nothing below spends its budget on one
    // long pulse (see the buzz test).
    for (const name of patternNames) {
      expect(motorTime(name), name).toBeLessThanOrEqual(MAX_MOTOR_MS)
    }
  })

  it('makes every pulse long enough to actually be felt', () => {
    /*
     * The measurement this phase turned on. 8.9 shipped 4 ms pulses and 8.10
     * shipped 8 ms ones; on an LRA neither has finished spinning up, so both
     * were technically correct and physically absent. 14 ms is the floor where
     * something reaches the surface of the case, and the lightest pattern in the
     * set sits above it rather than on it.
     */
    for (const name of patternNames) {
      for (const pulse of pulses(name)) {
        expect(pulse, name).toBeGreaterThanOrEqual(MIN_PERCEPTIBLE_MS)
      }
    }
    expect(Math.min(...patternNames.flatMap((name) => pulses(name)))).toBeGreaterThan(15)
  })

  it('is decisively stronger than the set it replaced', () => {
    // The regression guard for the actual complaint: someone re-tuning this file
    // downward would be undoing the fix. A tap has to be a tap.
    expect(PATTERNS.select).toBeGreaterThanOrEqual(40)
    expect(motorTime('commit')).toBeGreaterThanOrEqual(120)
    expect(motorTime('stake')).toBeGreaterThan(motorTime('commit'))
  })

  it('never spends its weight on one long pulse', () => {
    // Weight comes from a second, heavier stage after a gap — a mechanism
    // seating. A single pulse held longer is a buzz, which is the one thing the
    // whole system is trying not to be.
    for (const name of patternNames) {
      for (const pulse of pulses(name)) expect(pulse, name).toBeLessThanOrEqual(MAX_PULSE_MS)
    }
  })

  it('classifies exactly the patterns a player produces deliberately as decisive', () => {
    // Only these may interrupt the anti-buzz floor. If a light pattern is ever
    // promoted here, hovering becomes able to buzz.
    const decisive = patternNames.filter((name) => isDecisive(name)).sort()
    expect(decisive).toEqual([
      'affirm',
      'commit',
      'discover',
      'mark',
      'milestone',
      'select',
      'stake',
    ])
    expect(Object.keys(WEIGHT).sort()).toEqual([...patternNames].sort())
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
    // Structure is allowed — a mechanism has two stages, a stake has three.
    // Repetition for emphasis is how buzzing starts.
    for (const name of patternNames) {
      expect(pulses(name).length, name).toBeLessThanOrEqual(3)
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
    // No switch-capable engine either, so there is genuinely no backend.
    vi.stubGlobal('document', { ...(globalThis.document as object), createElement: () => ({}) })
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

describe('the second backend — iOS, where the Vibration API does not exist', () => {
  /**
   * Install a switch-capable engine and no `navigator.vibrate`.
   *
   * This is an iPhone. It is also, until 8.11, the configuration in which the
   * entire haptic system was silently dead — and iOS is not an edge case, so
   * "unsupported" was the wrong answer for half the phones in existence.
   */
  function installSwitchEngine(): { clicks: number } {
    const state = { clicks: 0 }
    const body = {
      append: () => undefined,
    }
    vi.stubGlobal('navigator', {})
    vi.stubGlobal('document', {
      hidden: false,
      body,
      documentElement: { style: { setProperty: () => undefined, removeProperty: () => undefined } },
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      createElement: () => ({
        switch: false,
        style: { cssText: '' },
        isConnected: true,
        setAttribute: () => undefined,
        remove: () => undefined,
        click: () => {
          state.clicks += 1
        },
      }),
    })
    return state
  }

  it('reports the switch backend rather than claiming no support', async () => {
    installSwitchEngine()
    const { hapticBackend, hapticsSupported } = await loadHaptics()

    expect(hapticBackend()).toBe('switch')
    expect(hapticsSupported()).toBe(true)
  })

  it('produces one system tap for a light pattern and two for a decisive one', async () => {
    const state = installSwitchEngine()
    const { vibrate, resetHapticThrottles } = await loadHaptics()

    expect(vibrate('brush')).toBe(true)
    expect(state.clicks).toBe(1)

    resetHapticThrottles()
    expect(vibrate('commit')).toBe(true)
    expect(state.clicks).toBe(2)
    // One echo, and exactly one: this backend has no shape, so weight is
    // expressed as a second tap and never as more than that.
    await new Promise((done) => setTimeout(done, 160))
    expect(state.clicks).toBe(3)
  })

  it('still obeys every preference gate', async () => {
    const state = installSwitchEngine()
    const { vibrate, setAudioMix: setMix } = await loadHaptics()

    setMix({ haptics: false })
    expect(vibrate('commit')).toBe(false)
    expect(state.clicks).toBe(0)
  })

  it('prefers the real API wherever it exists', async () => {
    // A device with both must never be tapped through a hidden control.
    const state = installSwitchEngine()
    const calls: number[][] = []
    vi.stubGlobal('navigator', {
      vibrate: (pattern: number | number[]) => {
        calls.push(Array.isArray(pattern) ? pattern : [pattern])
        return true
      },
    })
    const { hapticBackend, vibrate } = await loadHaptics()

    expect(hapticBackend()).toBe('vibration')
    expect(vibrate('commit')).toBe(true)
    expect(calls).toHaveLength(1)
    expect(state.clicks).toBe(0)
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
  it('refuses a second light pulse inside the global floor', async () => {
    const calls = installMotor()
    const { vibrate } = await loadHaptics()

    expect(vibrate('brush')).toBe(true)
    // Immediately after: two light pulses that close together are one buzz.
    expect(vibrate('brush')).toBe(false)
    expect(vibrate('glint')).toBe(false)
    expect(calls).toHaveLength(1)
  })

  it('never holds back something the player deliberately did', async () => {
    /*
     * The bug 8.11 exists to fix, at the layer it lived in. The floor is an
     * anti-*repetition* device, and applying it to commitments meant a hover 40
     * ms earlier could swallow the single most important pulse in the product.
     * A decisive pattern always reaches the motor.
     */
    const calls = installMotor()
    const { vibrate } = await loadHaptics()

    expect(vibrate('brush')).toBe(true)
    expect(vibrate('select')).toBe(true)
    expect(vibrate('commit')).toBe(true)
    expect(vibrate('stake')).toBe(true)
    expect(calls).toHaveLength(4)
  })

  it('keys the throttle by caller, so two moments sharing a pattern do not collide', async () => {
    const calls = installMotor()
    const { vibrate } = await loadHaptics()

    expect(vibrate('brush', { throttleMs: 5000, throttleKey: 'torch.sweep' })).toBe(true)
    await new Promise((done) => setTimeout(done, 90))
    // A different moment, the same pattern, inside the first one's window.
    expect(vibrate('brush', { throttleMs: 320, throttleKey: 'choice.hover' })).toBe(true)
    // The original key is still held.
    expect(vibrate('brush', { throttleMs: 5000, throttleKey: 'torch.sweep' })).toBe(false)
    expect(calls).toHaveLength(2)
  })

  it('schedules a delayed pulse instead of dropping it', async () => {
    const calls = installMotor()
    const { vibrate } = await loadHaptics()

    expect(vibrate('affirm')).toBe(true)
    // A phrased reveal: same tick, later beat. Before 8.11 this returned false
    // and the beat was simply never felt.
    expect(vibrate('mark', { delayMs: 120 })).toBe(true)
    expect(calls).toHaveLength(1)

    await new Promise((done) => setTimeout(done, 200))
    expect(calls).toHaveLength(2)
  })

  it('re-checks the preferences when a delayed pulse lands, not when it was asked for', async () => {
    const calls = installMotor()
    const { vibrate, setAudioMix: setMix } = await loadHaptics()

    vibrate('mark', { delayMs: 60 })
    // The player silences the product inside the phrase. The pulse must not
    // arrive anyway.
    setMix({ muted: true })
    await new Promise((done) => setTimeout(done, 140))
    expect(calls).toHaveLength(0)
  })

  it('holds a mash to a single pulse', async () => {
    const calls = installMotor()
    const { vibrate } = await loadHaptics()

    for (let i = 0; i < 60; i += 1) vibrate('hairline')
    expect(calls).toHaveLength(1)
  })

  it('honours a longer per-key throttle on top of the floor', async () => {
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
