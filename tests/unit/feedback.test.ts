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
      'rail.advance',
      'rail.return',
      'bias.spark',
      'cta.enter',
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
    expect(throttled.sort()).toEqual([
      'bias.spark',
      'choice.hover',
      'rail.advance',
      'rail.return',
      'torch.sweep',
    ])
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

  it('marks the rail forward and merely re-arms it backward', () => {
    /*
     * 8.11 gives the forward crossing a sound, which the previous version of
     * this test forbade outright. The rule it was protecting — a page must not
     * *tick while you scroll* — is now enforced where it actually lives: the
     * moment fires on a threshold crossing (three per section), is throttled at
     * the moment level, and the material under it has its own throttle. What
     * stays banned is the reverse direction, because re-reading is not progress.
     */
    expect(MOMENTS['rail.advance'].cue).toBe('reel')
    expect(MOMENTS['rail.return']).not.toHaveProperty('cue')

    // Backward is the lighter sensation of the two, in the hand as well.
    expect(motorTime(MOMENTS['rail.return'].haptic)).toBeLessThan(
      motorTime(MOMENTS['rail.advance'].haptic),
    )

    for (const name of ['rail.advance', 'rail.return'] as const) {
      expect(MOMENTS[name].throttleMs ?? 0).toBeGreaterThanOrEqual(400)
    }
  })

  it('makes the stake the heaviest thing a player can do', () => {
    // Requested explicitly: a wager must not feel like an answer. It is the one
    // moment allowed to outweigh `answer.commit`, in both channels.
    expect(motorTime(MOMENTS['wager.commit'].haptic)).toBeGreaterThan(
      motorTime(MOMENTS['answer.commit'].haptic),
    )
    expect(MOMENTS['wager.commit'].cue).not.toBe(MOMENTS['answer.commit'].cue)
    expect(MOMENTS['wager.commit'].haptic).not.toBe(MOMENTS['answer.commit'].haptic)

    // And still heavier than merely choosing a stake on the dial.
    expect(motorTime(MOMENTS['wager.commit'].haptic)).toBeGreaterThan(
      motorTime(MOMENTS['wager.select'].haptic),
    )
  })

  it('lights a blind spot without letting it feel like choosing one', () => {
    // The brief: mysterious, not a notification and not an achievement. So it is
    // audible (the section has no other content) but lighter in the hand than
    // any decision, and it is not the milestone material.
    expect(MOMENTS['bias.spark'].cue).toBe('glint')
    expect(motorTime(MOMENTS['bias.spark'].haptic)).toBeLessThan(
      motorTime(MOMENTS['choice.select'].haptic),
    )
    expect(MOMENTS['bias.spark'].throttleMs).toBeLessThanOrEqual(320)
  })

  it('treats entering the product as a decision and every other navigation as not', () => {
    expect(MOMENTS['cta.enter'].haptic).toBe(MOMENTS['answer.commit'].haptic)
    expect(MOMENTS['cta.enter'].cue).toBe('enter')
    // The rule it is the single exception to.
    expect(MOMENTS['route.change']).not.toHaveProperty('cue')
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

  it('lets a commitment through immediately after a hover', async () => {
    /*
     * The defect this phase was reported for. A player hovers an option and
     * clicks it a few milliseconds later; before 8.11 the light hover pulse
     * closed the anti-buzz floor and the *commitment* — the most important
     * haptic in the product — was dropped. The interface felt dead at the exact
     * moment it should have felt certain.
     */
    const calls: (number | number[])[] = []
    vi.stubGlobal('navigator', {
      vibrate: (pattern: number | number[]) => {
        calls.push(pattern)
        return true
      },
    })
    const { resetHapticThrottles } = await import('@/lib/haptics/engine')
    const { resetSignalThrottles, signal } = await import('@/lib/feedback/signal')
    resetHapticThrottles()
    resetSignalThrottles()

    signal('choice.hover')
    signal('choice.select')
    signal('answer.commit')

    expect(calls).toHaveLength(3)
  })

  it('does not let two moments sharing a pattern silence each other', async () => {
    /*
     * `torch.sweep` and `choice.hover` are both a `brush`. The throttle used to
     * be keyed by pattern, so sweeping the hero (every 1.6 s) also swallowed the
     * next option hover — a different event that happens to feel similar.
     */
    const calls: unknown[] = []
    vi.stubGlobal('navigator', {
      vibrate: (pattern: number | number[]) => {
        calls.push(pattern)
        return true
      },
    })
    const { resetHapticThrottles } = await import('@/lib/haptics/engine')
    const { resetSignalThrottles, signal } = await import('@/lib/feedback/signal')
    resetHapticThrottles()
    resetSignalThrottles()

    signal('torch.sweep')
    // Same pattern, different moment, inside the sweep's 1600 ms window. The
    // engine's own 70 ms floor is cleared by waiting a moment.
    await new Promise((done) => setTimeout(done, 90))
    signal('choice.hover')

    expect(calls).toHaveLength(2)
  })

  it('spreads a phrased reveal across time instead of colliding in one tick', async () => {
    /*
     * An outcome screen mounts the outcome, the wager result, mastery and XP in
     * the same frame, each with its own `PHRASE` offset. Haptics used to ignore
     * that offset, so the floor kept the first pulse and dropped the rest — four
     * of the product's best tactile moments never reached anyone's hand.
     */
    const fired: number[] = []
    vi.stubGlobal('navigator', {
      vibrate: () => {
        fired.push(1)
        return true
      },
    })
    const { resetHapticThrottles } = await import('@/lib/haptics/engine')
    const { resetSignalThrottles, signal } = await import('@/lib/feedback/signal')
    const { PHRASE } = await import('@/lib/audio/tokens')
    resetHapticThrottles()
    resetSignalThrottles()

    signal('outcome.correct')
    signal('wager.win', { delayMs: PHRASE.second })
    signal('reward.mastery', { delayMs: PHRASE.fourth })

    // Only the lead beat has landed yet: the others are scheduled, not dropped.
    expect(fired).toHaveLength(1)

    await new Promise((done) => setTimeout(done, PHRASE.fourth + 80))
    expect(fired).toHaveLength(3)
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

  it('sounds the rail going down and only feels it coming back up', async () => {
    /*
     * The audio layer is mocked rather than the graph built: what is under test
     * is which *moment* each direction fires, and a cue name is the observable
     * that proves it. Rebuilt module graph so the mock is in place before
     * `signal.ts` binds `playCue`.
     */
    const played: string[] = []
    const felt: number[] = []
    vi.resetModules()
    vi.doMock('@/lib/audio', async (importOriginal) => ({
      ...(await importOriginal<typeof import('@/lib/audio')>()),
      playCue: (name: string) => {
        played.push(name)
      },
    }))
    vi.stubGlobal('navigator', {
      vibrate: () => {
        felt.push(1)
        return true
      },
    })

    const { resetHapticThrottles } = await import('@/lib/haptics/engine')
    const { createScrubber, resetSignalThrottles } = await import('@/lib/feedback/signal')
    const scrub = createScrubber(4)
    const at = (value: number) => {
      resetHapticThrottles()
      resetSignalThrottles()
      scrub(value)
    }

    at(0)
    at(0.3)
    expect(played).toEqual(['reel'])

    // The same boundary, crossed upward, must stay silent — otherwise scrubbing
    // a section produces a stream of reels.
    at(0.1)
    expect(played).toEqual(['reel'])
    // Both were felt, though: the rail is physical in both directions.
    expect(felt).toHaveLength(2)

    vi.doUnmock('@/lib/audio')
    vi.resetModules()
  })

  it('cannot become a stream when the page is scrubbed across a boundary', async () => {
    /*
     * The failure mode the whole scrubber exists to prevent, tested with the
     * throttles *live* rather than cleared: someone wobbling the page across a
     * stop boundary. Fifty crossings, one pulse.
     */
    const fired: number[] = []
    vi.stubGlobal('navigator', {
      vibrate: () => {
        fired.push(1)
        return true
      },
    })
    const { resetHapticThrottles } = await import('@/lib/haptics/engine')
    const { createScrubber, resetSignalThrottles } = await import('@/lib/feedback/signal')
    resetHapticThrottles()
    resetSignalThrottles()

    const scrub = createScrubber(4)
    scrub(0.2)
    for (let i = 0; i < 50; i += 1) scrub(i % 2 === 0 ? 0.3 : 0.2)

    // At most one per direction, and in practice one: the engine's floor takes
    // the second, and each moment's own 420 ms window takes the other forty-nine.
    expect(fired.length).toBeLessThanOrEqual(2)
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

  it('lights every blind spot by cursor, tap and keyboard alike', () => {
    const field = source('src/features/marketing/components/blindspot-constellation.tsx')
    expect(field).toContain("signal('bias.spark')")

    // All three ways in, so the discovery never depends on hover.
    expect(field).toContain('onPointerEnter')
    expect(field).toContain('onFocus')
    expect(field).toContain('onClick')
    // Hover is mouse-only: on a touch device the tap is the interaction, and a
    // synthesised pointerenter alongside it would mark the same act twice.
    expect(field).toContain("event.pointerType === 'mouse'")
    // And the visual half is gated on the motion preference, like all of it.
    expect(field).toContain('prefersReducedMotion()')
  })

  it('gives Start Training the entry moment and a touch on approach', () => {
    const invitation = source('src/features/marketing/components/invitation.tsx')
    expect(invitation).toContain('moment="cta.enter"')
    // Hover and keyboard focus both get the light touch.
    expect(invitation).toContain("onFocus={() => signal('choice.hover')}")
    expect(invitation).toContain('onPointerEnter')
    // The navigation itself is untouched — still a router Link.
    expect(invitation).toContain("<Link to={isAuthed ? '/dashboard' : '/auth/signup'}>")
  })

  it('keeps the wager commitment on its own heavier moment', () => {
    const panel = source('src/features/game/components/wager-panel.tsx')
    expect(panel).toContain("signal('wager.select')")
    expect(panel).toContain('moment="wager.commit"')
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
