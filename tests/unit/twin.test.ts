import { describe, expect, it } from 'vitest'

import {
  MIN_ACCURACY_SAMPLE,
  catchesFrom,
  describeEvidence,
  describePattern,
  describePrediction,
  describeTwinStatus,
  describeVerdict,
  summariseTwinAccuracy,
} from '@/features/profile'
import type { CognitiveTwinSlot, TwinPattern, TwinPrediction, TwinVerdict } from '@/features/profile'

/**
 * The Cognitive Twin's copy layer.
 *
 * The inference is in SQL and covered by the live harness. What is tested here
 * is the thing that would let a correct inference still mislead a player: the
 * sentences. Several of these assert what the Twin must *never* say, which is
 * the more important half — a fabricated claim reads perfectly and is a product
 * failure, so it has to be caught by a test rather than by a reviewer.
 */

function prediction(overrides: Partial<TwinPrediction> = {}): TwinPrediction {
  return {
    predictionId: 'p1',
    predictedCatch: false,
    contextKind: 'pack',
    contextLabel: 'Money & Spending',
    sampleSize: 9,
    observedRate: 22.22,
    ...overrides,
  }
}

function verdict(overrides: Partial<TwinVerdict> = {}): TwinVerdict {
  return {
    predictionId: 'p1',
    predictedCatch: false,
    actualCatch: false,
    wasCorrect: true,
    contextKind: 'pack',
    contextLabel: 'Money & Spending',
    sampleSize: 9,
    observedRate: 22.22,
    ...overrides,
  }
}

function pattern(overrides: Partial<TwinPattern> = {}): TwinPattern {
  return {
    contextKind: 'pack',
    contextLabel: 'Money & Spending',
    sampleSize: 9,
    catches: 2,
    observedRate: 22.22,
    predictsCatch: false,
    edge: 0.78,
    narration: null,
    ...overrides,
  }
}

describe('catchesFrom', () => {
  /**
   * The stored rate is `round(catches / sample * 100, 2)`. If inverting it were
   * ever off by one, every evidence line in the product would quietly misreport
   * the player's own history — so the round trip is swept rather than spot-checked.
   */
  it('recovers the exact catch count for every realistic sample', () => {
    for (let sample = 1; sample <= 120; sample += 1) {
      for (let catches = 0; catches <= sample; catches += 1) {
        const rate = Math.round((catches / sample) * 100 * 100) / 100
        expect(catchesFrom(rate, sample)).toBe(catches)
      }
    }
  })

  it('never reports more catches than decisions', () => {
    expect(catchesFrom(140, 10)).toBe(10)
  })

  it('treats malformed input as no evidence rather than guessing', () => {
    expect(catchesFrom(Number.NaN, 10)).toBe(0)
    expect(catchesFrom(50, 0)).toBe(0)
    expect(catchesFrom(50, -3)).toBe(0)
    expect(catchesFrom(-20, 10)).toBe(0)
  })
})

describe('describeEvidence', () => {
  it('states a count out of a count, never a bare percentage', () => {
    expect(describeEvidence('Money & Spending', 22.22, 9)).toBe(
      "In Money & Spending you've caught 2 of 9.",
    )
    expect(describeEvidence('At Work', 22.22, 9)).not.toMatch(/%/)
  })
})

describe('describePrediction', () => {
  it('hedges — a prediction is never stated as certainty', () => {
    for (const predictedCatch of [true, false]) {
      const line = describePrediction(prediction({ predictedCatch }))
      expect(line.toLowerCase()).toContain('guess')
      expect(line).not.toMatch(/\b(will definitely|certainly|always|never)\b/i)
    }
  })

  it('says something different for each direction', () => {
    expect(describePrediction(prediction({ predictedCatch: true }))).not.toBe(
      describePrediction(prediction({ predictedCatch: false })),
    )
  })
})

describe('describeVerdict', () => {
  it('names a hit', () => {
    expect(describeVerdict(verdict()).eyebrow).toBe('Twin prediction')
  })

  it('names a miss', () => {
    expect(describeVerdict(verdict({ wasCorrect: false })).eyebrow).toBe('The Twin missed')
  })

  it('distinguishes hit from miss in text, not only in colour', () => {
    const hit = describeVerdict(verdict({ wasCorrect: true }))
    const miss = describeVerdict(verdict({ wasCorrect: false }))
    expect(hit.eyebrow).not.toBe(miss.eyebrow)
    expect(hit.line).not.toBe(miss.line)
  })

  /**
   * A wrong prediction means the player broke their own pattern, which is the
   * point of the game. The copy must never frame it as the player's mistake.
   */
  it('treats a miss as interesting, never as an error or a rebuke', () => {
    for (const predictedCatch of [true, false]) {
      const { line } = describeVerdict(verdict({ wasCorrect: false, predictedCatch }))
      expect(line).not.toMatch(/\b(wrong|incorrect|error|failed|should have|unfortunately)\b/i)
    }
  })

  it('covers all four prediction/outcome combinations distinctly', () => {
    const lines = new Set(
      [
        { predictedCatch: true, wasCorrect: true },
        { predictedCatch: true, wasCorrect: false },
        { predictedCatch: false, wasCorrect: true },
        { predictedCatch: false, wasCorrect: false },
      ].map((combo) => describeVerdict(verdict(combo)).line),
    )
    expect(lines.size).toBe(4)
  })
})

