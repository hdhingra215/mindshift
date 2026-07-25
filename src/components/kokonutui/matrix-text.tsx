/**
 * Matrix Text — adapted from KokonutUI (MIT).
 * Source: https://kokonutui.com · @dorianbaffier
 *
 * ── Migration notes ──────────────────────────────────────────────────────────
 *  1. Scramble is driven by Anime.js (`scrambleText`) instead of a chain of
 *     nested `setTimeout` + `requestAnimationFrame` calls. The original leaked
 *     every pending timer on unmount and re-triggered its own state updates;
 *     the engine handles sequencing and reverts cleanly.
 *  2. The hardcoded `#00ff00` "matrix green" and the `text-black dark:text-white`
 *     pair are replaced by design tokens, so it belongs to the palette.
 *  3. `min-h-screen` is gone. A text primitive must not own page layout.
 *  4. Reduced motion renders the final string immediately, and the accessible
 *     name is always the real text — a screen reader never hears scrambled
 *     characters.
 */

import { useEffect, useRef, type ElementType } from 'react'
import { scrambleText } from 'animejs'

import { ANIME_EASE, DURATION, animate, prefersReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'

type MatrixTextProps = {
  text: string
  className?: string
  as?: ElementType
  /** Pause before the scramble resolves, in ms. */
  delay?: number
  /** How long the resolve takes, in ms. */
  duration?: number
  /** Characters to scramble through. Binary by default — a nod to the original. */
  characters?: string
}

/**
 * Text that resolves out of scrambled characters.
 *
 * A *delight* primitive with a strict budget (InteractionPrinciples §10): one
 * per screen at most, on a moment that earns it — a level title, a bias name at
 * the reveal, a milestone. Never on body copy, and never on anything the player
 * needs to read immediately.
 */
export function MatrixText({
  text,
  className,
  as: Tag = 'span',
  delay = 200,
  duration = DURATION.celebrate,
  characters = '01',
}: MatrixTextProps) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || prefersReducedMotion()) return

    const animation = animate(element, {
      text: scrambleText({ chars: characters, text }),
      duration,
      delay,
      ease: ANIME_EASE.move,
    })

    return () => {
      animation.revert()
    }
  }, [text, characters, duration, delay])

  return (
    <Tag
      aria-label={text}
      className={cn('font-mono tabular-nums text-foreground', className)}
      ref={ref}
    >
      {text}
    </Tag>
  )
}

export default MatrixText
