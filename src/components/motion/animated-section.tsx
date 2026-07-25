import type { ReactNode } from 'react'

import type { RevealOptions } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { FadeSequence } from './fade-sequence'

type AnimatedSectionProps = RevealOptions & {
  children: ReactNode
  className?: string
  /** Accessible name for the section landmark. */
  label?: string
  /** Reveal on scroll rather than on mount. Defaults to true for a section. */
  revealOnScroll?: boolean
}

/**
 * A page section that reveals its direct children in sequence as it scrolls in.
 *
 * The composition unit for long pages: sections arrive one after another as you
 * travel down the page, which is what turns a scroll into a narrative rather
 * than a list. Renders a real `<section>` with an accessible name so the
 * landmark structure stays intact.
 */
export function AnimatedSection({
  children,
  className,
  label,
  revealOnScroll = true,
  ...revealOptions
}: AnimatedSectionProps) {
  return (
    <FadeSequence
      aria-label={label}
      as="section"
      className={cn(className)}
      revealOnScroll={revealOnScroll}
      {...revealOptions}
    >
      {children}
    </FadeSequence>
  )
}
