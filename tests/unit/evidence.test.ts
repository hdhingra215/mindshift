import { describe, expect, it } from 'vitest'

import type { ObservatoryBias } from '@/features/dashboard'
import { getMasteryTier } from '@/features/mastery'
import {
  MIN_CALIBRATION_SAMPLE,
  formatDeliberation,
  formatShare,
  masteryDistribution,
  standingsByFamily,
  strongestKnown,
  summariseCalibration,
  summariseDecisions,
  MIN_CONVICTION_SAMPLE,
  describeConviction,
  formatInsightMovement,
  summariseConviction,
} from '@/features/profile'
import type { ArchiveCalibrationPoint, ArchiveDecision } from '@/features/profile'

/**
 * Tests for the archive's descriptive summaries.
 *
 * This is the only client-side logic in the Mind Archive that derives a number,
 * so it is the only part worth covering here. The progression maths it sits
 * next to — XP, mastery, achievements, streaks — is in SQL and needs a database
 * harness, not this file (ProjectStatus §8.2).
 *
 * The properties asserted below are the ones that would silently mislead a
 * player if they broke: an outlier dragging the tempo, a calibration verdict
 * stated from too little evidence, or a summary that quietly invents a fact for
 * a player who has done nothing.
 */

function decision(overrides: Partial<ArchiveDecision> = {}): ArchiveDecision {
  return {
    isCorrect: true,
    responseTimeMs: 10_000,
    reflected: false,
    difficulty: 'easy',
    ...overrides,
  }
}

function bias(overrides: Partial<ObservatoryBias> = {}): ObservatoryBias {
  const masteryLevel = overrides.masteryLevel ?? 0
  return {
    slug: 'anchoring',
    name: 'Anchoring',
    categoryName: 'Judgement',
    masteryLevel,
    distinctContexts: 0,
    totalAttempts: 0,
    lastPracticedAt: null,
    ...overrides,
    // Tier follows the level unless a test deliberately pins it, so a fixture
    // can never claim a mastery number and a contradicting tier by accident.
    tier: overrides.tier ?? getMasteryTier(masteryLevel),
  }
}

describe('summariseDecisions', () => {
  it('reports nothing rather than zeros for a player with no record', () => {
    const summary = summariseDecisions([])

    expect(summary.total).toBe(0)
    expect(summary.medianResponseMs).toBeNull()
    expect(summary.byDifficulty).toEqual([])
  })

  it('uses the median so one abandoned tab cannot define the tempo', () => {
    const summary = summariseDecisions([
      decision({ responseTimeMs: 8_000 }),
      decision({ responseTimeMs: 9_000 }),
      decision({ responseTimeMs: 10_000 }),
      decision({ responseTimeMs: 11_000 }),
      // Left open for an hour. A mean would be ~12 minutes.
      decision({ responseTimeMs: 3_600_000 }),
    ])

    expect(summary.medianResponseMs).toBe(10_000)
  })

  it('averages the two middle timings on an even sample', () => {
    const summary = summariseDecisions([
      decision({ responseTimeMs: 4_000 }),
      decision({ responseTimeMs: 6_000 }),
    ])

    expect(summary.medianResponseMs).toBe(5_000)
  })

  it('is order independent', () => {
    const decisions = [
      decision({ responseTimeMs: 30_000, difficulty: 'hard', isCorrect: false }),
      decision({ responseTimeMs: 5_000, difficulty: 'easy', reflected: true }),
      decision({ responseTimeMs: 12_000, difficulty: 'medium' }),
    ]

    expect(summariseDecisions(decisions)).toEqual(summariseDecisions([...decisions].reverse()))
  })

  it('measures the reflection rate against every decision, not just reflected ones', () => {
    const summary = summariseDecisions([
      decision({ reflected: true }),
      decision({ reflected: false }),
      decision({ reflected: false }),
      decision({ reflected: false }),
    ])

    expect(summary.reflectionRate).toBeCloseTo(0.25)
  })

  it('bands by difficulty in ladder order and omits untouched rungs', () => {
    const summary = summariseDecisions([
      decision({ difficulty: 'expert', isCorrect: false }),
      decision({ difficulty: 'easy', isCorrect: true }),
      decision({ difficulty: 'easy', isCorrect: false }),
    ])

    expect(summary.byDifficulty.map((band) => band.difficulty)).toEqual(['easy', 'expert'])
    expect(summary.byDifficulty[0]).toEqual({ difficulty: 'easy', attempted: 2, caught: 1 })
    expect(summary.byDifficulty[1]).toEqual({ difficulty: 'expert', attempted: 1, caught: 0 })
  })

  it('ignores a negative timing rather than letting it pull the median down', () => {
    const summary = summariseDecisions([
      decision({ responseTimeMs: -1 }),
      decision({ responseTimeMs: 20_000 }),
    ])

    expect(summary.medianResponseMs).toBe(20_000)
    // The decision still counts; only its unusable timing is dropped.
    expect(summary.total).toBe(2)
  })
})

