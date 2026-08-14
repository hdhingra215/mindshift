import type { GamePhase, InsightWallet, WagerOutcome, WagerPhase } from '../types'

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
 * Read straight from the server's `affordable` list rather than re-filtered
 * here. Two implementations of "what can I stake" is one too many now that the
 * answer decides whether a wager is compulsory — see `InsightWallet.affordable`.
 * Sorted defensively; an option you cannot take is never shown greyed-out,
 * because a wager panel is meant to be read in a second.
 */
export function affordableTiers(wallet: InsightWallet): number[] {
  return [...wallet.affordable].filter((tier) => tier > 0).sort((a, b) => a - b)
}

/** True when the player can back themselves at all. False is a legitimate state. */
export function canWager(wallet: InsightWallet): boolean {
  return affordableTiers(wallet).length > 0
}

/**
 * Must this player stake before they may answer?
 *
 * The rule in one place: a wager is compulsory exactly when the reserve can
 * cover a stake. Below the smallest tier — which includes an empty reserve and
 * the 1-to-9 band above it — the player answers directly and is never stuck,
 * because being poor at Insight may not stop someone playing the game.
 *
 * `submit_attempt` decides this again server-side from the same numbers. This is
 * the advisory half, so the interface can open the answers at the right moment.
 */
export function isWagerRequired(wallet: InsightWallet): boolean {
  return canWager(wallet)
}

/**
 * Has the wager step finished, whichever way it finished?
 *
 * **The single source of truth for whether the answers may be touched.** Locked
 * (staked), skipped (could not afford one) and unavailable (no economy on this
 * deployment) are the three settled outcomes; `pending`, `offered` and `locking`
 * are all still in flight and must hold the decision shut.
 */
export function wagerSettled(phase: WagerPhase): boolean {
  return phase.status === 'locked' || phase.status === 'skipped' || phase.status === 'unavailable'
}

/**
 * May the player select or commit an answer right now?
 *
 * Exported and pure so the reducer, the interface and the tests all read one
 * rule. The reducer calls this to *reject the action*, which is what makes the
 * ordering structural — a disabled button is a courtesy, not an enforcement.
 */
export function canAnswer(gamePhase: GamePhase, wager: WagerPhase): boolean {
  return gamePhase === 'deciding' && wagerSettled(wager)
}

/**
 * Should the answer clock be restarted on this transition?
 *
 * `response_time_ms` claims to measure how long the player weighed their
 * *choice*, and it feeds the session rollup and the Archive's median
 * deliberation reading. With the stake now in front of the answer, timing from
 * the scenario load would bill every second spent choosing a stake to the
 * answer and quietly inflate that number.
 *
 * So the clock restarts on the edge into the answer step — settled having been
 * unsettled — and only there. Not on every render while settled, or the elapsed
 * time would reset to nothing on the way to the submit.
 */
export function shouldRestartAnswerClock(wasSettled: boolean, isSettled: boolean): boolean {
  return isSettled && !wasSettled
}

/**
 * Is this a stake the server would accept?
 *
 * Mirrors `place_wager`'s validation, against the server's own affordable list.
 * The client checks first only so a rejected stake never reaches the network;
 * the server is still the authority.
 */
export function isValidStake(wallet: InsightWallet, stake: number): boolean {
  if (!Number.isInteger(stake) || stake <= 0) return false
  return affordableTiers(wallet).includes(stake)
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

/**
 * The line that states the wager is the way in.
 *
 * Says *why* rather than "required": the stake is how you commit to a read, and
 * naming it that way keeps the step part of the decision instead of a toll on
 * the way to one.
 */
export function describeWagerRequirement(): string {
  return 'Commit your conviction first — your options unlock once your stake is locked in.'
}

/**
 * What the panel says when the player cannot afford any stake.
 *
 * Covers an empty reserve and the band above it that still cannot cover the
 * smallest tier. It has to say plainly that the game continues: a player who
 * reads this must not think they are locked out.
 */
export function describeEmptyReserve(wallet: InsightWallet): string {
  return `Not enough Insight to stake this one, so go straight to your answer. Keep playing — every correct answer earns ${wallet.recognitionAward} Insight, and the wager comes back on its own.`
}

/** What the panel says while the reserve has not come back yet. */
export function describeReserveUnreadable(): string {
  return 'We couldn’t read your Insight reserve just now. It decides what you can stake, so let’s try that again before you answer.'
}
