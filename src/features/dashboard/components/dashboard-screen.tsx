import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth'
import { toUserIdentity } from '@/components/layout/user-identity'

import { useObservatory } from '../hooks/use-observatory'
import { ObservatoryScene } from './observatory-scene'

/** Time-aware greeting. Warm, varied by hour, never guilt-based. */
function timeGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 5) return 'Late'
  if (hour < 12) return 'Morning'
  if (hour < 18) return 'Afternoon'
  return 'Evening'
}

/**
 * Dashboard orchestrator.
 *
 * A thin switch over the three load states, so the scene itself never has to
 * know about loading or failure. The waiting state deliberately draws the
 * *empty instrument* rather than skeleton bars: the player should see the field
 * they are about to look at, dark and settling, instead of grey rectangles
 * pretending to be content that has not arrived.
 */
export function DashboardScreen() {
  const { user } = useAuth()
  const { displayName } = toUserIdentity(user)
  const observatory = useObservatory()

  if (observatory.status === 'ready') {
    return (
      <ObservatoryScene
        displayName={displayName}
        greeting={timeGreeting()}
        scene={observatory.scene}
      />
    )
  }

  if (observatory.status === 'failed') {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-4 py-16 text-center">
        <p className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
          Instrument offline
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">{observatory.message}</p>
        <Button onClick={observatory.retry} size="lg" variant="outline">
          Try again
        </Button>
      </div>
    )
  }

  return <ObservatoryPlaceholder greeting={timeGreeting()} />
}

/**
 * The instrument before it has readings.
 *
 * The same geometry as the real thing — rings and a dim core — so arriving does
 * not cause a layout jump when the data lands. It reads as an instrument warming
 * up, which is honest and on-brand: the game is thinking, not spinning
 * (InteractionPrinciples §10).
 */
function ObservatoryPlaceholder({ greeting }: { greeting: string }) {
  return (
    <div className="flex flex-col items-center gap-10 py-4">
      <p className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
        {greeting} · calibrating
      </p>

      <div
        aria-hidden="true"
        className="relative mx-auto aspect-square w-full max-w-[30rem]"
        style={{ ['--orbit-radius' as string]: 'clamp(7.5rem, 34vw, 13rem)' }}
      >
        {[0.44, 0.72, 1].map((ring) => (
          <span
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/20"
            key={ring}
            style={{
              width: `calc(var(--orbit-radius) * ${ring * 2})`,
              height: `calc(var(--orbit-radius) * ${ring * 2})`,
            }}
          />
        ))}
        <span className="absolute top-1/2 left-1/2 size-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/10 blur-xl" />
      </div>

      <p className="sr-only" role="status">
        Loading your observatory.
      </p>
    </div>
  )
}
