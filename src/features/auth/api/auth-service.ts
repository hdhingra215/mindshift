import { supabase } from '@/lib/supabase/client'
import { toFriendlyAuthError } from '../lib/auth-errors'
import { callbackUrl } from '../lib/redirects'
import type { AuthResult, SignUpInput, SignUpResult } from '../types'

/**
 * Thin, normalized wrappers over Supabase Auth.
 *
 * Every function returns a friendly, non-throwing result for expected failures
 * (bad credentials, duplicate signup, rate limits, network). Session changes
 * propagate through `onAuthStateChange` in the AuthProvider — these functions
 * never manage React state themselves.
 *
 * Security: uses only the public anon client (RLS-gated). No service key.
 */

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return { error: error ? toFriendlyAuthError(error) : null }
}

export async function signUp({
  email,
  password,
  displayName,
}: SignUpInput): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: callbackUrl('/auth/verify-email'),
    },
  })

  if (error) {
    return { error: toFriendlyAuthError(error), needsVerification: false }
  }

  // No session on return → the project requires email confirmation.
  return { error: null, needsVerification: data.session === null }
}

export async function signOut(): Promise<void> {
  // Ignore errors: locally we still clear state via the auth listener, and the
  // player should never be blocked from leaving.
  await supabase.auth.signOut()
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl('/auth/reset-password'),
  })
  return { error: error ? toFriendlyAuthError(error) : null }
}

export async function updatePassword(password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.updateUser({ password })
  return { error: error ? toFriendlyAuthError(error) : null }
}

export async function resendVerification(email: string): Promise<AuthResult> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: callbackUrl('/auth/verify-email') },
  })
  return { error: error ? toFriendlyAuthError(error) : null }
}
