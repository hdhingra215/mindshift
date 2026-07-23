import { AuthError } from '@supabase/supabase-js'

/**
 * Translate raw Supabase/network errors into calm, human messages
 * (InteractionPrinciples §6): never robotic, never blaming, always a way
 * forward. We match on Supabase's stable error `code` first, then fall back
 * to message heuristics, then to a gentle generic line.
 */
export function toFriendlyAuthError(error: unknown): string {
  // Network / fetch failures surface as TypeError before reaching Supabase.
  if (
    error instanceof TypeError ||
    (error instanceof Error && /fetch|network/i.test(error.message))
  ) {
    return 'That didn’t go through — looks like the connection wavered. Your progress is safe. Try again?'
  }

  if (error instanceof AuthError) {
    switch (error.code) {
      case 'invalid_credentials':
        return 'That email and password didn’t match. Happens to everyone — try again, or reset your password.'
      case 'email_not_confirmed':
        return 'Almost there — confirm your email first. Check your inbox for the link (or resend it below).'
      case 'user_already_exists':
      case 'email_exists':
        return 'Looks like there’s already an account with that email. Try logging in instead.'
      case 'weak_password':
        return 'That password is a little light — add a few more characters to strengthen it.'
      case 'over_email_send_rate_limit':
      case 'over_request_rate_limit':
        return 'Give it a moment — we’re catching up with you. Try again shortly.'
      case 'same_password':
        return 'That’s the password you already have — choose a new one to continue.'
      case 'session_not_found':
      case 'session_expired':
        return 'This link has expired for safety. Request a fresh one and you’ll be right back.'
      default:
        break
    }

    // Message fallbacks for older/edge error shapes without a code.
    if (/already registered|already exists/i.test(error.message)) {
      return 'Looks like there’s already an account with that email. Try logging in instead.'
    }
    if (/invalid login credentials/i.test(error.message)) {
      return 'That email and password didn’t match. Happens to everyone — try again, or reset your password.'
    }
  }

  return 'Something slipped on our end. Your progress is safe — give it another go in a moment.'
}
