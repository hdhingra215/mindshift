import { useEffect, useRef, useState, type CSSProperties } from 'react'

import { signal } from '@/lib/feedback'
import { useCursorGlow, useReducedMotion, ambientMotionAllowed } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { HERO_SURFACE, HERO_TRUTH } from '../constants'

type HeroLensProps = {
  className?: string
}

/**
 * The lens — the landing page's thesis, delivered as an interaction.
 *
 * Two sentences occupy the same space. The top one is what you believe; the one
 * underneath is what is actually happening. A circular lens follows the cursor
 * and cuts a hole through the first to show the second, so the sentence flickers
 * between two meanings as you move.
 *
 * They differ by one word. That subtlety is deliberate: a dramatic swap would
 * read as a trick, where a single-word shift reproduces what a bias actually
 * feels like — you would swear you read it correctly.
 *
 * Implementation is close to free. The pointer engine publishes `--pointer-x/y`
 * onto this element and a `clip-path: circle()` reads them, so the reveal is a
 * GPU-composited clip repaint with zero React renders and zero per-frame JS of
 * its own.
 *
 * Without a pointer — touch, keyboard, reduced motion — the lens is replaced by
 * an explicit toggle that reveals the whole line. The discovery is never
 * locked behind a cursor.
 */
export function HeroLens({ className }: HeroLensProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const [isRevealed, setIsRevealed] = useState(false)
  const [hasPointer, setHasPointer] = useState(false)

  useCursorGlow(ref)

  // Resolved after mount so the server-agnostic first paint is the accessible
  // one: the toggle exists, and the lens is added only where it can work.
  useEffect(() => {
    setHasPointer(ambientMotionAllowed())
  }, [reduced])

  const lensActive = hasPointer && !reduced && !isRevealed

  return (
    <div className={cn('flex flex-col items-center gap-6', className)}>
      <div
        className="relative isolate w-full max-w-4xl"
        /*
         * The torch catching the line.
         *
         * Bound to pointer *movement over the words*, not to entering the box,
         * because the light is only doing anything while it is being dragged
         * across the sentence. The moment carries a long throttle (see
         * `moments.ts`), so a cursor swept back and forth produces an
         * occasional sense of something catching the light rather than a
         * stream of noise — which is the difference between atmosphere and the
         * most annoying possible interaction on the page.
         */
        onPointerMove={(event) => {
          if (!lensActive || event.pointerType !== 'mouse') return
          signal('torch.sweep')
        }}
        ref={ref}
        style={
          {
            // Radius collapses to nothing when the pointer leaves the element,
            // so the truth is only visible where the cursor actually is.
            '--lens-radius': lensActive ? 'calc(9rem * var(--pointer-opacity, 0))' : '0px',
          } as CSSProperties
        }
      >
        {/*
         * The real document heading. Both visual layers are `aria-hidden`,
         * because two overlapping half-sentences are incoherent to a screen
         * reader — so the accessible name is stated here once, in full, with
         * the reveal spelled out rather than implied by a cursor.
         */}
        <h1 className="sr-only">
          {HERO_SURFACE} Or so it feels. In fact: {HERO_TRUTH}
        </h1>

        <p
          aria-hidden="true"
          className="font-heading text-4xl leading-[1.1] font-bold tracking-tight text-balance text-foreground sm:text-6xl lg:text-7xl"
        >
          {HERO_SURFACE}
        </p>

        {/*
         * The truth layer sits exactly on top, clipped to the lens. Same box,
         * same type metrics, so only the glyphs differ — never the layout.
         */}
        <p
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-0 font-heading text-4xl leading-[1.1] font-bold tracking-tight text-balance sm:text-6xl lg:text-7xl',
            'text-[color-mix(in_oklab,var(--brand)_78%,var(--foreground))]',
            isRevealed && 'transition-[clip-path] duration-[var(--motion-slow)] ease-[var(--ease-enter)]'
          )}
          style={{
            clipPath: isRevealed
              ? 'circle(140% at 50% 50%)'
              : 'circle(var(--lens-radius) at var(--pointer-x, 50%) var(--pointer-y, 50%))',
          }}
        >
          {HERO_TRUTH}
        </p>
      </div>

      <button
        aria-pressed={isRevealed}
        className={cn(
          'cursor-pointer rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium tracking-wide text-muted-foreground',
          'transition-colors duration-[var(--motion-fast)] ease-[var(--ease-move)]',
          'hover:border-brand/40 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'
        )}
        onClick={() => {
          // Turning the light on deliberately is a different act from sweeping
          // it, so it gets the larger of the two: the whole space opening.
          signal('torch.toggle')
          setIsRevealed((current) => !current)
        }}
        type="button"
      >
        {isRevealed
          ? 'Hide it again'
          : hasPointer
            ? 'Move your cursor over the line — or reveal it'
            : 'Reveal what it actually says'}
      </button>
    </div>
  )
}
