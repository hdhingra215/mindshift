import type { Session, User } from '@supabase/supabase-js'

/**
 * Auth lifecycle status.
 * - `initializing` — restoring the session on first load (nothing decided yet).
 * - `authenticated` — a valid session exists.
 * - `unauthenticated` — no session.
 */
export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated'

/** Normalized result of an auth action — no throwing for expected failures. */
export type AuthResult = {
  error: string | null
}

/** Sign-up also reports whether email verification is still required. */
export type SignUpResult = AuthResult & {
  needsVerification: boolean
}

export type SignUpInput = {
  email: string
  password: string
  displayName: string
}

export type AuthContextValue = {
  status: AuthStatus
  user: User | null
  session: Session | null
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (input: SignUpInput) => Promise<SignUpResult>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<AuthResult>
  updatePassword: (password: string) => Promise<AuthResult>
  resendVerification: (email: string) => Promise<AuthResult>
}