describe('summariseCalibration', () => {
  function point(confidenceBefore: number, isCorrect: boolean): ArchiveCalibrationPoint {
    return { confidenceBefore, isCorrect }
  }

  it('refuses to state a direction below the sample floor', () => {
    const points = Array.from({ length: MIN_CALIBRATION_SAMPLE - 1 }, () => point(100, false))
    const summary = summariseCalibration(points)

    expect(summary.direction).toBe('insufficient')
    expect(summary.gap).toBeNull()
    expect(summary.averageConfidence).toBeNull()
    expect(summary.sampleSize).toBe(MIN_CALIBRATION_SAMPLE - 1)
  })

  it('reports confidence running ahead of outcomes', () => {
    const summary = summariseCalibration([
      point(90, true),
      point(90, false),
      point(90, false),
      point(90, false),
      point(90, false),
    ])

    expect(summary.averageConfidence).toBe(90)
    expect(summary.observedAccuracy).toBe(20)
    expect(summary.gap).toBe(70)
    expect(summary.direction).toBe('ahead')
  })

  it('reports confidence running behind outcomes', () => {
    const summary = summariseCalibration([
      point(20, true),
      point(20, true),
      point(20, true),
      point(20, true),
      point(20, false),
    ])

    expect(summary.gap).toBe(-60)
    expect(summary.direction).toBe('behind')
  })

  it('calls a small gap aligned rather than flipping direction on noise', () => {
    const summary = summariseCalibration([
      point(85, true),
      point(85, true),
      point(85, true),
      point(85, true),
      point(85, false),
    ])

    expect(summary.gap).toBe(5)
    expect(summary.direction).toBe('aligned')
  })

  it('drops unusable confidence readings before counting the sample', () => {
    const summary = summariseCalibration([
      point(Number.NaN, true),
      point(-5, true),
      point(50, true),
      point(50, false),
    ])

    // Two usable readings — still below the floor, and honestly reported as two.
    expect(summary.sampleSize).toBe(2)
    expect(summary.direction).toBe('insufficient')
  })
})

describe('standingsByFamily', () => {
  it('ranks families by mean mastery, strongest first', () => {
    const standings = standingsByFamily([
      bias({ slug: 'a', categoryName: 'Social', masteryLevel: 10, totalAttempts: 2 }),
      bias({ slug: 'b', categoryName: 'Social', masteryLevel: 30, totalAttempts: 1 }),
      bias({ slug: 'c', categoryName: 'Memory', masteryLevel: 80, totalAttempts: 4 }),
    ])

    expect(standings.map((standing) => standing.name)).toEqual(['Memory', 'Social'])
    expect(standings[0]?.averageMastery).toBe(80)
    expect(standings[1]?.averageMastery).toBe(20)
  })

  it('counts only biases actually met, not every member of the family', () => {
    const standings = standingsByFamily([
      bias({ slug: 'a', categoryName: 'Social', masteryLevel: 40, totalAttempts: 3 }),
      bias({ slug: 'b', categoryName: 'Social', masteryLevel: 0, totalAttempts: 0 }),
    ])

    expect(standings[0]).toMatchObject({ metCount: 1, size: 2 })
  })

  it('files a bias with no category rather than dropping it', () => {
    const standings = standingsByFamily([bias({ categoryName: null, masteryLevel: 50 })])

    expect(standings).toHaveLength(1)
    expect(standings[0]?.name).toBe('Unfiled')
  })
})

