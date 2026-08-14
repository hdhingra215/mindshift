import { describe, expect, it } from 'vitest'

import {
  affordableTiers,
  canAnswer,
  canWager,
  describeEmptyReserve,
  describeWagerIntro,
  describeWagerResult,
  formatInsight,
  isValidStake,
  isWagerRequired,
  projectBalance,
  shouldRestartAnswerClock,
  wagerSettled,
} from '@/features/game/lib/wager'
import type { InsightWallet, WagerOutcome, WagerPhase } from '@/features/game/types'

/**
 * Blind Wager rules, client side.
 *
 * The server enforces all of this too, so these tests are not the security
 * boundary — the live suite is. What they defend is the thing the server cannot:
 * that the interface never offers a stake the player cannot make, never hides
 * the downside, and never frames a loss as a punishment.
 */

/**
 * `affordable` is the server's list, so the fixture defaults to what the server
 * would actually have sent for this balance rather than leaving it empty — an
 * empty default would make every wallet look unaffordable and quietly invert the
 * thing these tests exist to check. Pass it explicitly to test disagreement.
 */
function wallet(overrides: Partial<InsightWallet> = {}): InsightWallet {
  const merged = { balance: 50, tiers: [10, 25, 50], recognitionAward: 5, ...overrides }
  return {
    ...merged,
    affordable:
      overrides.affordable ??
      merged.tiers.filter((tier) => tier > 0 && tier <= merged.balance).sort((a, b) => a - b),
  }
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

describe('affordableTiers — the server is the authority', () => {
  it('reports what the server sent, not what the balance implies', () => {
    // A server that says "nothing affordable" wins over a balance that suggests
    // otherwise. The alternative is a client that opens a wager the server
    // refuses, or blocks an answer the server would have taken.
    expect(affordableTiers(wallet({ balance: 50, affordable: [] }))).toEqual([])
    expect(affordableTiers(wallet({ balance: 0, affordable: [10] }))).toEqual([10])
  })

  it('sorts defensively, whatever order the server used', () => {
    expect(affordableTiers(wallet({ affordable: [50, 10, 25] }))).toEqual([10, 25, 50])
  })
})

describe('isWagerRequired', () => {
  it('is false at zero Insight — the player answers directly', () => {
    expect(isWagerRequired(wallet({ balance: 0 }))).toBe(false)
  })

  it('is false across the 1–9 band, which cannot cover the smallest tier', () => {
    // The band that would strand a player under a naive "balance > 0" rule.
    for (const balance of [1, 5, 9]) {
      expect(isWagerRequired(wallet({ balance }))).toBe(false)
    }
  })

  it('is true at exactly the smallest tier', () => {
    expect(isWagerRequired(wallet({ balance: 10 }))).toBe(true)
  })

  it('is true at higher balances', () => {
    for (const balance of [11, 25, 50, 500]) {
      expect(isWagerRequired(wallet({ balance }))).toBe(true)
    }
  })
})

describe('wagerSettled', () => {
  const phases: Record<string, WagerPhase> = {
    pending: { status: 'pending', unreadable: false },
    unreadable: { status: 'pending', unreadable: true },
    offered: { status: 'offered', wallet: wallet() },
    locking: { status: 'locking', wallet: wallet(), stake: 25 },
    locked: { status: 'locked', wallet: wallet(), wager: { wagerId: 'w1', stake: 25 } },
    skipped: { status: 'skipped', wallet: wallet({ balance: 0 }) },
    unavailable: { status: 'unavailable' },
  }

  it('is settled once a stake is locked', () => {
    expect(wagerSettled(phases.locked!)).toBe(true)
  })

  it('is settled when no stake was affordable', () => {
    expect(wagerSettled(phases.skipped!)).toBe(true)
  })

  it('is settled when the economy is not deployed at all', () => {
    expect(wagerSettled(phases.unavailable!)).toBe(true)
  })

  it('is unsettled while a stake is required and uncommitted', () => {
    expect(wagerSettled(phases.offered!)).toBe(false)
    expect(wagerSettled(phases.locking!)).toBe(false)
  })

  it('is unsettled while the reserve is unknown, including after a failed read', () => {
    // The load-bearing case: an unread reserve must not read as "no balance",
    // or an affordable player answers and the server refuses them.
    expect(wagerSettled(phases.pending!)).toBe(false)
    expect(wagerSettled(phases.unreadable!)).toBe(false)
  })
})

describe('canAnswer — the ordering rule the reducer enforces', () => {
  const offered: WagerPhase = { status: 'offered', wallet: wallet() }
  const locked: WagerPhase = {
    status: 'locked',
    wallet: wallet(),
    wager: { wagerId: 'w1', stake: 25 },
  }
  const skipped: WagerPhase = { status: 'skipped', wallet: wallet({ balance: 0 }) }

  it('blocks an answer while the wager is mandatory and unlocked', () => {
    expect(canAnswer('deciding', offered)).toBe(false)
  })

  it('blocks an answer while the reserve is still unknown', () => {
    expect(canAnswer('deciding', { status: 'pending', unreadable: false })).toBe(false)
    expect(canAnswer('deciding', { status: 'pending', unreadable: true })).toBe(false)
  })

  it('blocks an answer mid-commit, so a stake cannot be raced', () => {
    expect(canAnswer('deciding', { status: 'locking', wallet: wallet(), stake: 50 })).toBe(false)
  })

  it('allows an answer once the stake is locked', () => {
    expect(canAnswer('deciding', locked)).toBe(true)
  })

  it('allows an answer when the wager was skipped for affordability', () => {
    expect(canAnswer('deciding', skipped)).toBe(true)
  })

  it('allows an answer when there is no economy to wager against', () => {
    expect(canAnswer('deciding', { status: 'unavailable' })).toBe(true)
  })

  it('refuses outside the deciding phase, however settled the wager', () => {
    // Guards the double-commit: once submitting or revealed, a second answer
    // cannot be selected or started even though the wager is locked.
    for (const phase of ['submitting', 'revealed', 'initializing', 'summary'] as const) {
      expect(canAnswer(phase, locked)).toBe(false)
    }
  })
})

describe('shouldRestartAnswerClock', () => {
  /*
   * The regression this guards: with the stake ahead of the answer, a clock
   * started at scenario load bills wager deliberation to `response_time_ms` —
   * the one number that claims to say how long the player weighed their choice.
   */
  it('restarts on the edge into the answer step', () => {
    expect(shouldRestartAnswerClock(false, true)).toBe(true)
  })

  it('does not restart while the answer step stays open', () => {
    // Restarting on every render would leave elapsed time near zero at submit.
    expect(shouldRestartAnswerClock(true, true)).toBe(false)
  })

  it('does not start the clock while the wager is still unsettled', () => {
    expect(shouldRestartAnswerClock(false, false)).toBe(false)
  })

  it('does not restart when the step closes again on a new scenario', () => {
    expect(shouldRestartAnswerClock(true, false)).toBe(false)
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
