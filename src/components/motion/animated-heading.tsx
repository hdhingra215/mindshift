import { STAGGER } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { AnimatedText, type TextRevealUnit } from './animated-text'

type HeadingLevel = 1 | 2 | 3

type AnimatedHeadingProps = {
  text: string
  className?: string
  /** Real heading level — drives the tag, so document outline stays correct. */
  level?: HeadingLevel
  unit?: TextRevealUnit
  delay?: number
  revealOnScroll?: boolean
}

/**
 * A heading that assembles on arrival.
 *
 * Thin specialisation of AnimatedText that enforces the two things a heading
 * must not get wrong: a real `h1`/`h2`/`h3` tag (never a styled div), and the
 * type scale from the Design System rather than ad-hoc sizes.
 */
export function AnimatedHeading({
  text,
  className,
  level = 2,
  unit = 'words',
  delay = 0,
  revealOnScroll = false,
}: AnimatedHeadingProps) {
  const sizeByLevel: Record<HeadingLevel, string> = {
    1: 'text-4xl leading-[1.15] font-bold tracking-tight',
    2: 'text-2xl leading-tight font-semibold tracking-tight',
    3: 'text-xl leading-snug font-semibold',
  }

  return (
    <AnimatedText
      as={`h${level}`}
      className={cn('font-heading text-foreground', sizeByLevel[level], className)}
      delay={delay}
      revealOnScroll={revealOnScroll}
      stagger={STAGGER.tight}
      text={text}
      unit={unit}
    />
  )
}
