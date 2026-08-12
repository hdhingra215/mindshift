import { useEffect, useRef } from 'react'

import {
  ANIME_EASE,
  Z_LAYER,
  animate,
  subscribePointer,
  ambientMotionAllowed,
  useReducedMotion,
} from '@/lib/motion'
import { cn } from '@/lib/utils'

/** Seconds for one full camera drift cycle. Long enough to never be "an animation". */
const DRIFT_CYCLE_SECONDS = 48

type WorldCanvasProps = {
  className?: string
}

/**
 * The environment the authenticated product lives inside.
 *
 * Mounted once, behind everything. It contributes three things and no content:
 *
 *   1. **A single light source.** The scene is lit from one off-centre point
 *      rather than evenly. One direction of light is what separates a place from
 *      a surface; ambient glow from everywhere is what makes dark UI read flat.
 *   2. **Structure in the void.** A lattice that only resolves where the light
 *      falls on it, so the black has a floor without anything being drawn.
 *   3. **A camera.** It publishes `--world-parallax-x/y` (cursor, normalised
 *      -1→1) and `--world-drift-x/y` (slow autonomous motion) so every depth
 *      plane in the app can move without subscribing to anything.
 *
 * ── Why the camera is variables, not components ─────────────────────────────
 * One pointer subscription writes two custom properties on this element; every
 * `.world-plane` under it reads them through CSS with its own depth multiplier.
 * N parallax layers therefore cost one rAF callback and zero React renders. The
 * obvious alternative — each layer subscribing and setting its own transform —
 * scales linearly in work and is how a "premium" cursor effect becomes jank.
 *
 * Entirely decorative: `aria-hidden`, non-interactive. Under reduced motion the
 * camera never starts and the planes are pinned by CSS, but the light and the
 * lattice remain — the world holds still rather than ceasing to exist.
 */
export function WorldCanvas({ className }: WorldCanvasProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  // Cursor → camera. Writes custom properties inside the shared rAF loop.
  useEffect(() => {
    const root = rootRef.current
    if (!root || reduced || !ambientMotionAllowed()) return

    const unsubscribe = subscribePointer((pointer) => {
      // Normalised offset from the viewport centre. Clamped so a cursor parked
      // in a corner cannot push the scene further than the design allows.
      const nx = (pointer.x / window.innerWidth - 0.5) * 2
      const ny = (pointer.y / window.innerHeight - 0.5) * 2
      root.style.setProperty('--world-parallax-x', Math.max(-1, Math.min(1, nx)).toFixed(4))
      root.style.setProperty('--world-parallax-y', Math.max(-1, Math.min(1, ny)).toFixed(4))
    })

    return () => {
      unsubscribe()
      root.style.removeProperty('--world-parallax-x')
      root.style.removeProperty('--world-parallax-y')
    }
  }, [reduced])

  /*
   * Autonomous drift. The world keeps breathing when the cursor is still, which
   * is the difference between a scene and a screenshot — and it means a touch
   * device, which never publishes a pointer, still gets a living environment.
   *
   * Time-driven, so Anime.js owns it (MotionSystem §1). One animation drives a
   * variable that every plane already reads; nothing else is added.
   */
  useEffect(() => {
    const root = rootRef.current
    if (!root || reduced) return

    const drift = animate(root, {
      '--world-drift-x': [0, 0.6, -0.5, 0],
      '--world-drift-y': [0, -0.45, 0.5, 0],
      duration: DRIFT_CYCLE_SECONDS * 1000,
      ease: ANIME_EASE.move,
      loop: true,
    })

    return () => {
      drift.revert()
    }
  }, [reduced])

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none fixed inset-0 overflow-hidden', className)}
      ref={rootRef}
      style={{ zIndex: Z_LAYER.base }}
    >
      {/*
       * The key light. Deliberately one source, off-centre and high, in the
       * brand hue — the world has a direction, and everything below is lit by
       * it rather than glowing on its own.
       *
       * Its *temperature* carries momentum. `--world-warmth` mixes a little
       * reward orange into the brand purple and lifts the intensity slightly, so
       * a player on a run walks into a warmer room. The mix is capped low on
       * purpose: purple stays the identity of the world, and the difference
       * should be felt before it is noticed.
       */}
      <div
        className="world-plane world-plane-far absolute -top-[28vh] left-1/2 h-[85vh] w-[85vh] -translate-x-1/2 rounded-full blur-[130px] transition-[background] duration-[1200ms] ease-[var(--ease-move)]"
        style={{
          background:
            'radial-gradient(circle, color-mix(in oklab, color-mix(in oklab, var(--reward) calc(var(--world-warmth) * 22%), var(--brand)) calc(var(--glow-strength) * (62% + var(--world-warmth) * 16%)), transparent), transparent 68%)',
        }}
      />

      {/* A cold counter-light low and to one side, so the space has two ends. */}
      <div
        className="world-plane world-plane-mid absolute -bottom-[22vh] -left-[12vw] h-[60vh] w-[60vh] rounded-full blur-[140px]"
        style={{
          background:
            'radial-gradient(circle, color-mix(in oklab, var(--success) calc(var(--glow-strength) * 30%), transparent), transparent 70%)',
        }}
      />

      {/* Structure. Sits on the far plane so it reads as ground, not overlay. */}
      <div className="world-plane world-plane-far world-lattice" />

      {/* The edges of the world. Always last, always on top of the atmosphere. */}
      <div className="world-vignette" />
    </div>
  )
}
