import { Volume2, VolumeX } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

import { autoplayStance, toggleMuted, useAudioMix } from '@/lib/audio'
import { signal } from '@/lib/feedback'
import { cn } from '@/lib/utils'

type SoundToggleProps = {
  className?: string
}

/**
 * The mute control.
 *
 * Deliberately in the top bar rather than buried in settings: audio that cannot
 * be silenced from wherever you are hearing it is a dark pattern, and a player
 * whose room fills up unexpectedly should not have to navigate to fix it. The
 * fuller mix — master, effects, ambience — lives on `/settings`.
 *
 * It also tells the truth when the browser is holding the room back. Autoplay
 * policy means an unmuted first visit is frequently still silent until the
 * player touches something, and a speaker icon that looks "on" while nothing
 * plays reads as a bug. The label says *waiting*, so the state is legible
 * rather than mysterious.
 *
 * Accessibility. A real toggle button carrying its state in `aria-pressed`, its
 * meaning in an accessible name that says what pressing it *will do*, and the
 * icon as a third, redundant channel. Nothing about the control depends on
 * hearing it — and nothing in the product depends on the control.
 */
export function SoundToggle({ className }: SoundToggleProps) {
  const mix = useAudioMix()
  const muted = mix.muted

  /*
   * Whether the browser has actually let the room start. Sampled once after
   * mount and again on the first interaction — the only two moments it can
   * change — rather than polled, because this is a label, not a state machine.
   */
  const [held, setHeld] = useState(false)

  useEffect(() => {
    const check = () => setHeld(autoplayStance() === 'blocked')
    check()
    window.addEventListener('pointerdown', check, { once: true, passive: true })
    return () => window.removeEventListener('pointerdown', check)
  }, [])

  const label = muted
    ? 'Turn sound on'
    : held
      ? 'Sound is on — your browser starts it at your first tap'
      : 'Turn sound off'

  return (
    <Button
      aria-pressed={muted}
      className={cn('text-muted-foreground hover:text-foreground', className)}
      onClick={() => {
        const next = toggleMuted()
        // Unmuting is confirmed by the world arriving. Muting confirms itself.
        if (!next.muted) signal('surface.reveal')
      }}
      size="icon-sm"
      // No `moment`: the toggle's own answer is the feedback, and a press
      // followed by a reveal would be two sounds for one action.
      title={label}
      type="button"
      variant="ghost"
    >
      {muted ? (
        <VolumeX aria-hidden="true" className="size-4" />
      ) : (
        <Volume2 aria-hidden="true" className="size-4" />
      )}
      <span className="sr-only">{label}</span>
    </Button>
  )
}
