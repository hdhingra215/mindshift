import { useRef, type CSSProperties, type ElementType, type ReactNode } from 'react'

import { useCursorGlow } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { TONE_VARIABLE, type GlowTone } from './tones'

type SpotlightContainerProps = {
  children: ReactNode
  className?: string
  as?: ElementType
  tone?: GlowTone
  /** Diameter of the light pool, in px. */
  size?: number
}

/**
 * A surface that is lit by the cursor — a soft pool of colour follows the
 * pointer across the container.
 *
 * The workhorse of "this feels like a game world, not a form". It gives a flat
 * dark panel a sense of being a physical, lit object without any element
 * actually moving, which keeps it firmly inside the restraint budget.
 *
 * Zero-render by construction: the cursor engine writes `--pointer-x/y` onto
 * this element and the `.spotlight` utility paints a radial gradient from them.
 * React is not involved after mount. The effect is disabled entirely on touch
 * devices and under reduced motion, where the container is a plain surface.
 */
export function SpotlightContainer({
  children,
  className,
  as: Tag = 'div',
  tone = 'brand',
  size = 380,
}: SpotlightContainerProps) {
  const ref = useRef<HTMLDivElement>(null)
  useCursorGlow(ref)

  return (
    <Tag
      className={cn('spotlight', className)}
      ref={ref}
      style={
        {
          '--spotlight-color': TONE_VARIABLE[tone],
          '--spotlight-size': `${size}px`,
        } as CSSProperties
      }
    >
      {children}
    </Tag>
  )
}
