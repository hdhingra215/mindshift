/**
 * Auth feature public API. Import auth only through this barrel.
 */
export { AuthProvider } from './providers/auth-provider'
export { useAuth } from './hooks/use-auth'
export { requireAuth, redirectIfAuthenticated } from './lib/route-guards'
export { toFriendlyOAuthError } from './lib/auth-errors'
export {
  OAUTH_PROVIDER_LABELS,
  OAUTH_PROVIDER_ORDER,
} from './lib/oauth-providers'

export { AuthLoadingScreen } from './components/auth-loading-screen'
export { AuthShell } from './components/auth-shell'
export { LoginForm } from './components/login-form'
export { OAuthProviderButtons } from './components/oauth-provider-buttons'
export { SignupForm } from './components/signup-form'
export { ForgotPasswordForm } from './components/forgot-password-form'
export { ResetPasswordForm } from './components/reset-password-form'
export { VerifyEmailNotice } from './components/verify-email-notice'

export type { OAuthProvider } from './lib/oauth-providers'
export type {
  AuthContextValue,
  AuthStatus,
  AuthResult,
  SignUpInput,
  SignUpResult,
} from './types'
