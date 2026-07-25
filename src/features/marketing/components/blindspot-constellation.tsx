import { useEffect, useRef, useState, type CSSProperties } from 'react'

import { subscribePointer, ambientMotionAllowed, useReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { BIAS_CONSTELLATION } from '../constants'
import type { BiasPoint } from '../types'

/** Distance in px at which a point begins to respond to the cursor. */
const AWARENESS_RADIUS = 170

type BlindspotConstellationProps = {
  /** Slug of the bias the visitor already caught in the teaser, if any. */
  litSlug: string | null
  className?: string
}

/**
 * Twelve blind spots as an unlit star field.
 *
 * At rest it is nearly empty — which is the honest picture: these are things
 * you cannot currently see. Points brighten as the cursor approaches and name
 * themselves when you reach one, so the section is *explored* rather than read.
 * A list of twelve bias names would have communicated the same facts and none
 * of the feeling.
 *
 * The one bias caught in the teaser above stays permanently lit. That
 * continuity is the point of putting this section after the teaser: the page
 * remembers what you did, and the map is already one point less dark than it
 * was. It is also the CTA's argument, made visually before it is made in words.
 *
 * Every point is also a real button that toggles its own name, so the discovery
 * works identically by tap and by keyboard — proximity is an enhancement, never
 * the only way in.
 */
export function BlindspotConstellation({ litSlug, className }: BlindspotConstellationProps) {
  const fieldRef = useRef<HTMLUListElement>(null)
  const reduced = useReducedMotion()
  const [activeSlug, setActiveSlug] = useState<string | null>(null)

  useEffect(() => {
    const field = fieldRef.current
    if (!field || reduced || !ambientMotionAllowed()) return

    const points = Array.from(field.querySelectorAll<HTMLElement>('[data-bias-point]'))

    /*
     * Point positions are percentages of this container, so their centres can
     * be derived from a single container rect. That keeps the frame to one
     * layout read instead of twelve, and it stays correct while the parallax
     * wrapper is translating the whole field — no scroll listener needed,
     * because the rect already reflects wherever the container currently is.
     */
    const unsubscribe = subscribePointer((pointer) => {
      const box = field.getBoundingClientRect()

      for (const node of points) {
        const percentX = Number(node.dataset.x ?? '0')
        const percentY = Number(node.dataset.y ?? '0')
        const centerX = box.left + (percentX / 100) * box.width
        const centerY = box.top + (percentY / 100) * box.height

        const distance = Math.hypot(pointer.x - centerX, pointer.y - centerY)
        const nearness = Math.max(0, 1 - distance / AWARENESS_RADIUS)
        node.style.setProperty('--nearness', nearness.toFixed(3))
      }
    })

    return () => {
      unsubscribe()
      for (const node of points) node.style.removeProperty('--nearness')
    }
  }, [reduced])

  return (
    <ul
      aria-label="The twelve biases MindShift trains"
      className={cn('relative m-0 h-[26rem] w-full list-none p-0 sm:h-[30rem]', className)}
      ref={fieldRef}
    >
      {BIAS_CONSTELLATION.map((point) => (
        <ConstellationPoint
          isActive={activeSlug === point.slug}
          isLit={point.slug === litSlug}
          key={point.slug}
          onToggle={() =>
            setActiveSlug((current) => (current === point.slug ? null : point.slug))
          }
          point={point}
          reduced={reduced}
        />
      ))}
    </ul>
  )
}

type ConstellationPointProps = {
  point: BiasPoint
  isLit: boolean
  /** Named because it was tapped, clicked or focused — as opposed to approached. */
  isActive: boolean
  reduced: boolean
  onToggle: () => void
}

/**
 * A single blind spot.
 *
 * A real `<button>`: tapping or activating it names the bias, which is the same
 * discovery a pointer gets by proximity. The `--nearness` variable written by
 * the loop above drives opacity, scale and glow entirely in CSS, so approaching
 * a point costs a style write rather than a render.
 */
function ConstellationPoint({
  point,
  isLit,
  isActive,
  reduced,
  onToggle,
}: ConstellationPointProps) {
  const revealName = isLit || isActive

  return (
    <li
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${point.x}%`, top: `${point.y}%` }}
    >
      <button
        aria-expanded={isActive}
        aria-label={`${point.name} — ${point.category}${isLit ? '. You have met this one.' : ''}`}
        className="group/point flex cursor-pointer items-center justify-center rounded-full p-3 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        data-bias-point
        data-x={point.x}
        data-y={point.y}
        onBlur={() => {
          if (isActive) onToggle()
        }}
        onClick={onToggle}
        onFocus={() => {
          if (!isActive) onToggle()
        }}
        style={
          // Under reduced motion every point sits at full presence rather than
          // waiting for a cursor that will never light it.
          reduced ? ({ '--nearness': '1' } as CSSProperties) : undefined
        }
        type="button"
      >
        {/* The star */}
        <span
          aria-hidden="true"
          className={cn(
            'block size-1.5 rounded-full transition-[background-color] duration-[var(--motion-base)]',
            isLit ? 'bg-reward' : 'bg-foreground'
          )}
          style={{
            opacity: isLit || revealName ? 1 : 'calc(0.18 + var(--nearness, 0) * 0.82)',
            transform: 'scale(calc(1 + var(--nearness, 0) * 0.9))',
            boxShadow: isLit
              ? '0 0 18px 2px color-mix(in oklab, var(--reward) 55%, transparent)'
              : '0 0 calc(var(--nearness, 0) * 20px) calc(var(--nearness, 0) * 3px) color-mix(in oklab, var(--brand) calc(var(--nearness, 0) * 60%), transparent)',
          }}
        />

        {/* The name — surfaces on proximity, hover, tap or keyboard focus. */}
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute top-full left-1/2 mt-1 -translate-x-1/2 whitespace-nowrap',
            'text-[11px] font-medium tracking-wide',
            'transition-opacity duration-[var(--motion-fast)] ease-[var(--ease-move)]',
            'group-hover/point:opacity-100',
            isLit ? 'text-reward' : 'text-foreground/80'
          )}
          style={{
            opacity: revealName ? 1 : 'calc(max(0, var(--nearness, 0) - 0.45) * 2)',
          }}
        >
          {point.name}
        </span>
      </button>
    </li>
  )
}
