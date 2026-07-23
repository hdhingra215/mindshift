import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { AuthContext } from '../context/auth-context'
import { ensureProfile } from '../api/profile-service'
import {
  requestPasswordReset,
  resendVerification,
  signIn,
  signOut,
  signUp,
  updatePassword,
} from '../api/auth-service'
import type { AuthContextValue, AuthStatus, SignUpInput } from '../types'

type AuthProviderProps = {
  children: ReactNode
}

/**
 * Auth provider — the single source of truth for session state.
 *
 * Subscribes to Supabase auth changes for the whole app lifetime:
 * - Session persistence + auto-refresh are handled by the Supabase client
 *   (configured in lib/supabase/client). This provider only mirrors state.
 * - `onAuthStateChange` fires INITIAL_SESSION on load and on every sign-in /
 *   sign-out / token refresh — including sign-outs triggered in OTHER TABS,
 *   which keeps every open tab in sync.
 * - Profile bootstrap runs on the first real session (idempotent).
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>('initializing')
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      setStatus(nextSession ? 'authenticated' : 'unauthenticated')

      // Bootstrap the profile once a real session is present. INITIAL_SESSION
      // covers returning users; SIGNED_IN covers fresh logins/verifications.
      if (
        (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') &&
        nextSession?.user
      ) {
        void ensureProfile(nextSession.user)
      }
    })

    return () => {
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      signIn,
      signUp: (input: SignUpInput) => signUp(input),
      signOut,
      requestPasswordReset,
      updatePassword,
      resendVerification,
    }),
    [status, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
