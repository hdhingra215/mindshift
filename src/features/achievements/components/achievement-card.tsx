import type { CSSProperties } from 'react'

import { cn } from '@/lib/utils'

import { resolveAchievementIcon } from '../lib/achievement-icons'
import type { AchievementUnlock } from '../types'

type AchievementCardProps = {
  achievement: AchievementUnlock
  /**
   * `reveal` is the moment it is earned — lit, with the eyebrow that names what
   * happened. `listed` is the calmer form used in a history, where the same
   * achievement should read as a record rather than an event.
   */
  variant?: 'reveal' | 'listed'
  className?: string
}

/**
 * One achievement, as a card.
 *
 * The visual reference is a trophy plate, not a mobile-game popup: a lit
 * medallion, a name set with confidence, and the sentence explaining *why this
 * reflects real growth* (InteractionPrinciples §7 — recognition from a mentor,
 * never a pop-up prize). Restraint is what makes it read as premium; the moment
 * is carried by light and typography rather than by motion or size.
 *
 * Brand purple, because an achievement is a genuine milestone and that is the
 * one thing brand purple is for. XP stays in reward orange — it is a different
 * system and keeps its own colour (DesignSystem §1).
 *
 * Presentational and stateless, so the reveal toast and the session history
 * render the identical object and cannot drift apart.
 */
export function AchievementCard({
  achievement,
  variant = 'reveal',
  className,
}: AchievementCardProps) {
  const Icon = resolveAchievementIcon(achievement.icon)
  const isReveal = variant === 'reveal'

  return (
    <article
      className={cn(
        'flex items-start gap-4 rounded-xl border p-4',
        isReveal
          ? 'border-brand/35 bg-elevated/95 depth-overlay sheen-top glow-soft backdrop-blur-md'
          : 'border-border bg-card/60',
        className,
      )}
      style={isReveal ? ({ '--glow-color': 'var(--brand)' } as CSSProperties) : undefined}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full border',
          isReveal
            ? 'border-brand/45 bg-brand/12 text-brand'
            : 'border-border bg-background text-muted-foreground',
        )}
      >
        <Icon className="size-5" />
      </span>

      <div className="flex min-w-0 flex-col gap-1">
        {isReveal ? (
          <p className="text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">
            Achievement unlocked
          </p>
        ) : null}

        <h3
          className={cn(
            'font-heading font-semibold tracking-tight text-foreground',
            isReveal ? 'text-base' : 'text-sm',
          )}
        >
          {achievement.name}
        </h3>

        {achievement.description ? (
          <p className="text-xs leading-relaxed text-pretty text-muted-foreground">
            {achievement.description}
          </p>
        ) : null}

        {achievement.xpReward > 0 ? (
          <p className="mt-0.5 text-xs font-medium tabular-nums text-reward">
            +{achievement.xpReward} XP
          </p>
        ) : null}
      </div>
    </article>
  )
}
