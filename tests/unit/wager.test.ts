import { describe, expect, it } from 'vitest'

import {
  affordableTiers,
  canWager,
  describeEmptyReserve,
  describeWagerIntro,
  describeWagerResult,
  formatInsight,
  isValidStake,
  projectBalance,
} from '@/features/game/lib/wager'
import type { InsightWallet, WagerOutcome } from '@/features/game/types'

/**
 * Blind Wager rules, client side.
 *
 * The server enforces all of this too, so these tests are not the security
 * boundary — the live suite is. What they defend is the thing the server cannot:
 * that the interface never offers a stake the player cannot make, never hides
 * the downside, and never frames a loss as a punishment.
 */

function wallet(overrides: Partial<InsightWallet> = {}): InsightWallet {
  return { balance: 50, tiers: [10, 25, 50], recognitionAward: 5, ...overrides }
}

function outcome(overrides: Partial<WagerOutcome> = {}): WagerOutcome {
  return {
    wagerId: 'w1',
    stake: 25,
    wasCorrect: true,
    delta: 25,
    balanceBefore: 50,
    balanceAfter: 75,
    ...overrides,
  }
}

describe('affordableTiers', () => {
  it('offers every tier at a full reserve', () => {
    expect(affordableTiers(wallet({ balance: 50 }))).toEqual([10, 25, 50])
  })

  it('drops tiers the player cannot cover', () => {
    expect(affordableTiers(wallet({ balance: 30 }))).toEqual([10, 25])
  })

  /** Boundary: a tier exactly equal to the balance is affordable. */
  it('includes a tier equal to the balance', () => {
    expect(affordableTiers(wallet({ balance: 25 }))).toEqual([10, 25])
  })

  it('offers nothing one Insight short', () => {
    expect(affordableTiers(wallet({ balance: 9 }))).toEqual([])
  })

  it('offers nothing at zero', () => {
    expect(affordableTiers(wallet({ balance: 0 }))).toEqual([])
  })

  it('returns tiers in ascending order whatever order they arrive in', () => {
    expect(affordableTiers(wallet({ tiers: [50, 10, 25] }))).toEqual([10, 25, 50])
  })
})

describe('canWager', () => {
  it('is false at zero — a legitimate state, not an error', () => {
    expect(canWager(wallet({ balance: 0 }))).toBe(false)
  })

  it('is true as soon as the smallest tier is affordable', () => {
    expect(canWager(wallet({ balance: 10 }))).toBe(true)
  })
})

describe('isValidStake', () => {
  it('accepts a tier the player can cover', () => {
    expect(isValidStake(wallet({ balance: 50 }), 25)).toBe(true)
  })

  it('accepts a stake exactly equal to the balance', () => {
    expect(isValidStake(wallet({ balance: 25 }), 25)).toBe(true)
  })

  it('rejects a stake above the balance', () => {
    expect(isValidStake(wallet({ balance: 24 }), 25)).toBe(false)
  })

  it('rejects an amount that is not a defined tier', () => {
    expect(isValidStake(wallet(), 30)).toBe(false)
    expect(isValidStake(wallet(), 1)).toBe(false)
  })

  it('rejects zero and negatives', () => {
    expect(isValidStake(wallet(), 0)).toBe(false)
    expect(isValidStake(wallet(), -25)).toBe(false)
  })

  it('rejects malformed numbers rather than coercing them', () => {
    expect(isValidStake(wallet(), Number.NaN)).toBe(false)
    expect(isValidStake(wallet(), Infinity)).toBe(false)
    expect(isValidStake(wallet(), 25.5)).toBe(false)
  })

  it('rejects everything at an empty reserve', () => {
    const empty = wallet({ balance: 0 })
    for (const tier of empty.tiers) {
      expect(isValidStake(empty, tier)).toBe(false)
    }
  })
})

