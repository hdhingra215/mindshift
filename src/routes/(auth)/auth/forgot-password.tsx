import { createFileRoute, Link } from '@tanstack/react-router'
import { AuthShell, ForgotPasswordForm, redirectIfAuthenticated } from '@/features/auth'

function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot your password?"
      description="It happens. Enter your email and we’ll send a link to set a new one — no harm done."
      footer={
        <>
          Remembered it?{' '}
          <Link
            to="/auth/login"
            className="rounded-md font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Back to login
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  )
}

export const Route = createFileRoute('/(auth)/auth/forgot-password')({
  beforeLoad: ({ context }) => redirectIfAuthenticated(context.auth),
  component: ForgotPasswordPage,
})