describe('masteryDistribution', () => {
  it('always returns all five tiers, summing to the number of biases', () => {
    const biases = [
      bias({ slug: 'a', masteryLevel: 0 }),
      bias({ slug: 'b', masteryLevel: 25 }),
      bias({ slug: 'c', masteryLevel: 95 }),
    ]
    const distribution = masteryDistribution(biases)

    expect(Object.keys(distribution)).toHaveLength(5)
    expect(distribution).toMatchObject({ unfamiliar: 1, aware: 1, mastered: 1 })
    expect(Object.values(distribution).reduce((sum, count) => sum + count, 0)).toBe(biases.length)
  })

  it('puts an untouched set entirely in the floor tier', () => {
    expect(masteryDistribution([bias({ slug: 'a' }), bias({ slug: 'b' })])).toMatchObject({
      unfamiliar: 2,
      mastered: 0,
    })
  })
})

describe('strongestKnown', () => {
  it('returns nothing when no bias has been met', () => {
    expect(strongestKnown([bias({ totalAttempts: 0, masteryLevel: 0 })])).toBeNull()
  })

  it('never crowns a bias the player has never encountered', () => {
    const strongest = strongestKnown([
      // Higher level, but no attempts — data that should not exist, and must not win.
      bias({ slug: 'ghost', masteryLevel: 90, totalAttempts: 0 }),
      bias({ slug: 'real', masteryLevel: 40, totalAttempts: 5 }),
    ])

    expect(strongest?.slug).toBe('real')
  })

  it('picks the highest mastery among met biases', () => {
    const strongest = strongestKnown([
      bias({ slug: 'low', masteryLevel: 20, totalAttempts: 2 }),
      bias({ slug: 'high', masteryLevel: 70, totalAttempts: 2 }),
    ])

    expect(strongest?.slug).toBe('high')
  })
})

describe('formatting', () => {
  it('renders sub-minute deliberation in seconds', () => {
    expect(formatDeliberation(12_400)).toBe('12s')
  })

  it('pads the seconds past a minute so timings line up', () => {
    expect(formatDeliberation(64_000)).toBe('1m 04s')
  })

  it('shows an em dash rather than a fake zero when nothing is recorded', () => {
    expect(formatDeliberation(null)).toBe('—')
    expect(formatDeliberation(Number.NaN)).toBe('—')
  })

  it('clamps a share to the scale', () => {
    expect(formatShare(0.375)).toBe('38%')
    expect(formatShare(1.4)).toBe('100%')
    expect(formatShare(Number.NaN)).toBe('0%')
  })
})

