import { useEffect, useRef } from 'react'

import {
  ANIME_EASE,
  Z_LAYER,
  animate,
  stagger,
  useReducedMotion,
  type JSAnimation,
} from '@/lib/motion'
import { cn } from '@/lib/utils'

import { TONE_VARIABLE, type GlowTone } from './tones'

/** One drifting light. Percentages keep the field responsive without JS. */
type Orb = {
  tone: GlowTone
  size: number
  left: string
  top: string
  /** Seconds for one full drift cycle. Deliberately long and out of phase. */
  cycle: number
}

/**
 * A small, fixed set of lights. Three is the budget: enough to imply a lit
 * space, few enough that the canvas stays black and text stays the focus.
 */
const ORBS: readonly Orb[] = [
  { tone: 'brand', size: 520, left: '-8%', top: '-12%', cycle: 26 },
  { tone: 'reward', size: 380, left: '72%', top: '18%', cycle: 34 },
  { tone: 'success', size: 440, left: '28%', top: '68%', cycle: 30 },
]

type FloatingBackgroundProps = {
  className?: string
  /** Overall intensity, 0–1. Keep it low; this is atmosphere, not decoration. */
  intensity?: number
}

/**
 * The ambient light field behind the app — slow, out-of-phase pools of colour
 * drifting across the black canvas.
 *
 * This is what makes MindShift read as a *world* on load rather than a page.
 * It is also the lowest-priority motion in the product (InteractionPrinciples
 * §2, ambient tier) and the first thing to cut: it never renders under reduced
 * motion, and the app is visually complete without it.
 *
 * Cost control is deliberate. Three nodes, one Anime.js animation driving all
 * three, transform and opacity only, heavily blurred so low-frequency movement
 * is imperceptible as jank. Nothing here reads layout or triggers a render.
 */
export function FloatingBackground({ className, intensity = 0.5 }: FloatingBackgroundProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const root = ref.current
    if (!root || reduced) return

    const orbs = Array.from(root.children) as HTMLElement[]
    const animations: JSAnimation[] = orbs.map((orb, index) =>
      animate(orb, {
        translateX: [0, index % 2 === 0 ? 60 : -70, 0],
        translateY: [0, index % 2 === 0 ? -48 : 54, 0],
        scale: [1, 1.12, 1],
        duration: (ORBS[index]?.cycle ?? 30) * 1000,
        ease: ANIME_EASE.move,
        loop: true,
        delay: stagger(1200),
      })
    )

    return () => {
      for (const animation of animations) animation.revert()
    }
  }, [reduced])

  if (reduced) return null

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none fixed inset-0 overflow-hidden', className)}
      ref={ref}
      style={{ zIndex: Z_LAYER.base }}
    >
      {ORBS.map((orb) => (
        <span
          className="absolute block rounded-full blur-[120px] will-change-transform"
          key={orb.tone}
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.left,
            top: orb.top,
            opacity: intensity,
            background: `radial-gradient(circle, color-mix(in oklab, ${TONE_VARIABLE[orb.tone]} calc(var(--glow-strength) * 70%), transparent), transparent 70%)`,
          }}
        />
      ))}
    </div>
  )
}
