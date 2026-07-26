import { useEffect, useRef } from 'react'
import { CircleDashed, Eye, ShieldCheck, Sparkles, Target, type LucideIcon } from 'lucide-react'

import { ANIME_EASE, DURATION, animate, prefersReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'

import {
  describeNoGain,
  formatMastery,
  formatMasteryDelta,
  getMasteryProgress,
  getMasteryTier,
  hasTierChanged,
} from '../lib/mastery'
import type { MasteryAward, MasteryTierId } from '../types'

/** Tier icon components, keyed by the icon name each tier declares. */
const TIER_ICONS: Record<MasteryTierId, LucideIcon> = {
  unfamiliar: CircleDashed,
  aware: Eye,
  practiced: Target,
  skilled: ShieldCheck,
  mastered: Sparkles,
}

type MasteryMeterProps = {
  award: MasteryAward
  className?: string
}

/**
 * One bias, one meter.
 *
 * The quiet counterpart to the XP strip. XP is a number that went up; this is
 * the thing the player actually came for, so it gets the clearer typography and
 * none of the sparkle. A bar that moves two percent and then stops is the
 * honest picture of learning, and the interface should not dress it up
 * (InteractionPrinciples §7 — reward proportionately, no spectacle).
 *
 * The fill animates from where it sat before this attempt to where it sits now,
 * so the gain is *seen* rather than read. That travel is the entire animation
 * budget for this component.
 *
 * A faint marker shows the current ceiling. When the fill reaches it, the copy
 * explains that more repetition will not help — which turns a stalled bar from
 * a bug into a lesson about how mastery is earned.
 */
export function MasteryMeter({ award, className }: MasteryMeterProps) {
  const fillRef = useRef<HTMLDivElement>(null)
  const tier = getMasteryTier(award.masteryLevel)
  const progress = getMasteryProgress(award)
  const gain = formatMasteryDelta(award.delta)
  const TierIcon = TIER_ICONS[tier.id]

  const toPercent = `${progress.fraction * 100}%`
  const fromPercent = `${progress.previousFraction * 100}%`

  useEffect(() => {
    const fill = fillRef.current
    if (!fill) return

    // Reduced motion still gets the truth, just without the travel. The width
    // is written directly rather than animated over a single frame, because
    // there is nothing here that a completion callback depends on.
    if (prefersReducedMotion()) {
      fill.style.width = toPercent
      return
    }

    const animation = animate(fill, {
      width: [fromPercent, toPercent],
      duration: DURATION.celebrate,
      ease: ANIME_EASE.enter,
    })

    return () => {
      animation.revert()
    }
  }, [fromPercent, toPercent])

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-medium text-foreground">{award.biasName}</p>
        <p className={cn('flex items-center gap-1.5 text-xs font-medium', tier.toneClass)}>
          <TierIcon aria-hidden="true" className="size-3.5" />
          {tier.label}
          <span className="text-muted-foreground tabular-nums">
            · {formatMastery(award.masteryLevel)}
          </span>
        </p>
      </div>

      {/*
       * Decorative: every value it encodes is stated in text above and below it,
       * so a screen reader loses nothing by skipping the geometry.
       */}
      <div
        aria-hidden="true"
        className="relative h-1.5 w-full overflow-hidden rounded-full bg-border"
      >
        <div
          className={cn('h-full rounded-full', tier.fillClass)}
          ref={fillRef}
          style={{ width: fromPercent }}
        />
        {progress.ceilingFraction < 1 ? (
          <span
            className="absolute inset-y-0 w-px bg-foreground/25"
            style={{ left: `${progress.ceilingFraction * 100}%` }}
          />
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        {gain ? (
          <>
            <span className={cn('font-medium tabular-nums', tier.toneClass)}>{gain}</span>{' '}
            mastery
            {hasTierChanged(award) ? <> · now {tier.label.toLowerCase()}</> : null}
          </>
        ) : (
          describeNoGain(award)
        )}
      </p>
    </div>
  )
}
