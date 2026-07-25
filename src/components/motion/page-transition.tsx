import { useEffect, useRef, type ReactNode } from 'react'

import { reveal, stopMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'

type PageTransitionProps = {
  children: ReactNode
  /**
   * Changing this key replays the transition. Pass the route pathname — the key
   * is what tells the primitive a *new page* arrived rather than the same page
   * re-rendering.
   */
  transitionKey: string
  className?: string
}

/**
 * The route-change reveal.
 *
 * Navigational motion is the third motion priority (InteractionPrinciples §2):
 * orienting, quick, and unobtrusive. It exists to stop the page *jumping*, not
 * to perform. There is deliberately no exit animation — an exit would delay
 * navigation, and the player must never wait on a flourish.
 *
 * Keyed on the pathname so the DOM remounts per route, which also guarantees
 * scroll and focus start clean. Under reduced motion the reveal resolves in a
 * single frame and the page simply appears.
 */
export function PageTransition({ children, transitionKey, className }: PageTransitionProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const animation = reveal(element, { duration: 'slow', from: 'up', distance: 'sm' })
    return () => {
      animation.revert()
      stopMotion(element)
    }
  }, [transitionKey])

  return (
    <div className={cn(className)} key={transitionKey} ref={ref}>
      {children}
    </div>
  )
}
