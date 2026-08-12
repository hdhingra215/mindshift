import type { CSSProperties } from 'react'

import { formatMastery } from '@/features/mastery'
import { cn } from '@/lib/utils'

import type { OrbitPlacement } from '../lib/orbit'

type BiasNodeProps = {
  placement: OrbitPlacement
  /** True when this node is the one the player is attending to. */
  isActive: boolean
  /** True when some *other* node is active — this one recedes. */
  isDimmed: boolean
  onFocus: () => void
  onBlur: () => void
}

/**
 * One bias, as an object in orbit.
 *
 * A real `<button>`, so the field is fully keyboard-operable: tabbing walks the
 * orbit and focus does exactly what hover does. The proximity glow is an
 * enhancement on top of that, never the way in.
 *
 * ── How it moves without costing anything ───────────────────────────────────
 * Position is derived entirely in CSS from the shared `--orbit-turn` clock:
 * rotate to the orbital angle, translate out to the radius, then counter-rotate
 * so the object itself stays upright rather than tumbling. One animated variable
 * on the parent moves all twelve, and React is not involved after mount.
 *
 * ── Why it dims when its neighbours are attended to ─────────────────────────
 * Hovering one object lowers every other one. That is what makes the field feel
 * like a single connected space rather than twelve independent widgets — the
 * world notices where you are looking and responds as a whole.
 */
export function BiasNode({ placement, isActive, isDimmed, onFocus, onBlur }: BiasNodeProps) {
  const { bias, radius, phase, rate, luminosity } = placement

  return (
    <button
      aria-label={`${bias.name}. ${bias.tier.label}, ${formatMastery(bias.masteryLevel)} mastery.${
        bias.totalAttempts === 0 ? ' Not yet encountered.' : ''
      }`}
      className={cn(
        'group/node absolute top-1/2 left-1/2 cursor-pointer rounded-full p-3',
        'transition-opacity duration-[var(--motion-base)] ease-[var(--ease-move)]',
        'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
        isDimmed && 'opacity-40',
      )}
      onBlur={onBlur}
      onFocus={onFocus}
      onMouseEnter={onFocus}
      onMouseLeave={onBlur}
      style={
        {
          '--node-rate': rate,
          '--node-phase': `${phase}`,
          '--node-radius': radius,
          // rotate → push out → counter-rotate. The margins pull the box back
          // onto its own centre so the orbit is measured from the core.
          transform: `translate(-50%, -50%)
            rotate(calc((var(--orbit-turn) * var(--node-rate) + var(--node-phase)) * 1deg))
            translateX(calc(var(--orbit-radius) * var(--node-radius)))
            rotate(calc((var(--orbit-turn) * var(--node-rate) + var(--node-phase)) * -1deg))`,
        } as CSSProperties
      }
      type="button"
    >
      {/* The object. Brightness and glow both read mastery. */}
      <span
        aria-hidden="true"
        className={cn(
          'block rounded-full transition-[width,height,box-shadow] duration-[var(--motion-base)]',
          isActive ? 'size-3' : 'size-2',
          bias.tier.fillClass,
        )}
        style={{
          opacity: isActive ? 1 : luminosity,
          boxShadow: isActive
            ? '0 0 26px 5px color-mix(in oklab, currentColor 42%, transparent)'
            : `0 0 ${Math.round(luminosity * 16)}px ${Math.round(luminosity * 3)}px color-mix(in oklab, currentColor calc(${luminosity} * 45%), transparent)`,
        }}
      />

      {/*
       * The name surfaces on attention only. Twelve permanent labels would turn
       * an environment back into a chart, and the accessible name above already
       * carries everything for anyone not using a pointer.
       */}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute top-full left-1/2 mt-1.5 -translate-x-1/2 whitespace-nowrap',
          'font-mono text-[10px] tracking-[0.08em] uppercase',
          'transition-opacity duration-[var(--motion-fast)] ease-[var(--ease-move)]',
          isActive ? 'opacity-100' : 'opacity-0',
          bias.tier.toneClass,
        )}
      >
        {bias.name}
      </span>
    </button>
  )
}
