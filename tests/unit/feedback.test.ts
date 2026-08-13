import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MOMENTS, type MomentName } from '@/lib/feedback/moments'
import { CUES } from '@/lib/audio/cues'
import { PATTERNS, motorTime } from '@/lib/haptics/patterns'
import { DEFAULT_MIX } from '@/lib/audio/tokens'
import { setAudioMix } from '@/lib/audio/preferences'

/**
 * The semantic layer — which acts in MindShift are worth marking, and how hard.
 *
 * This is the file that encodes the product's position on feedback, so these
 * assertions are mostly about *restraint*: that traversal is unmarked, that
 * failure is never punished, and that the two moments a player can fire
 * continuously cannot become a stream.
 */

const momentNames = Object.keys(MOMENTS) as MomentName[]

const source = (path: string): string =>
  readFileSync(resolve(process.cwd(), path), 'utf8')

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
  vi.stubGlobal('navigator', {})
  setAudioMix(DEFAULT_MIX)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the moment table', () => {
  it('only references materials and patterns that exist', () => {
    for (const name of momentNames) {
      const moment: { cue?: string; haptic?: string } = MOMENTS[name]
      if (moment.cue) expect(Object.keys(CUES)).toContain(moment.cue)
      if (moment.haptic) expect(Object.keys(PATTERNS)).toContain(moment.haptic)
    }
  })

  it('gives every moment at least one channel', () => {
    // A moment with neither a sound nor a pulse is a dead table entry, and a
    // component calling it believes something is happening.
    for (const name of momentNames) {
      const moment: { cue?: string; haptic?: string } = MOMENTS[name]
      expect(Boolean(moment.cue) || Boolean(moment.haptic)).toBe(true)
    }
  })

  it('marks navigation by touch but never by sound', () => {
    // Moving between rooms is already audible: each surface declares a
    // different bed, and the room retuning *is* the feedback. A whoosh on top
    // would announce it twice. The arrival is still worth *feeling*.
    expect(MOMENTS['route.change'].haptic).toBe('reveal')
    expect(MOMENTS['route.change']).not.toHaveProperty('cue')
  })

  it('covers the whole pipeline: interaction → decision → commitment → reveal → consequence', () => {
    for (const required of [
      'choice.hover',
      'choice.select',
      'answer.commit',
      'outcome.correct',
      'outcome.miss',
      'reward.xp',
      'reward.mastery',
      'reward.achievement',
      'wager.select',
      'wager.commit',
      'wager.win',
      'wager.loss',
      'twin.speak',
      'twin.hit',
      'twin.miss',
      'torch.sweep',
      'torch.toggle',
      'rail.notch',
      'surface.reveal',
    ] as const) {
      expect(momentNames).toContain(required)
    }
  })

  it('weighs commitment above decision, and decision above traversal', () => {
    // The gradient is the interaction language, and it has to hold in the
    // physical channel too: hovering is the lightest touch the motor can make,
    // choosing is a definite tap, committing is a mechanism.
    expect(motorTime(MOMENTS['choice.hover'].haptic)).toBeLessThan(
      motorTime(MOMENTS['choice.select'].haptic),
    )
    expect(motorTime(MOMENTS['choice.select'].haptic)).toBeLessThan(
      motorTime(MOMENTS['answer.commit'].haptic),
    )
    expect(MOMENTS['answer.commit'].cue).toBe('seat')
  })

  it('gives each outcome pair the same weight in both channels', () => {
    // A miss, a lost stake and a Twin surprise are not lesser events. If any of
    // these diverge, the feedback has started arguing with the copy (§12.20).
    const pairs = [
      ['outcome.correct', 'outcome.miss'],
      ['wager.win', 'wager.loss'],
      ['twin.hit', 'twin.miss'],
    ] as const

    for (const [bright, dark] of pairs) {
      expect(Boolean(MOMENTS[dark].cue)).toBe(Boolean(MOMENTS[bright].cue))
      expect(Boolean(MOMENTS[dark].haptic)).toBe(Boolean(MOMENTS[bright].haptic))
    }
  })

  it('throttles exactly the moments a player can fire continuously', () => {
    // A cursor crossing options, a torch sweeping the hero, a rail passing a
    // stop. Everything else requires a deliberate act, so a throttle on it
    // would only hide a bug.
    const throttled = momentNames.filter((name) => 'throttleMs' in MOMENTS[name])
    expect(throttled.sort()).toEqual(['choice.hover', 'rail.notch', 'torch.sweep'])
  })

  it('gives every interaction in the pipeline something to feel', () => {
    // 8.10's brief: the tactile channel should carry the whole loop, not just
    // its endpoints. Only moments that are pure ambience-adjacent may be silent
    // to the hand, and there are none left.
    for (const name of momentNames) {
      expect(MOMENTS[name].haptic, `${name} has no haptic`).toBeDefined()
    }
  })

  it('does not give two adjacent moments the same sensation', () => {
    // "Do not make every interaction feel identical." Selecting, committing and
    // revealing are the three the player meets in a row, most often.
    const shapes = ['choice.select', 'answer.commit', 'outcome.correct'] as const
    const patterns = shapes.map((name) => MOMENTS[name].haptic)
    expect(new Set(patterns).size).toBe(patterns.length)
  })

  it('keeps the scroll rail silent — a page that ticks while you scroll is unbearable', () => {
    expect(MOMENTS['rail.notch']).not.toHaveProperty('cue')
    expect(MOMENTS['rail.notch'].haptic).toBe('hairline')
  })
})

