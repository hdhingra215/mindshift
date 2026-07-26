import { cn } from '@/lib/utils'

import { AchievementCard } from './achievement-card'
import type { AchievementUnlock } from '../types'

type AchievementHistoryProps = {
  achievements: readonly AchievementUnlock[]
  /** Heading for the group. The caller owns the framing. */
  title?: string
  className?: string
}

/**
 * A list of achievements already earned.
 *
 * Built to be reused: the session summary passes the unlocks from this sitting,
 * and the profile's trophy case will pass the player's whole history to the same
 * component. The unlock moment is brief and skippable precisely because this
 * exists — anything missed in the corner is reviewable here, calmly
 * (InteractionPrinciples §7).
 *
 * Renders nothing when empty. An empty trophy case belongs to the profile, where
 * it can be given a proper empty state that teaches and points forward (§4); a
 * blank panel bolted onto a session summary would just be noise.
 */
export function AchievementHistory({
  achievements,
  title = 'Earned this session',
  className,
}: AchievementHistoryProps) {
  if (achievements.length === 0) return null

  return (
    <section aria-label={title} className={cn('flex w-full flex-col gap-3', className)}>
      <h3 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {title}
      </h3>

      <ul className="flex flex-col gap-2">
        {achievements.map((achievement) => (
          <li key={achievement.achievementId}>
            <AchievementCard achievement={achievement} variant="listed" />
          </li>
        ))}
      </ul>
    </section>
  )
}
