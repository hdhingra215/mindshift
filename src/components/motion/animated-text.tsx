import { useEffect, useRef, type ElementType } from 'react'
import { splitText } from 'animejs'

import {
  ANIME_EASE,
  DURATION,
  STAGGER,
  TRAVEL,
  animate,
  prefersReducedMotion,
  stagger,
  useRevealInView,
} from '@/lib/motion'
import { cn } from '@/lib/utils'

export type TextRevealUnit = 'chars' | 'words' | 'lines'

type AnimatedTextProps = {
  /**
   * Plain text only. Splitting rewrites the element's inner HTML into spans, so
   * passing rich children would silently lose them.
   */
  text: string
  className?: string
  as?: ElementType
  /** Granularity of the cascade. Words is the default — chars is a flourish. */
  unit?: TextRevealUnit
  /** Interval between units, in ms. */
  stagger?: number
  /** Delay before the first unit moves, in ms. */
  delay?: number
  revealOnScroll?: boolean
}

/**
 * Text that assembles itself, one word (or character, or line) at a time.
 *
 * This is a *delight* primitive, and delight has a budget — one or two per
 * screen (InteractionPrinciples §10). Reach for it on a hero line or a
 * milestone moment, not on body copy: a cascade over a paragraph is unreadable
 * and reads as decoration, which is the one thing motion here must never be.
 *
 * Accessibility: Anime.js's splitter keeps the original string readable to
 * assistive tech, and under reduced motion the split never happens at all — the
 * text renders as ordinary text with no per-unit spans.
 */
export function AnimatedText({
  text,
  className,
  as: Tag = 'p',
  unit = 'words',
  stagger: interval = STAGGER.tight,
  delay = 0,
  revealOnScroll = false,
}: AnimatedTextProps) {
  const ref = useRef<HTMLElement>(null)
  const inView = useRevealInView(ref, { amount: 0.4 })
  const enabled = revealOnScroll ? inView : true

  useEffect(() => {
    const element = ref.current
    if (!element || !enabled || prefersReducedMotion()) return

    const splitter = splitText(element, {
      chars: unit === 'chars',
      words: unit !== 'lines',
      lines: unit === 'lines',
    })

    // The splitter types these as `any[]`; they are always DOM elements.
    const targets = splitter[unit] as HTMLElement[]
    if (targets.length === 0) {
      splitter.revert()
      return
    }

    const animation = animate(targets, {
      opacity: [0, 1],
      translateY: [TRAVEL.sm, 0],
      duration: DURATION.slow,
      ease: ANIME_EASE.enter,
      delay: stagger(interval, { start: delay }),
    })

    return () => {
      animation.revert()
      splitter.revert()
    }
  }, [text, unit, interval, delay, enabled])

  return (
    <Tag className={cn(className)} ref={ref}>
      {text}
    </Tag>
  )
}