describe('signalling', () => {
  it('does not throw with no audio graph and no vibration hardware', async () => {
    const { signal } = await import('@/lib/feedback/signal')
    // The state a desktop visitor is in before their first interaction.
    for (const name of momentNames) {
      expect(() => signal(name)).not.toThrow()
    }
  })

  it('holds a throttled moment to one firing per window', async () => {
    const calls: number[] = []
    vi.stubGlobal('navigator', {
      vibrate: (pattern: number | number[]) => {
        calls.push(Array.isArray(pattern) ? pattern[0] ?? 0 : pattern)
        return true
      },
    })
    const { resetHapticThrottles } = await import('@/lib/haptics/engine')
    const { resetSignalThrottles, signal } = await import('@/lib/feedback/signal')
    resetHapticThrottles()
    resetSignalThrottles()

    // A cursor crossing the hero fires this on every pointer move.
    for (let i = 0; i < 50; i += 1) signal('torch.sweep')
    expect(calls).toHaveLength(1)
  })
})

describe('the scroll rail', () => {
  /**
   * Count crossings without fighting the clock.
   *
   * `rail.notch` is throttled by design, so a run of scrub values inside one
   * test would be suppressed by the throttle rather than by the scrubber — and
   * the thing under test here is *crossing detection*, not the throttle, which
   * has its own tests. Clearing both throttles before each reading isolates the
   * scrubber exactly.
   */
  async function countingScrubber(stops: number) {
    const fired: number[] = []
    vi.stubGlobal('navigator', {
      vibrate: () => {
        fired.push(1)
        return true
      },
    })
    const { resetHapticThrottles } = await import('@/lib/haptics/engine')
    const { createScrubber, resetSignalThrottles } = await import('@/lib/feedback/signal')

    const scrub = createScrubber(stops)
    return {
      fired,
      /** Feed one value, with the throttles cleared so a crossing can be seen. */
      at(value: number) {
        resetHapticThrottles()
        resetSignalThrottles()
        scrub(value)
      },
    }
  }

  it('fires only when a stop is crossed, never per scroll event', async () => {
    const rail = await countingScrubber(3)

    // A scroll produces a continuous stream of values. Almost all of them sit
    // inside a band already entered, and must do nothing at all.
    for (let i = 0; i <= 100; i += 1) rail.at(i / 400)
    expect(rail.fired).toHaveLength(0)

    // Crossing into the second third.
    rail.at(0.5)
    expect(rail.fired).toHaveLength(1)

    // Another eighty readings, all inside that same band.
    for (let i = 0; i < 80; i += 1) rail.at(0.5 + i / 4000)
    expect(rail.fired).toHaveLength(1)

    rail.at(0.9)
    expect(rail.fired).toHaveLength(2)
  })

  it('re-arms in both directions, so the rail feels like a detent', async () => {
    const rail = await countingScrubber(4)

    rail.at(0)
    rail.at(0.3)
    rail.at(0.1)
    // Down past a stop and back up again is two crossings, not one.
    expect(rail.fired).toHaveLength(2)
  })

  it('says nothing on the first reading — arriving is not crossing', async () => {
    const rail = await countingScrubber(4)

    // Restoring a scroll position lands mid-section. Firing there would be a
    // pulse the player did not cause.
    rail.at(0.8)
    expect(rail.fired).toHaveLength(0)
  })

  it('ignores a nonsense value rather than firing on it', async () => {
    const { createScrubber } = await import('@/lib/feedback/signal')
    const scrub = createScrubber(3)
    expect(() => scrub(Number.NaN)).not.toThrow()
    expect(() => createScrubber(0)(0.5)).not.toThrow()
  })
})

