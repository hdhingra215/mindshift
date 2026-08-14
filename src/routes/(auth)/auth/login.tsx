import { createFileRoute, Link } from '@tanstack/react-router'
import {
  AuthShell,
  LoginForm,
  OAuthProviderButtons,
  redirectIfAuthenticated,
  toFriendlyOAuthError,
} from '@/features/auth'

type LoginSearch = {
  redirect?: string
  /** Provider error code appended by Supabase on a failed/cancelled callback. */
  error?: string
}

function LoginPage() {
  const { redirect, error } = Route.useSearch()

  return (
    <AuthShell
      title="Welcome back."
      description="Ready to sharpen your thinking? Pick up right where you left off."
      footer={
        <>
          New here?{' '}
          <Link
            to="/auth/signup"
            className="rounded-md font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Create an account
          </Link>
        </>
      }
    >
      <OAuthProviderButtons
        redirectTo={redirect}
        callbackError={error ? toFriendlyOAuthError(error) : undefined}
      />
      <LoginForm redirectTo={redirect} />
    </AuthShell>
  )
}

export const Route = createFileRoute('/(auth)/auth/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
    error:
      typeof search.error_code === 'string'
        ? search.error_code
        : typeof search.error === 'string'
          ? search.error
          : undefined,
  }),
  beforeLoad: ({ context, search }) => redirectIfAuthenticated(context.auth, search.redirect),
  component: LoginPage,
})
