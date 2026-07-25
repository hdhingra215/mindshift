import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Compass, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Rotating "the game is thinking" loader (InteractionPrinciples §5). */
export function GameLoading({ messages }: { messages: readonly string[] }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (messages.length <= 1) return
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % messages.length),
      2200,
    )
    return () => window.clearInterval(id)
  }, [messages.length])

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 text-center"
    >
      <span className="size-1.5 animate-pulse rounded-full bg-primary" aria-hidden="true" />
      <p
        key={index}
        className="animate-in fade-in text-sm text-muted-foreground duration-500"
      >
        {messages[index]}
      </p>
    </div>
  )
}

/** No new scenarios available (empty state, InteractionPrinciples §4). */
export function GameEmpty({
  completedCount,
  onFinish,
}: {
  completedCount: number
  onFinish: () => void
}) {
  const playedSome = completedCount > 0

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-5 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/12 text-primary">
        <Compass className="size-6" aria-hidden="true" />
      </span>
      <div className="space-y-1.5">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          {playedSome ? 'You’ve cleared them all — for now.' : 'Nothing to play yet.'}
        </h2>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          {playedSome
            ? 'You worked through every scenario available this session — genuinely impressive. New ones are always in the works.'
            : 'No published scenarios are available right now. Check back shortly — fresh challenges are on the way.'}
        </p>
      </div>
      {playedSome ? (
        <Button size="lg" onClick={onFinish}>
          Wrap up this session
        </Button>
      ) : (
        <Button asChild size="lg" variant="outline">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      )}
    </div>
  )
}

/** Calm, blame-free load error (InteractionPrinciples §6). */
export function GameError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div
      role="alert"
      className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 text-center"
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-5" aria-hidden="true" />
      </span>
      <div className="space-y-1.5">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Couldn’t load the game
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      </div>
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}
