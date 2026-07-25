import type { User } from '@supabase/supabase-js'

/** Presentational identity derived from the auth user, with safe fallbacks. */
export type UserIdentity = {
  displayName: string
  email: string
  avatarUrl: string | null
  initials: string
}

function computeInitials(source: string): string {
  const parts = source.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase()
  }
  return `${parts[0]![0]!}${parts[parts.length - 1]![0]!}`.toUpperCase()
}

/**
 * Derive display fields from the Supabase user. Prefers the signup display
 * name, falls back to the email local part, then a friendly default — the UI
 * never shows a blank name or a raw "null".
 */
export function toUserIdentity(user: User | null): UserIdentity {
  const email = user?.email ?? ''
  const metaName = user?.user_metadata?.display_name
  const displayName =
    typeof metaName === 'string' && metaName.trim().length > 0
      ? metaName.trim()
      : (email.split('@')[0] || 'Thinker')

  const metaAvatar = user?.user_metadata?.avatar_url
  const avatarUrl =
    typeof metaAvatar === 'string' && metaAvatar.length > 0 ? metaAvatar : null

  return {
    displayName,
    email,
    avatarUrl,
    initials: computeInitials(displayName || email || 'Thinker'),
  }
}
