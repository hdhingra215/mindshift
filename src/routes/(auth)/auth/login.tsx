import { createFileRoute } from '@tanstack/react-router'

function LoginPage() {
  return (
    <section className="flex min-h-dvh flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-2xl font-semibold text-foreground">Log in</h1>
      <p className="text-sm text-muted-foreground">Placeholder — coming soon.</p>
    </section>
  )
}

export const Route = createFileRoute('/(auth)/auth/login')({
  component: LoginPage,
})
