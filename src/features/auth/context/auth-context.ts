import { createContext } from 'react'
import type { AuthContextValue } from '../types'

/**
 * Auth context. Undefined outside the provider so `useAuth` can fail loudly
 * (a misuse bug) rather than silently returning a stale null.
 */
export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
