import { useRef, type ElementType, type HTMLAttributes, type ReactNode } from 'react'

import { useReveal, useRevealInView, type RevealOptions } from '@/lib/motion'
import { cn } from '@/lib/utils'

type FadeSequenceProps = Omit<RevealOptions, 'stagger'> &
  Omit<HTMLAttributes<HTMLElement>, 'children' | 'className'> & {
    children: ReactNode
    className?: string
    as?: ElementType
    /** Interval between children. Defaults to the `base` stagger tier. */
    stagger?: RevealOptions['stagger']
    /**
     * CSS selector for the elements to sequence. Defaults to direct children,
     * which is what you want for a list, a card grid or a stat row.
     */
    selector?: string
    revealOnScroll?: boolean
  }

/**
 * Reveals a group of siblings in sequence rather than all at once.
 *
 * A staggered group reads as one gesture — the eye follows the cascade and
 * lands on the last item — where a simultaneous fade reads as a page flash.
 * Use for lists, grids and any set of peers.
 *
 * The stagger is dropped entirely under reduced motion: a sequenced delay is
 * still motion-as-meaning, and a user who asked for stillness should get the
 * whole group at once.
 */
export function FadeSequence({
  children,
  className,
  as: Tag = 'div',
  stagger = 'base',
  selector = ':scope > *',
  revealOnScroll = false,
  duration,
  ease,
  from,
  distance,
  delay,
  onComplete,
  ...rest
}: FadeSequenceProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useRevealInView(ref, { amount: 0.15 })

  useReveal(ref, {
    duration,
    ease,
    from,
    distance,
    delay,
    onComplete,
    stagger,
    selector,
    enabled: revealOnScroll ? inView : true,
  })

  return (
    <Tag className={cn(className)} ref={ref} {...rest}>
      {children}
    </Tag>
  )
}
