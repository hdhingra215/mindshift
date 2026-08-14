import { z } from 'zod'

import { supabase } from '@/lib/supabase/client'

import type { InsightWallet, LockedWager, WagerOutcome } from '../types'

/**
 * Blind Wager data access.
 *
 * Two RPCs. Neither takes a player id — the server derives it from `auth.uid()`
 * — and neither is trusted with an amount it has not revalidated. The client
 * cannot tell the server "I won 50 Insight"; it can only say "I stake 25 on this
 * scenario", and the server decides whether that is even possible.
 *
 * Payloads are `jsonb`, so they are **parsed, not asserted** — the rule
 * established in `scenario-row.ts` after a cast cost a phase.
 *
 * Every failure degrades to "no wager available" rather than throwing. The
 * scenario must stay playable if the economy is unreachable, absent, or on an
 * older deployment.
 */

const walletSchema = z
  .object({
    balance: z.coerce.number().int(),
    tiers: z.array(z.coerce.number().int()),
    // Absent on a deployment predating the affordable list; fall back to the
    // client filter there rather than reporting "nothing affordable", which
    // would wrongly send an affordable player straight past the wager.
    affordable: z.array(z.coerce.number().int()).nullish(),
    recognition_award: z.coerce.number().int(),
  })
  .transform(
    (row): InsightWallet => ({
      balance: row.balance,
      tiers: row.tiers,
      affordable:
        row.affordable ?? row.tiers.filter((tier) => tier > 0 && tier <= row.balance),
      recognitionAward: row.recognition_award,
    }),
  )

/**
 * How a reserve read finished.
 *
 * The three are kept apart because the gate treats them differently now that a
 * stake can be compulsory. `absent` means this deployment has no economy at all,
 * so `submit_attempt` has no ordering gate either and the player may answer
 * freely. `failed` means we simply do not know — and answering on a guess would
 * produce a submission the server refuses.
 */
export type WalletRead =
  | { status: 'ok'; wallet: InsightWallet }
  | { status: 'absent' }
  | { status: 'failed' }

/** PostgREST / PostgreSQL codes that mean "this function is not deployed". */
const ABSENT_CODES = new Set(['42883', 'PGRST202', 'PGRST203'])

/** How many times the reserve is read before the gate gives up and offers retry. */
const WALLET_READ_ATTEMPTS = 3

/** Backoff between reads. Short — a scenario is on screen waiting on this. */
const WALLET_RETRY_DELAY_MS = 250

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Read the Insight reserve, with a bounded retry.
 *
 * The retry exists because this read became load-bearing: it decides whether a
 * stake is compulsory, so "we could not read it" may not quietly collapse into
 * "you have nothing". A malformed payload is not retried — it will not fix
 * itself — and a missing function reports `absent` on the first look.
 */
export async function fetchInsightWallet(): Promise<WalletRead> {
  for (let attempt = 1; attempt <= WALLET_READ_ATTEMPTS; attempt += 1) {
    const { data, error } = await supabase.rpc('insight_wallet')

    if (error) {
      if (ABSENT_CODES.has(error.code ?? '')) {
        console.error(`[wager:${error.code}] economy not deployed — ${error.message}`)
        return { status: 'absent' }
      }
      console.error(
        `[wager:${error.code}] wallet read failed (attempt ${attempt}/${WALLET_READ_ATTEMPTS}) — ${error.message}`,
      )
      if (attempt < WALLET_READ_ATTEMPTS) {
        await wait(WALLET_RETRY_DELAY_MS * attempt)
        continue
      }
      return { status: 'failed' }
    }

    const parsed = walletSchema.safeParse(data)
    if (!parsed.success) {
      // Not retried: a shape that is wrong once is wrong every time.
      console.error('[wager:malformed] wallet payload —', parsed.error.issues)
      return { status: 'failed' }
    }

    return { status: 'ok', wallet: parsed.data }
  }

  return { status: 'failed' }
}

const acceptedSchema = z.object({
  accepted: z.literal(true),
  wager_id: z.string(),
  stake: z.coerce.number().int(),
  balance: z.coerce.number().int(),
})

const rejectedSchema = z.object({
  accepted: z.literal(false),
  reason: z.enum([
    'invalid_stake',
    'insufficient_balance',
    'not_your_session',
    'already_resolved',
  ]),
})

export type PlaceWagerResult =
  | { status: 'locked'; wager: LockedWager }
  | { status: 'rejected'; reason: string }

/**
 * Lock a stake before the decision is recorded.
 *
 * Deliberately keyed on the session and scenario rather than on an attempt: an
 * attempt row already carries the chosen answer, so a wager placed against one
 * would be a wager placed after the fact.
 */
export async function placeWager(
  sessionId: string,
  scenarioId: string,
  stake: number,
): Promise<PlaceWagerResult> {
  const { data, error } = await supabase.rpc('place_wager', {
    p_session_id: sessionId,
    p_scenario_id: scenarioId,
    p_stake: stake,
  })

  if (error) {
    console.error(`[wager:${error.code}] place failed — ${error.message}`)
    return { status: 'rejected', reason: 'unavailable' }
  }

  const accepted = acceptedSchema.safeParse(data)
  if (accepted.success) {
    return {
      status: 'locked',
      wager: { wagerId: accepted.data.wager_id, stake: accepted.data.stake },
    }
  }

  const rejected = rejectedSchema.safeParse(data)
  if (rejected.success) return { status: 'rejected', reason: rejected.data.reason }

  console.error('[wager:malformed] place payload —', accepted.error.issues)
  return { status: 'rejected', reason: 'unavailable' }
}

/** The `wager` key on an award payload, when the award resolved a stake. */
export const wagerOutcomeSchema = z
  .object({
    wager_id: z.string(),
    stake: z.coerce.number().int(),
    was_correct: z.boolean(),
    delta: z.coerce.number().int(),
    balance_before: z.coerce.number().int(),
    balance_after: z.coerce.number().int(),
  })
  .transform(
    (row): WagerOutcome => ({
      wagerId: row.wager_id,
      stake: row.stake,
      wasCorrect: row.was_correct,
      delta: row.delta,
      balanceBefore: row.balance_before,
      balanceAfter: row.balance_after,
    }),
  )
