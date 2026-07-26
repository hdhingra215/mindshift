import { useRef } from 'react'

import { useCursorGlow } from '@/lib/motion'
import { cn } from '@/lib/utils'

type PerceptionFieldProps = {
  className?: string
}

/**
 * The environment behind the hero: a dot lattice that only exists where you are
 * looking.
 *
 * At rest the field is invisible. The cursor carries a soft aperture that fades
 * the lattice in around it, so the world appears to be assembling itself from
 * your attention — the visual thesis of the whole product, stated before a
 * single word is read.
 *
 * Cost is one repaint per frame and nothing else. The lattice is a CSS
 * background pattern and the aperture is a mask driven by the `--pointer-x/y`
 * variables the cursor engine already publishes; there is no per-dot geometry,
 * no canvas, and no JavaScript running on the frame.
 *
 * Purely decorative — `aria-hidden`, non-interactive, and absent under reduced
 * motion because the pointer engine simply never publishes coordinates there,
 * leaving the mask at zero radius.
 */
export function PerceptionField({ className }: PerceptionFieldProps) {
  const ref = useRef<HTMLDivElement>(null)
  useCursorGlow(ref)

  const aperture =
    'radial-gradient(280px circle at var(--pointer-x, 50%) var(--pointer-y, 50%), #000 0%, rgb(0 0 0 / 0.35) 45%, transparent 72%)'

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      ref={ref}
    >
      {/*
       * A warm underlight beneath the lattice. Purple alone made the hero read
       * cold and monochrome; a low-alpha reward wash — the discovery hue —
       * gives the assembling world a temperature without adding a second
       * visible element. It shares the pointer variables, so it costs nothing
       * beyond the repaint already happening.
       */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 'calc(var(--pointer-opacity, 0) * 0.5)',
          backgroundImage:
            'radial-gradient(420px circle at var(--pointer-x, 50%) var(--pointer-y, 50%), color-mix(in oklab, var(--reward) 10%, transparent), transparent 70%)',
        }}
      />

      <div
        className="absolute inset-0 transition-opacity duration-[var(--motion-slow)] ease-[var(--ease-move)]"
        style={{
          // Fades in only where the cursor is. Stays at 0 when the pointer
          // engine never publishes — touch, or reduced motion.
          opacity: 'var(--pointer-opacity, 0)',
          backgroundImage:
            'radial-gradient(circle at center, color-mix(in oklab, var(--brand) 55%, transparent) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
          maskImage: aperture,
          WebkitMaskImage: aperture,
        }}
      />
    </div>
  )
}
