import type { CSSProperties, ElementType, ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { TONE_VARIABLE, type GlowTone } from './tones'

type HoverGlowProps = {
  children: ReactNode
  className?: string
  as?: ElementType
  tone?: GlowTone
  /** Lift the surface on hover as well as lighting it. */
  elevate?: boolean
}

/**
 * Wraps any surface so it lights up — and optionally rises — on hover.
 *
 * The affordance layer for interactive cards: a resting card is still and flat,
 * and this is what tells you it can be acted on. Pure CSS, so it costs nothing
 * at rest and adds no JavaScript to a grid of fifty cards.
 *
 * Hover is an enhancement, never a requirement (InteractionPrinciples §3) — the
 * same lighting fires on `focus-within`, so keyboard users get the identical
 * affordance, and touch users lose nothing because the card was always tappable.
 */
export function HoverGlow({
  children,
  className,
  as: Tag = 'div',
  tone = 'brand',
  elevate = true,
}: HoverGlowProps) {
  return (
    <Tag
      className={cn(
        'transition-shadow duration-[var(--motion-fast)] ease-[var(--ease-move)]',
        'hover:glow-soft focus-within:glow-soft',
        elevate && 'depth-interactive',
        className
      )}
      style={{ '--glow-color': TONE_VARIABLE[tone] } as CSSProperties}
    >
      {children}
    </Tag>
  )
}
