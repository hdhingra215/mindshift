import { createFileRoute } from '@tanstack/react-router'
import { AuthShell, VerifyEmailNotice } from '@/features/auth'

type VerifyEmailSearch = {
  email?: string
}

function VerifyEmailPage() {
  const { email } = Route.useSearch()

  return (
    <AuthShell
      title="Confirm your email."
      description="One quick step and you’re in — check your inbox for a link from us."
    >
      <VerifyEmailNotice email={email} />
    </AuthShell>
  )
}

export const Route = createFileRoute('/(auth)/auth/verify-email')({
  validateSearch: (search: Record<string, unknown>): VerifyEmailSearch => ({
    email: typeof search.email === 'string' ? search.email : undefined,
  }),
  component: VerifyEmailPage,
})
