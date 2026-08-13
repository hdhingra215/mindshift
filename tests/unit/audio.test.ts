import { beforeEach, describe, expect, it } from 'vitest'

import { CUES, type CueName } from '@/lib/audio/cues'
import { resolveBed, type SoundEnvironment } from '@/lib/audio/ambience'
import {
  getAudioMix,
  isAudible,
  isHapticsEnabled,
  resolveGains,
  setAudioMix,
} from '@/lib/audio/preferences'
import { CEILING, DEFAULT_MIX, MAX_VOICES, PHRASE, type CueLayer } from '@/lib/audio/tokens'

/**
 * The audio system's pure layer.
 *
 * What is worth testing here is not "does a sound play" — that needs a browser
 * and would assert that Web Audio works. It is the set of *design rules* the
 * system claims to hold, each a plain function of its inputs and each one a
 * plausible-looking edit could quietly break:
 *
 *   - the environment is on by default, and audible when it is;
 *   - momentum resolves the room rather than raising its volume;
 *   - a darker reveal is the same size of event as a brighter one;
 *   - mute means silence, everywhere, with no way around it.
 */

const ENVIRONMENTS: readonly SoundEnvironment[] = [
  'silent',
  'observatory',
  'play',
  'archive',
  'twin',
]

const cueNames = Object.keys(CUES) as CueName[]

/**
 * The catalogue is declared `as const`, which is what gives `CueName` its union
 * — but it also means an entry that happens not to set `at` has no `at` in its
 * literal type. Reading through the declared shape restores the optional fields
 * without asserting anything: every literal is assignable to `CueLayer`.
 */
const layersOf = (name: CueName): readonly CueLayer[] => CUES[name].layers

/** When the last of a cue's layers finishes, in seconds. */
const spanOf = (name: CueName): number =>
  Math.max(...layersOf(name).map((layer) => (layer.at ?? 0) + layer.attack + layer.decay))

/** The loudest single layer in a cue. */
const peakOf = (name: CueName): number => Math.max(...layersOf(name).map((layer) => layer.gain))

describe('the mix', () => {
  beforeEach(() => {
    setAudioMix(DEFAULT_MIX)
  })

  it('has the environment on by default', () => {
    // The product is a place, and a place that stays silent until you find a
    // switch is not one. Nothing plays before the browser permits it anyway.
    expect(DEFAULT_MIX.muted).toBe(false)
    expect(DEFAULT_MIX.ambient).toBeGreaterThan(0)
    expect(resolveGains(DEFAULT_MIX).ambient).toBeGreaterThan(0)
  })

  it('has haptics on by default, and mute outranks them', () => {
    expect(isHapticsEnabled(DEFAULT_MIX)).toBe(true)
    expect(isHapticsEnabled({ ...DEFAULT_MIX, muted: true })).toBe(false)
    expect(isHapticsEnabled({ ...DEFAULT_MIX, haptics: false })).toBe(false)
  })

  it('silences every bus when muted — mute is not a volume', () => {
    const muted = { ...DEFAULT_MIX, muted: true, master: 1, sfx: 1, ambient: 1 }
    const gains = resolveGains(muted)
    expect(gains.master).toBe(0)
    expect(gains.sfx).toBe(0)
    expect(gains.ambient).toBe(0)
    expect(isAudible(muted)).toBe(false)
  })

  it('moves the ambient gain with the ambient preference, monotonically', () => {
    // The slider's whole job: 100 → 50 → 10 must be three audibly different
    // rooms, not three numbers that resolve to the same gain.
    const at = (ambient: number) => resolveGains({ ...DEFAULT_MIX, ambient }).ambient
    expect(at(1)).toBeGreaterThan(at(0.5))
    expect(at(0.5)).toBeGreaterThan(at(0.1))
    expect(at(0)).toBe(0)
  })

  it('keeps the interaction and environment channels independent', () => {
    const quietRoom = resolveGains({ ...DEFAULT_MIX, ambient: 0 })
    expect(quietRoom.ambient).toBe(0)
    expect(quietRoom.sfx).toBe(resolveGains(DEFAULT_MIX).sfx)

    const quietInterface = resolveGains({ ...DEFAULT_MIX, sfx: 0 })
    expect(quietInterface.sfx).toBe(0)
    expect(quietInterface.ambient).toBe(resolveGains(DEFAULT_MIX).ambient)
  })

  it('never exceeds the bus ceilings, whatever the player asks for', () => {
    const gains = resolveGains({ ...DEFAULT_MIX, muted: false, master: 1, sfx: 1, ambient: 1 })
    expect(gains.master).toBeLessThanOrEqual(CEILING.master)
    expect(gains.sfx).toBeLessThanOrEqual(CEILING.sfx)
    expect(gains.ambient).toBeLessThanOrEqual(CEILING.ambient)
  })

  it('rejects an out-of-range value rather than storing it', () => {
    expect(() => setAudioMix({ master: 4 })).toThrow()
    expect(getAudioMix().master).toBe(DEFAULT_MIX.master)
  })

  it('keeps a changed channel and leaves the others alone', () => {
    setAudioMix({ ambient: 0.25 })
    expect(getAudioMix().ambient).toBe(0.25)
    expect(getAudioMix().sfx).toBe(DEFAULT_MIX.sfx)
    expect(getAudioMix().haptics).toBe(DEFAULT_MIX.haptics)
  })
})