describe('conviction — what a stake says that an answer does not', () => {
  const wager = (stake: number, wasCorrect: boolean) => ({
    stake,
    wasCorrect,
    delta: wasCorrect ? stake : -stake,
  })

  /** n settled wagers at one tier, `correct` of them right. */
  const run = (stake: number, total: number, correct: number) =>
    Array.from({ length: total }, (_, i) => wager(stake, i < correct))

  it('refuses a reading below the sample floor, and says what it is waiting for', () => {
    const summary = summariseConviction(run(10, MIN_CONVICTION_SAMPLE - 1, 4), 50)

    expect(summary.direction).toBe('insufficient')
    expect(summary.stakedAccuracy).toBeNull()
    expect(summary.edge).toBeNull()
    // The floor is higher here than anywhere else in the archive because this
    // is a comparison of two rates, and a difference between two small samples
    // is noise wearing the clothes of a finding.
    expect(MIN_CONVICTION_SAMPLE).toBeGreaterThan(MIN_CALIBRATION_SAMPLE)
    expect(describeConviction(summary)).toMatch(/settled/i)
  })

  it('says nothing at all before the first stake settles', () => {
    const summary = summariseConviction([], 60)
    expect(summary.sampleSize).toBe(0)
    expect(summary.netInsight).toBe(0)
    expect(describeConviction(summary)).toMatch(/no stakes settled/i)
  })

  it('reports the gap against overall accuracy, not the staked rate alone', () => {
    // 8 of 10 staked decisions right, against a 60% overall rate.
    const summary = summariseConviction(run(25, 10, 8), 60)

    expect(summary.stakedAccuracy).toBe(80)
    expect(summary.edge).toBe(20)
    expect(summary.direction).toBe('sharper')
  })

  it('reads the same staked rate differently against a different baseline', () => {
    // The whole reason the comparison exists: 80% is a finding against 60% and
    // a shortfall against 95%.
    const sharper = summariseConviction(run(25, 10, 8), 60)
    const looser = summariseConviction(run(25, 10, 8), 95)

    expect(sharper.stakedAccuracy).toBe(looser.stakedAccuracy)
    expect(sharper.direction).toBe('sharper')
    expect(looser.direction).toBe('looser')
  })

  it('calls a small difference level rather than inventing a trend', () => {
    const summary = summariseConviction(run(10, 10, 7), 68)
    expect(summary.direction).toBe('level')
  })

  it('withholds a per-tier accuracy until that tier has its own evidence', () => {
    const summary = summariseConviction([...run(10, 6, 4), ...run(50, 2, 2)], 55)

    const small = summary.bands.find((band) => band.stake === 10)
    const large = summary.bands.find((band) => band.stake === 50)

    expect(small?.accuracy).toBe(67)
    // Two decisions is not a 100% record, and drawing it as one would be the
    // most misleading thing on the screen.
    expect(large?.accuracy).toBeNull()
    expect(large?.attempts).toBe(2)
  })

  it('orders the tiers ascending, whatever order they arrived in', () => {
    const summary = summariseConviction([...run(50, 3, 2), ...run(10, 3, 1)], 50)
    expect(summary.bands.map((band) => band.stake)).toEqual([10, 50])
  })

  it('reports net Insight exactly, including before the floor', () => {
    // The movement is a fact about a ledger, not a claim about a pattern, so it
    // is always exact and never withheld.
    const summary = summariseConviction([wager(50, true), wager(10, false)], 50)
    expect(summary.netInsight).toBe(40)
    expect(summary.stakedAccuracy).toBeNull()
  })

  it('never scolds, never diagnoses, and never mentions gambling', () => {
    const readings = [
      summariseConviction([], 50),
      summariseConviction(run(10, 3, 1), 50),
      summariseConviction(run(25, 12, 3), 70),
      summariseConviction(run(25, 12, 11), 55),
    ].map(describeConviction)

    for (const line of readings) {
      // The archive holds evidence; it does not judge the person holding it.
      expect(line).not.toMatch(/reckless|foolish|bad|poor|should have|you are over/i)
      // And the mechanic is a commitment, never a bet (§5.4).
      expect(line).not.toMatch(/\bbet\b|gambl|wager|odds|luck|win streak|payout/i)
    }
  })

  it('states the Insight movement plainly in both directions', () => {
    expect(formatInsightMovement(0)).toMatch(/even/i)
    expect(formatInsightMovement(35)).toContain('+35')
    // A shortfall is not softened or hidden.
    expect(formatInsightMovement(-35)).toContain('-35')
  })
})
