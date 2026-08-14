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

/**
 * `display_name` is what email signup writes; `full_name` / `name` are what
 * Google and GitHub put in the identity metadata. `user_name` is GitHub's
 * handle — last, because it is a login not a name, but still a better greeting
 * than the email local part for a player who never set a full name.
 * Preferring these means an OAuth player lands on a real name, not "a.dhingra".
 */
const NAME_METADATA_KEYS = [
  'display_name',
  'full_name',
  'name',
  'user_name',
] as const

function deriveDisplayName(user: User): string {
  for (const key of NAME_METADATA_KEYS) {
    const value = user.user_metadata?.[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
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
