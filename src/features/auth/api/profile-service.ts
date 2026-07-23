import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

/**
 * Profile bootstrap.
 *
 * Ensures a `profiles` row exists for a freshly-authenticated user. Runs on
 * sign-in and on initial session (idempotent), so a user whose first attempt
 * failed gets a profile on their next visit.
 *
 * Idempotency + no duplicates: an upsert with `ignoreDuplicates` compiles to
 * INSERT ... ON CONFLICT (id) DO NOTHING. It never overwrites an existing
 * profile (so a chosen display name is safe) and never creates a second row.
 * Column defaults in the schema (theme, locale, notification_prefs, is_public)
 * populate the rest. RLS `profiles_insert_own` permits this (id = auth.uid()).
 */

function deriveDisplayName(user: User): string {
  const metaName = user.user_metadata?.display_name
  if (typeof metaName === 'string' && metaName.trim().length > 0) {
    return metaName.trim()
  }
  const localPart = user.email?.split('@')[0]
  return localPart && localPart.length > 0 ? localPart : 'Thinker'
}

export async function ensureProfile(user: User): Promise<void> {
  const displayName = deriveDisplayName(user)

  // One retry to ride out a transient network/RLS hiccup; non-fatal either way
  // (the row can be created on a later sign-in).
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { error } = await supabase
      .from('profiles')
      .upsert(
        { id: user.id, display_name: displayName },
        { onConflict: 'id', ignoreDuplicates: true },
      )

    if (!error) return

    if (attempt === 1) {
      // Swallow: never block the player on a bootstrap failure. Surfaced to the
      // console for observability; a later sign-in retries automatically.
      console.error('[auth] profile bootstrap failed:', error.message)
    }
  }
}
