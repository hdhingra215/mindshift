import { useRef, type ElementType, type ReactNode } from 'react'

import { useReveal, useRevealInView, type RevealOptions } from '@/lib/motion'
import { cn } from '@/lib/utils'

type RevealContainerProps = RevealOptions & {
  children: ReactNode
  className?: string
  /** Semantic element to render. Defaults to a plain div — pick the real tag. */
  as?: ElementType
  /**
   * Hold the reveal until the container scrolls into view. Off by default:
   * above-the-fold content should never wait for an observer.
   */
  revealOnScroll?: boolean
}

/**
 * The base "content arrives" primitive.
 *
 * Wraps children and plays the house reveal once. Every other reveal primitive
 * in this folder is a specialisation of this one, so entrances across the whole
 * product share a single identity and a single reduced-motion path.
 *
 * Structure stays untouched: the children render normally and are simply
 * animated in. Nothing is hidden behind the animation, so if motion never runs
 * — reduced motion, JS error, slow device — the content is still there.
 */
export function RevealContainer({
  children,
  className,
  as: Tag = 'div',
  revealOnScroll = false,
  ...revealOptions
}: RevealContainerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useRevealInView(ref, { amount: 0.2 })

  useReveal(ref, { ...revealOptions, enabled: revealOnScroll ? inView : true })

  return (
    <Tag className={cn(className)} ref={ref}>
      {children}
    </Tag>
  )
}
