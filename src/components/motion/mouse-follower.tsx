import { useRef } from 'react'

import { Z_LAYER, ambientMotionAllowed, usePointerFollower, useReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'

type MouseFollowerProps = {
  className?: string
  /** Diameter of the light, in px. */
  size?: number
}

/**
 * A soft light that trails the cursor across the whole viewport.
 *
 * Ambient atmosphere — it makes the black canvas feel like a lit space rather
 * than an empty one. It carries no information whatsoever, which is exactly why
 * it is safe to remove: it does not render at all without a fine pointer or
 * under reduced motion, and nothing about the product changes when it is gone.
 *
 * Mount it once, high in the tree. It is `pointer-events: none` and
 * `aria-hidden`, so it never intercepts a click or reaches a screen reader.
 * Position is integrated with spring physics inside the shared pointer loop —
 * one composited transform per frame, no React renders.
 */
export function MouseFollower({ className, size = 340 }: MouseFollowerProps) {
  const ref = useRef<HTMLDivElement>(null)
  // Subscribed, not sampled: flipping the OS setting mid-session removes the
  // follower without a reload.
  const reduced = useReducedMotion()
  usePointerFollower(ref)

  // Gated at render, so the node is never created on a device that will never
  // use it — a touch device pays nothing for this component existing.
  if (reduced || !ambientMotionAllowed()) return null

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none fixed top-0 left-0 opacity-0', className)}
      ref={ref}
      style={{
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        zIndex: Z_LAYER.base,
        background:
          'radial-gradient(circle, color-mix(in oklab, var(--brand) calc(var(--glow-strength) * 55%), transparent), transparent 68%)',
        transition: 'opacity var(--motion-slow) var(--ease-move)',
      }}
    />
  )
}
