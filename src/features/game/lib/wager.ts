import type { InsightWallet, WagerOutcome } from '../types'

/**
 * Blind Wager rules, on the client side of the line.
 *
 * Every number here is *also* enforced in SQL. This module exists so the
 * interface can show a player what a stake would do before they commit to it —
 * it decides nothing. `place_wager` revalidates the tier, the ownership and the
 * balance server-side and is the only thing that can actually lock a stake.
 *
 * ── The one rule the copy in this file protects ─────────────────────────────
 * Losing Insight teaches calibration; it does not punish. So nothing here says
 * "lost", nothing scolds, and the wrong-answer line points at the lesson rather
 * than the deficit. The player staked on themselves and found out something
 * true, which is the entire mechanic working.
 *
 * Pure and tested.
 */

/** Insight, written out. Never a bare integer — the unit is half the meaning. */
export function formatInsight(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.trunc(amount)) : 0
  return `${safe} Insight`
}

/**
 * The stakes this player can actually back right now.
 *
 * Filtered against the live balance rather than shown greyed-out: an option you
 * cannot take is noise, and a wager panel is meant to be read in a second.
 */
export function affordableTiers(wallet: InsightWallet): number[] {
  return wallet.tiers.filter((tier) => tier > 0 && tier <= wallet.balance).sort((a, b) => a - b)
}

/** True when the player can back themselves at all. False is a legitimate state. */
export function canWager(wallet: InsightWallet): boolean {
  return affordableTiers(wallet).length > 0
}

/**
 * Is this a stake the server would accept?
 *
 * Mirrors `place_wager`'s validation exactly. The client checks first only so a
 * rejected stake never reaches the network; the server is still the authority.
 */
export function isValidStake(wallet: InsightWallet, stake: number): boolean {
  if (!Number.isInteger(stake) || stake <= 0) return false
  if (!wallet.tiers.includes(stake)) return false
  return stake <= wallet.balance
}

/**
 * Where the balance lands either way.
 *
 * Both outcomes are shown *before* the player locks in, because hiding the
 * downside of a commitment is the dark pattern this mechanic would otherwise
 * become. Even money, so the two are symmetric — which is the point.
 */
export function projectBalance(
  wallet: InsightWallet,
  stake: number,
): { ifRight: number; ifWrong: number } {
  const safeStake = isValidStake(wallet, stake) ? stake : 0
  return {
    ifRight: wallet.balance + safeStake,
    ifWrong: Math.max(0, wallet.balance - safeStake),
  }
}

export type WagerResultCopy = {
  /** Etched eyebrow — the fact, in two words. */
  eyebrow: string
  /** The signed movement, e.g. `"+25 Insight"`. */
  movement: string
  /** One line. Teaches, never scolds. */
  line: string
}

/**
 * How a resolved wager reads.
 *
 * The winning line is quiet — being right about yourself is not a jackpot, and
 * treating it as one would push the mechanic towards the casino feel this
 * product refuses. The losing line names the *lesson* (your confidence outran
 * your judgement here) rather than the loss, and never uses the word.
 */
export function describeWagerResult(outcome: WagerOutcome): WagerResultCopy {
  if (outcome.wasCorrect) {
    return {
      eyebrow: 'Backed yourself',
      movement: `+${outcome.stake} Insight`,
      line:
        outcome.stake >= 50
          ? 'Full conviction, and it held. That is what calibration looks like.'
          : 'You trusted your read and it paid. Worth noticing how sure you felt.',
    }
  }

  return {
    eyebrow: 'Conviction outran the answer',
    movement: `−${outcome.stake} Insight`,
    line:
      outcome.stake >= 50
        ? 'You were certain here, and certainty is exactly where a bias hides best.'
        : 'You backed a read that did not hold. That gap is the useful part.',
  }
}

/**
 * The inline first-time explanation.
 *
 * Not a modal, not a tour. Three facts a player needs before their first stake —
 * what Insight is, what it is worth outside the game, and that running out does
 * not stop them — in the space of a caption.
 */
export function describeWagerIntro(wallet: InsightWallet): string {
  return `Insight is earned by playing well and has no real-world value. Get it right and you gain your stake; get it wrong and you lose it. Each correct answer earns ${wallet.recognitionAward} Insight either way, so you can never be stuck.`
}

/** What the panel says when the player cannot afford any stake. */
export function describeEmptyReserve(wallet: InsightWallet): string {
  return `Your reserve is empty. Keep playing — every correct answer earns ${wallet.recognitionAward} Insight, and the wager comes back on its own.`
}
