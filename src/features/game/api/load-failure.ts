import type { PostgrestError } from '@supabase/supabase-js'

import type { GameLoadFailure, GameLoadFailureKind } from '../types'

/**
 * Failure classification for gameplay reads.
 *
 * Two audiences, one object. The player gets a calm sentence that never blames
 * them and always points forward (InteractionPrinciples §6); the engineer gets
 * the code, the constraint, the parse issue. They are separate fields precisely
 * so neither can leak into the other's channel.
 *
 * The distinction that matters most is between a *defect* and an empty content
 * library. An exhausted library is not a failure and never reaches this module.
 */

/** Player-facing copy per failure class. One voice, register shifted per case. */
const MESSAGES: Record<GameLoadFailureKind, string> = {
  queryFailed:
    'We couldn’t reach your next scenario — the connection may have wavered. Nothing’s lost. Try again?',
  permissionDenied:
    'You’ve been away a while, so we tucked your session away for safety. Sign back in and you’re right where you left off.',
  malformedData:
    'This scenario didn’t come through cleanly. That’s on us — we’ve logged it. Try again and we’ll find you another.',
  unplayableData:
    'That scenario came back missing a few of its pieces. Our fault, and noted — let’s get you a different one.',
}

/**
 * PostgREST / Postgres codes that mean "not allowed", not "broken".
 *
 * `42501` is Postgres' insufficient_privilege; `PGRST301` is an expired or
 * unusable JWT. Both mean the read was refused rather than failed, and both are
 * recoverable by signing in again — which is a very different instruction to
 * give a player than "try again".
 */
const PERMISSION_CODES = new Set(['42501', 'PGRST301', 'PGRST302'])

export function loadFailure(kind: GameLoadFailureKind, detail: string): GameLoadFailure {
  return { kind, message: MESSAGES[kind], detail }
}

/** Classify a failed Supabase read into a permission problem or a query problem. */
export function classifyQueryError(error: PostgrestError): GameLoadFailure {
  const kind: GameLoadFailureKind = PERMISSION_CODES.has(error.code)
    ? 'permissionDenied'
    : 'queryFailed'

  const detail = [error.code, error.message, error.details, error.hint]
    .filter((part): part is string => Boolean(part))
    .join(' · ')

  return loadFailure(kind, detail)
}

/**
 * Record a failure for whoever has to debug it.
 *
 * Centralised so every gameplay defect is logged in one recognisable format
 * with its class attached, rather than as scattered ad-hoc `console.error`
 * calls that read as noise. This is the seam a real error reporter replaces.
 */
export function reportLoadFailure(context: string, failure: GameLoadFailure): void {
  console.error(`[game:${failure.kind}] ${context} — ${failure.detail}`)
}
