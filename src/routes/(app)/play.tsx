import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '@/features/auth'

function PlayPage() {
  return (
    <section className="flex min-h-dvh flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="font-heading text-2xl font-semibold text-foreground">Play</h1>
      <p className="text-sm text-muted-foreground">The scenario loop arrives in the next phase.</p>
    </section>
  )
}

export const Route = createFileRoute('/(app)/play')({
  beforeLoad: ({ context, location }) => requireAuth(context.auth, location.href),
  component: PlayPage,
})