describe('the rooms', () => {
  it('makes play the quietest bed — the decision has to stand out against it', () => {
    expect(resolveBed('play', null).level).toBeLessThan(resolveBed('observatory', null).level)
    expect(resolveBed('play', null).cutoff).toBeLessThan(resolveBed('observatory', null).cutoff)
  })

  it('leaves silence completely silent', () => {
    expect(resolveBed('silent', 1).level).toBe(0)
    expect(resolveBed('silent', 1).space).toBe(0)
  })

  it('gives the Twin a thin, slowed, distant room', () => {
    const twin = resolveBed('twin', null)
    const observatory = resolveBed('observatory', null)
    expect(twin.body).toBeGreaterThan(observatory.body)
    expect(twin.rate).toBeLessThan(observatory.rate)
    expect(twin.space).toBeGreaterThan(observatory.space)
  })

  it('plays every room at a real level — a room nobody can hear is not a room', () => {
    for (const environment of ENVIRONMENTS.filter((room) => room !== 'silent')) {
      expect(resolveBed(environment, 0).level).toBeGreaterThan(0.3)
    }
  })
})

describe('momentum resolves the world — it does not turn it up', () => {
  const playable = ENVIRONMENTS.filter((environment) => environment !== 'silent')

  it.each(playable)('leaves the level and the rate untouched in %s', (environment) => {
    const resting = resolveBed(environment, 0)
    const established = resolveBed(environment, 1)

    // The whole rule. A run must never make the world louder or busier — that
    // would be pressure dressed up as atmosphere (§12.22).
    expect(established.level).toBe(resting.level)
    expect(established.rate).toBe(resting.rate)
  })

  it.each(playable)('opens the texture and widens the room in %s', (environment) => {
    const resting = resolveBed(environment, 0)
    const established = resolveBed(environment, 1)

    expect(established.cutoff).toBeGreaterThan(resting.cutoff)
    expect(established.space).toBeGreaterThan(resting.space)
  })

  it('moves continuously, so the room is never caught changing', () => {
    expect(resolveBed('observatory', 0.25).cutoff).toBeLessThan(resolveBed('observatory', 0.5).cutoff)
    expect(resolveBed('observatory', 0.5).cutoff).toBeLessThan(resolveBed('observatory', 1).cutoff)
  })

  it('clamps a value outside the design range instead of over-driving the room', () => {
    expect(resolveBed('observatory', 4)).toEqual(resolveBed('observatory', 1))
    expect(resolveBed('observatory', -2)).toEqual(resolveBed('observatory', 0))
  })

  it('holds the resting tuning while momentum is still unknown', () => {
    expect(resolveBed('archive', null)).toEqual(resolveBed('archive', 0))
  })
})

