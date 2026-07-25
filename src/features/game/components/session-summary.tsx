import { Link } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

type SessionSummaryProps = {
  completedCount: number
  onPlayAgain: () => void
}

/** Calm, elegant end-of-session moment — reps framed as growth, no confetti. */
export function SessionSummary({ completedCount, onPlayAgain }: SessionSummaryProps) {
  const played = completedCount > 0
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/12 text-primary">
        <Sparkles className="size-6" aria-hidden="true" />
      </span>
      <div className="space-y-1.5">
        <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
          Session complete.
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {played
            ? `${completedCount} ${completedCount === 1 ? 'scenario' : 'scenarios'} down. Every rep sharpens the reflex — not intensity, consistency.`
            : 'No scenarios this time — that’s fine. Come back whenever you’ve got a spare minute.'}
        </p>
      </div>
      <div className="flex w-full flex-col-reverse gap-3 sm:w-auto sm:flex-row">
        {played ? (
          <Button variant="outline" size="lg" onClick={onPlayAgain}>
            Play again
          </Button>
        ) : null}
        <Button asChild size="lg">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
