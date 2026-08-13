import { PHRASE, useSignalOnMount } from '@/lib/feedback'
import { cn } from '@/lib/utils'

import { MasteryMeter } from './mastery-meter'
import type { MasteryAward } from '../types'

type MasteryRevealProps = {
  awards: readonly MasteryAward[]
  className?: string
}

/**
 * What the scenario just taught, per bias.
 *
 * Sits on the reveal beneath the explanation: no modal, no interruption, no
 * dismissal. The player reads why they were caught, then sees the needle move
 * on exactly the thing they were caught by.
 *
 * Renders nothing at all when there is nothing to show — an empty progression
 * panel would be worse than its absence.
 */
export function MasteryReveal({ awards, className }: MasteryRevealProps) {
  // Fourth in the phrase — the bell, because mastery is the metric the player
  // is actually here for. Held even when there is nothing to show, since a hook
  // cannot sit behind a return; the cue itself is what gets skipped.
  useSignalOnMount('reward.mastery', { delayMs: PHRASE.fourth, enabled: awards.length > 0 })

  if (awards.length === 0) return null

  return (
    <section
      aria-label="Bias mastery"
      className={cn(
        'mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-xl border border-border bg-card/60 p-4 sm:p-5',
        className,
      )}
    >
      <h3 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        Mastery
      </h3>

      {awards.map((award) => (
        <MasteryMeter award={award} key={award.biasId} />
      ))}
    </section>
  )
}