describe('the material catalogue', () => {
  it('stays small — a restrained language, not a sound per event', () => {
    // The moment this grows past a dozen the product has stopped having a sonic
    // identity and started having sounds.
    expect(cueNames.length).toBeLessThanOrEqual(12)
  })

  it('contains no sustained pitch anywhere', () => {
    // The rule separating a struck object from a beep: a tonal layer exists only
    // as a *body*, and a body always falls.
    for (const name of cueNames) {
      for (const layer of layersOf(name)) {
        if (layer.kind === 'body') expect(layer.glideTo).toBeLessThan(layer.freq)
      }
    }
  })

  it('gives every material at least one layer and a throttle', () => {
    for (const name of cueNames) {
      expect(layersOf(name).length).toBeGreaterThan(0)
      expect(CUES[name].throttleMs).toBeGreaterThan(0)
    }
  })

  it('keeps every material within the voice ceiling on its own', () => {
    for (const name of cueNames) {
      expect(layersOf(name).length).toBeLessThan(MAX_VOICES)
    }
  })

  it('lets only the milestone material ring for more than a second', () => {
    for (const name of cueNames) {
      if (name === 'ring') continue
      expect(spanOf(name)).toBeLessThanOrEqual(1)
    }
  })

  it('treats the darker reveal as the same size of event as the brighter one', () => {
    // The audio half of "a wrong answer is a discovery, never a verdict"
    // (§12.20). If these diverge, the sound design has started scolding.
    expect(peakOf('shade')).toBeCloseTo(peakOf('bloom'), 5)
    expect(spanOf('shade')).toBeCloseTo(spanOf('bloom'), 2)
    expect(layersOf('shade')).toHaveLength(layersOf('bloom').length)
  })

  it('keeps the commitment dry — a mechanism in the hand, not a room', () => {
    for (const layer of layersOf('seat')) {
      expect(layer.space ?? 0).toBeLessThan(0.2)
    }
  })

  it('keeps the torch the most restrained thing in the product', () => {
    // It can fire on cursor movement, so it must be quieter and rarer than
    // anything a player triggers deliberately.
    expect(peakOf('veil')).toBeLessThan(peakOf('wood'))
    expect(CUES.veil.throttleMs).toBeGreaterThan(CUES.wood.throttleMs)
  })

  it('keeps XP quieter than the mastery it sits under', () => {
    expect(peakOf('tick')).toBeLessThan(peakOf('ring'))
  })
})

describe('audibility — the regression this system actually shipped', () => {
  /*
   * An earlier cut was inaudible. Not broken: *quiet*. Three conservative
   * factors multiplied and the loudest material reached the speaker at roughly
   * −32 dBFS, below the noise floor of an ordinary room. Nothing threw and no
   * test failed. These are the tripwire.
   */
  const atSpeaker = (name: CueName): number => {
    const gains = resolveGains(DEFAULT_MIX)
    return peakOf(name) * gains.sfx * gains.master
  }

  const dbfs = (amplitude: number): number => 20 * Math.log10(amplitude)

  it('puts the decision materials in the audible band', () => {
    for (const name of ['wood', 'seat', 'bloom', 'shade'] as const) {
      expect(dbfs(atSpeaker(name))).toBeGreaterThan(-24)
      expect(dbfs(atSpeaker(name))).toBeLessThan(-6)
    }
  })

  it('keeps even the quietest material above the floor', () => {
    expect(dbfs(atSpeaker('veil'))).toBeGreaterThan(-40)
  })

  it('leaves headroom for the whole of the loudest material at once', () => {
    const gains = resolveGains(DEFAULT_MIX)
    for (const name of cueNames) {
      const coincident = layersOf(name).reduce((total, layer) => total + layer.gain, 0)
      expect(coincident * gains.sfx * gains.master).toBeLessThan(1)
    }
  })

  it('reaches the ambient bus at an audible level', () => {
    // The asset is mastered at −20 LUFS, so the bus gain is the whole story.
    const gains = resolveGains(DEFAULT_MIX)
    const level = resolveBed('observatory', 0).level * gains.ambient * gains.master
    expect(dbfs(level)).toBeGreaterThan(-24)
  })
})

describe('the reveal phrase', () => {
  it('is strictly ordered, so simultaneous surfaces arrive in sequence', () => {
    const steps = [PHRASE.lead, PHRASE.second, PHRASE.third, PHRASE.fourth, PHRASE.tail]
    for (let i = 1; i < steps.length; i += 1) {
      expect(steps[i]).toBeGreaterThan(steps[i - 1] as number)
    }
  })

  it('resolves inside the time a player spends reading the outcome', () => {
    expect(PHRASE.tail).toBeLessThan(2000)
  })
})