describe('projectBalance', () => {
  /** Even money, both directions. The symmetry is the incentive to be honest. */
  it('is symmetric around the current balance', () => {
    const projection = projectBalance(wallet({ balance: 50 }), 25)
    expect(projection.ifRight).toBe(75)
    expect(projection.ifWrong).toBe(25)
  })

  it('lands exactly on zero when the whole reserve is staked', () => {
    const projection = projectBalance(wallet({ balance: 50 }), 50)
    expect(projection.ifWrong).toBe(0)
  })

  /** The property the schema also enforces: a balance can never go negative. */
  it('never projects a negative balance', () => {
    for (const balance of [0, 1, 9, 10, 25, 50]) {
      for (const stake of [10, 25, 50, 999]) {
        expect(projectBalance(wallet({ balance }), stake).ifWrong).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('treats an invalid stake as no movement', () => {
    const projection = projectBalance(wallet({ balance: 50 }), 999)
    expect(projection.ifRight).toBe(50)
    expect(projection.ifWrong).toBe(50)
  })
})

describe('describeWagerResult', () => {
  it('reports the gain with its sign and unit', () => {
    expect(describeWagerResult(outcome({ stake: 25 })).movement).toBe('+25 Insight')
  })

  it('reports the shortfall with its sign and unit — never hidden', () => {
    const copy = describeWagerResult(outcome({ wasCorrect: false, stake: 25, delta: -25 }))
    expect(copy.movement).toBe('−25 Insight')
  })

  it('distinguishes the two in words, not only in colour', () => {
    const won = describeWagerResult(outcome({ wasCorrect: true }))
    const lost = describeWagerResult(outcome({ wasCorrect: false }))
    expect(won.eyebrow).not.toBe(lost.eyebrow)
    expect(won.line).not.toBe(lost.line)
  })

  /**
   * Losing Insight teaches calibration; it does not punish. The copy must carry
   * no scolding, no loss-aversion pressure and no gambling vocabulary.
   */
  it('never scolds the player for a wrong call', () => {
    for (const stake of [10, 25, 50]) {
      const { line, eyebrow } = describeWagerResult(
        outcome({ wasCorrect: false, stake, delta: -stake }),
      )
      expect(`${eyebrow} ${line}`).not.toMatch(
        /\b(lost|lose|penalt|punish|failed|mistake|shouldn|unfortunately|careless)\b/i,
      )
    }
  })

  it('uses no gambling language in either outcome', () => {
    for (const wasCorrect of [true, false]) {
      const { line, eyebrow } = describeWagerResult(outcome({ wasCorrect }))
      expect(`${eyebrow} ${line}`).not.toMatch(/\b(bet|jackpot|odds|payout|win|gamble|luck)\b/i)
    }
  })

  it('says something distinct at full conviction', () => {
    const big = describeWagerResult(outcome({ wasCorrect: false, stake: 50, delta: -50 }))
    const small = describeWagerResult(outcome({ wasCorrect: false, stake: 10, delta: -10 }))
    expect(big.line).not.toBe(small.line)
  })
})

describe('first-time copy', () => {
  it('states that Insight has no real-world value before the first stake', () => {
    expect(describeWagerIntro(wallet())).toMatch(/no real-world value/i)
  })

  it('states both outcomes and the recovery path', () => {
    const intro = describeWagerIntro(wallet({ recognitionAward: 5 }))
    expect(intro).toMatch(/gain your stake/i)
    expect(intro).toMatch(/lose it/i)
    expect(intro).toContain('5 Insight')
  })

  it('tells an empty reserve it can continue, with no pressure language', () => {
    const line = describeEmptyReserve(wallet({ balance: 0 }))
    expect(line).toMatch(/keep playing/i)
    expect(line).not.toMatch(/\b(don.t lose|hurry|only|last chance|risk losing)\b/i)
  })
})

describe('formatInsight', () => {
  it('always carries the unit', () => {
    expect(formatInsight(25)).toBe('25 Insight')
  })

  it('never renders a negative balance', () => {
    expect(formatInsight(-5)).toBe('0 Insight')
  })

  it('degrades malformed input to zero rather than NaN', () => {
    expect(formatInsight(Number.NaN)).toBe('0 Insight')
  })
})
