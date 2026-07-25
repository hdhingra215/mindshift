import type { ComponentProps, CSSProperties } from 'react'

import { cn } from '@/lib/utils'

import { AnimatedButton } from './animated-button'
import { TONE_VARIABLE, type GlowTone } from './tones'

type GlowButtonProps = ComponentProps<typeof AnimatedButton> & {
  tone?: GlowTone
  /** Emit light at rest, not only on hover. For a single hero action. */
  alwaysLit?: boolean
}

/**
 * A button that emits light.
 *
 * Depth on a true-black canvas comes from lighting, not from shadow — a drop
 * shadow against `#050506` is invisible. Glow is how a primary action reads as
 * raised and alive here.
 *
 * The glow is a box-shadow on a CSS custom property, so it repaints without
 * layout or JavaScript and re-lights automatically on a theme swap. Default is
 * hover-only: a screen full of permanently glowing buttons destroys the "one
 * clear focus per screen" rule that makes the accent mean anything.
 */
export function GlowButton({
  className,
  tone = 'brand',
  alwaysLit = false,
  style,
  ...props
}: GlowButtonProps) {
  return (
    <AnimatedButton
      className={cn(
        'transition-shadow duration-[var(--motion-base)] ease-[var(--ease-move)]',
        alwaysLit ? 'glow' : 'hover:glow focus-visible:glow',
        className
      )}
      style={{ '--glow-color': TONE_VARIABLE[tone], ...style } as CSSProperties}
      {...props}
    />
  )
}