/**
 * Wiring checks.
 *
 * These read the component source rather than rendering it. There is no DOM
 * testing library in this project, and the failure they exist to catch is not
 * behavioural — it is *someone removing the call*. A structural assertion
 * catches exactly that, cheaply and without pretending to be an interaction
 * test. Rendering-level coverage belongs with the e2e work (debt #2).
 */
describe('wiring', () => {
  it('gives the landing torch both a sweep and a deliberate toggle', () => {
    const lens = source('src/features/marketing/components/hero-lens.tsx')
    expect(lens).toContain("signal('torch.sweep')")
    expect(lens).toContain("signal('torch.toggle')")
    // The sweep must be bound to movement, not to entering the box.
    expect(lens).toContain('onPointerMove')
  })

  it('gives the landing decision selection feedback and a commitment', () => {
    const teaser = source('src/features/marketing/components/trap-teaser.tsx')
    expect(teaser).toContain("signal('choice.hover')")
    expect(teaser).toContain("signal('answer.commit')")
    // Keyboard users get the same selection feedback as a mouse.
    expect(teaser).toContain('onFocus')
    // And the consequence lands behind it.
    expect(teaser).toContain("useSignalOnMount(outcome.caught ? 'outcome.correct' : 'outcome.miss'")
  })

  it('feels the loop rail without lifting the scroll into React state', () => {
    const rail = source('src/features/marketing/components/loop-track.tsx')
    expect(rail).toContain('createScrubber(LOOP_STAGES.length)')
    // Subscribing to the MotionValue, not re-rendering per frame.
    expect(rail).toContain("railScale.on('change'")
  })

  it('keeps the in-game decision, commitment and reveal wired', () => {
    const play = source('src/features/game/components/scenario-play.tsx')
    expect(play).toContain("signal('choice.select')")
    expect(play).toContain('moment="answer.commit"')

    const reveal = source('src/features/game/components/outcome-reveal.tsx')
    expect(reveal).toContain("useSignalOnMount(correct ? 'outcome.correct' : 'outcome.miss')")
  })

  it('leaves ordinary buttons silent', () => {
    const button = source('src/components/ui/button.tsx')
    // Comments stripped first: the doc block names an example moment, and
    // matching that would be the test reading the prose rather than the code.
    const code = button.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

    // No default moment. A control is silent unless what it does is an act.
    expect(code).not.toMatch(/moment\s*=\s*['"]/)
    expect(code).toContain('if (moment) signal(moment)')
  })

  it('never calls navigator.vibrate outside the haptics engine', () => {
    // The rule the whole system exists to enforce.
    const engine = source('src/lib/haptics/engine.ts')
    expect(engine).toContain('navigator.vibrate')

    for (const path of [
      'src/lib/feedback/signal.ts',
      'src/features/marketing/components/hero-lens.tsx',
      'src/features/marketing/components/trap-teaser.tsx',
      'src/features/marketing/components/loop-track.tsx',
      'src/features/game/components/scenario-play.tsx',
      'src/components/ui/button.tsx',
    ]) {
      expect(source(path)).not.toContain('navigator.vibrate')
    }
  })
})
