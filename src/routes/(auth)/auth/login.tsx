import { createFileRoute, Link } from '@tanstack/react-router'
import { AuthShell, LoginForm, redirectIfAuthenticated } from '@/features/auth'

type LoginSearch = {
  redirect?: string
}

function LoginPage() {
  const { redirect } = Route.useSearch()

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
      <LoginForm redirectTo={redirect} />
    </AuthShell>
  )
}

export const Route = createFileRoute('/(auth)/auth/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  beforeLoad: ({ context }) => redirectIfAuthenticated(context.auth),
  component: LoginPage,
})
