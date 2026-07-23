import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/shared/logo'
import { useAuth, requireAuth } from '@/features/auth'

function greetingName(displayName: unknown, email: string | undefined): string {
  if (typeof displayName === 'string' && displayName.trim().length > 0) {
    return displayName.trim()
  }
  return email?.split('@')[0] ?? 'there'
}

function DashboardPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const name = greetingName(user?.user_metadata?.display_name, user?.email)

  async function handleSignOut() {
    await signOut()
    void navigate({ to: '/' })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <Logo />
        <Button variant="ghost" size="lg" onClick={handleSignOut}>
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </Button>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          Welcome back, {name}.
        </h1>
        <p className="text-sm text-muted-foreground">
          Your training dashboard is taking shape — the core loop lands next.
        </p>
      </main>
    </div>
  )
}

export const Route = createFileRoute('/(app)/dashboard')({
  beforeLoad: ({ context, location }) => requireAuth(context.auth, location.href),
  component: DashboardPage,
})
