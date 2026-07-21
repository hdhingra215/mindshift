import { createFileRoute } from '@tanstack/react-router'

function HomePage() {
  return (
    <section className="flex min-h-dvh flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">MindShift</h1>
      <p className="text-sm text-muted-foreground">Landing placeholder — coming soon.</p>
    </section>
  )
}

export const Route = createFileRoute('/')({
  component: HomePage,
})
