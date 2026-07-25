import { useRef, type ReactNode } from 'react'
import { motion } from 'motion/react'

import { useParallax, type ParallaxOptions } from '@/lib/motion'
import { cn } from '@/lib/utils'

type ParallaxLayerProps = ParallaxOptions & {
  children: ReactNode
  className?: string
}

/**
 * A layer that drifts at a different rate to the page as it scrolls.
 *
 * Depth through motion parallax: layers that lag the scroll read as further
 * away, layers that lead it read as closer. Stack two or three at different
 * distances and a flat page acquires physical space.
 *
 * This is Motion's job, not Anime.js's — the transform is bound directly to a
 * scroll MotionValue, so it updates without a React render per frame and stays
 * perfectly in step with the scroll position rather than chasing it on a timer.
 *
 * Under reduced motion the distance collapses to zero: the layer still renders
 * in place, it simply stops drifting. No content is ever behind the effect.
 */
export function ParallaxLayer({ children, className, distance, smooth }: ParallaxLayerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const y = useParallax(ref, { distance, smooth })

  return (
    <motion.div className={cn('will-change-transform', className)} ref={ref} style={{ y }}>
      {children}
    </motion.div>
  )
}