describe('describePattern', () => {
  it('leads with the evidence, in both directions', () => {
    expect(describePattern(pattern({ predictsCatch: false }))).toContain("caught 2 of 9")
    expect(describePattern(pattern({ predictsCatch: true, catches: 8, observedRate: 88.89 }))).toContain(
      'caught 8 of 9',
    )
  })

  it('reports strength as readily as weakness', () => {
    const strong = describePattern(pattern({ predictsCatch: true, observedRate: 88.89 }))
    const weak = describePattern(pattern({ predictsCatch: false }))
    expect(strong).not.toBe(weak)
    expect(strong).toMatch(/read/i)
  })

  /** No trait language. The Twin describes a record, never a person. */
  it('never diagnoses the player', () => {
    for (const predictsCatch of [true, false]) {
      const line = describePattern(pattern({ predictsCatch }))
      expect(line).not.toMatch(
        /\byou are\b|\byou're\b|impulsive|careless|anxious|biased person|personality|tend to be\b/i,
      )
    }
  })

  it('prefers a generated narration when one exists', () => {
    const line = describePattern(pattern({ narration: 'Generated sentence.' }))
    expect(line).toBe('Generated sentence.')
  })

  it('falls back to the deterministic sentence when narration is absent', () => {
    // Nothing generates narration today, so this is the shipping path.
    expect(describePattern(pattern({ narration: null }))).toContain('Money & Spending')
  })
})

describe('summariseTwinAccuracy', () => {
  it('says nothing has been called yet at zero', () => {
    const accuracy = summariseTwinAccuracy(0, 0)
    expect(accuracy.percentage).toBeNull()
    expect(accuracy.summary).toBe('No predictions called yet.')
  })

  /** "100% accurate" off one prediction is true and completely misleading. */
  it('withholds a percentage below the sample floor', () => {
    const accuracy = summariseTwinAccuracy(1, 1)
    expect(accuracy.percentage).toBeNull()
    expect(accuracy.summary).toContain('too few to call')
    expect(accuracy.summary).not.toMatch(/%/)
  })

  it('reports a percentage once the floor is met', () => {
    const accuracy = summariseTwinAccuracy(MIN_ACCURACY_SAMPLE, 3)
    expect(accuracy.percentage).toBe(75)
    expect(accuracy.summary).toBe(`Right 3 of ${MIN_ACCURACY_SAMPLE} predictions.`)
  })

  it('cannot report more correct than resolved', () => {
    expect(summariseTwinAccuracy(4, 99).correct).toBe(4)
  })

  it('treats malformed counters as zero rather than rendering NaN', () => {
    const accuracy = summariseTwinAccuracy(Number.NaN, Number.NaN)
    expect(accuracy.resolved).toBe(0)
    expect(accuracy.summary).not.toMatch(/NaN/)
  })
})

describe('describeTwinStatus', () => {
  const sealed: CognitiveTwinSlot = {
    status: 'sealed',
    reason: 'insufficient_history',
    attempts: 5,
    required: 12,
  }

  it('says how much more is needed rather than implying a fault', () => {
    expect(describeTwinStatus(sealed)).toContain('7 more')
  })

  it('never claims a pattern while sealed', () => {
    expect(describeTwinStatus(sealed)).not.toMatch(/pattern/i)
  })

  it('does not go negative once the threshold is passed', () => {
    expect(describeTwinStatus({ ...sealed, attempts: 40 })).toContain('0 more')
  })

  it('distinguishes an unreadable Twin from an unformed one', () => {
    const unavailable = describeTwinStatus({ ...sealed, reason: 'unavailable' })
    expect(unavailable).not.toBe(describeTwinStatus(sealed))
    expect(unavailable).toMatch(/can’t be read/i)
  })

  it('says plainly when it has history but no pattern', () => {
    const line = describeTwinStatus({ status: 'watching', attempts: 20 })
    expect(line).toMatch(/nothing leans far enough/i)
  })

  it('counts patterns when observing', () => {
    const line = describeTwinStatus({
      status: 'observing',
      attempts: 30,
      patterns: [pattern(), pattern({ contextLabel: 'At Work' })],
      predictionsResolved: 4,
      predictionsCorrect: 3,
      recent: [],
    })
    expect(line).toBe('2 patterns in your record so far.')
  })
})
