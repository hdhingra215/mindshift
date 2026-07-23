import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '@/features/auth'

function ProfilePage() {
  return (
    <section className="flex min-h-dvh flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="font-heading text-2xl font-semibold text-foreground">Profile</h1>
      <p className="text-sm text-muted-foreground">Your growth story lives here — coming soon.</p>
    </section>
  )
}

export const Route = createFileRoute('/(app)/profile')({
  beforeLoad: ({ context, location }) => requireAuth(context.auth, location.href),
  component: ProfilePage,
})
