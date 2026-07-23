import { createFileRoute } from '@tanstack/react-router'
import { AuthShell, ResetPasswordForm } from '@/features/auth'

/**
 * Reached via the recovery email link. The link establishes a (recovery)
 * session detected from the URL, so this route is intentionally NOT guarded
 * by redirectIfAuthenticated — the form itself handles the missing/expired
 * session case.
 */
function ResetPasswordPage() {
  return (
    <AuthShell
      title="Set a new password."
      description="Choose something you’ll remember. You’ll be signed in right after."
    >
      <ResetPasswordForm />
    </AuthShell>
  )
}

export const Route = createFileRoute('/(auth)/auth/reset-password')({
  component: ResetPasswordPage,
})
