import { createFileRoute, Link } from '@tanstack/react-router'
import { Brain, Target, TrendingUp, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/shared/logo'
import { useAuth } from '@/features/auth'

const VALUE_PROPS = [
  {
    icon: Brain,
    title: 'Learn by doing',
    body: 'Discover biases by falling into them, then understanding why — not by reading a lecture.',
  },
  {
    icon: Target,
    title: 'Realistic decisions',
    body: 'Scenarios pulled from money, work, relationships, and digital life. This could be you.',
  },
  {
    icon: TrendingUp,
    title: 'See yourself sharpen',
    body: 'XP, mastery, and a bias map that quietly proves your judgment is improving.',
  },
] as const

function LandingPage() {
  const { status } = useAuth()
  const isAuthed = status === 'authenticated'

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <span className="group/logo">
          <Logo className="text-lg" />
        </span>
        <nav className="flex items-center gap-1">
          {isAuthed ? (
            <Button asChild size="lg">
              <Link to="/dashboard">
                Continue
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="lg">
                <Link to="/auth/login">Log in</Link>
              </Button>
              <Button asChild size="lg">
                <Link to="/auth/signup">Get started</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6">
        <section className="flex flex-col items-center gap-6 py-16 text-center sm:py-24">
          <p className="animate-in fade-in text-sm font-medium tracking-wide text-primary duration-500">
            Cognitive training, made playable
          </p>
          <h1 className="max-w-2xl animate-in fade-in slide-in-from-bottom-2 font-heading text-4xl font-bold tracking-tight text-balance text-foreground duration-700 sm:text-5xl">
            Outsmart your own brain.
          </h1>
          <p className="max-w-xl animate-in fade-in slide-in-from-bottom-2 text-lg leading-relaxed text-pretty text-muted-foreground duration-700">
            MindShift turns the science of cognitive bias into a game you actually want
            to play. Face realistic decisions, fall into the traps almost everyone does,
            and train the reflex to catch them — in minutes a day.
          </p>
          <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to={isAuthed ? '/dashboard' : '/auth/signup'}>
                {isAuthed ? 'Continue training' : 'Start training'}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            {!isAuthed ? (
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link to="/auth/login">I already have an account</Link>
              </Button>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            Free to start · No card needed · Your first insight in about two minutes
          </p>
        </section>

        <section aria-label="Why MindShift" className="grid gap-4 pb-20 sm:grid-cols-3">
          {VALUE_PROPS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/12 text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h2 className="font-heading text-base font-semibold text-foreground">
                {title}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-2 border-t border-border px-6 py-6 text-sm text-muted-foreground sm:flex-row">
        <Logo showMark={false} className="text-sm text-muted-foreground" />
        <p>Better thinking, one decision at a time.</p>
      </footer>
    </div>
  )
}

export const Route = createFileRoute('/')({
  component: LandingPage,
})
