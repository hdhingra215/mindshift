import { createFileRoute, Link } from '@tanstack/react-router'
import {
  AuthShell,
  ContinueWithGoogle,
  SignupForm,
  redirectIfAuthenticated,
} from '@/features/auth'

function SignupPage() {
  return (
    <AuthShell
      title="Start thinking sharper."
      description="A few minutes a day is all it takes. Let’s find the first trap your mind falls for."
      footer={
        <>
          Already have an account?{' '}
          <Link
            to="/auth/login"
            className="rounded-md font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Log in
          </Link>
        </>
      }
    >
      <SignupForm />
      <ContinueWithGoogle />
    </AuthShell>
  )
}

export const Route = createFileRoute('/(auth)/auth/signup')({
  beforeLoad: ({ context }) => redirectIfAuthenticated(context.auth),
  component: SignupPage,
})
