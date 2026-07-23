import { useContext } from 'react'
import { AuthContext } from '../context/auth-context'
import type { AuthContextValue } from '../types'

/** Access the auth state and actions. Throws if used outside <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within <AuthProvider>.')
  }
  return context
}
