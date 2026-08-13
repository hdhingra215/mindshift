import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'

import { signal } from '@/lib/feedback'
import {
  subscribePointer,
  ambientMotionAllowed,
  prefersReducedMotion,
  useReducedMotion,
} from '@/lib/motion'
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

/**
 * The glint — the visual half of a blind spot lighting up.
 *
 * A single halo expanding once out of the point and fading, plus a small
 * overshoot on the star itself. Deliberately *not* a sparkle: no particles, no
 * rays, no second colour, nothing that lands outside the point's own footprint.
 * The brief is "something inside your mind just lit up", and a light coming on
 * is one shape growing and settling.
 *
 * Runs on the Web Animations API on the node itself, so it costs no React
 * render and cannot outlive the element. Silent under reduced motion — where the
 * point is already at full presence and has nothing to reveal.
 */
function flash(halo: HTMLElement | null, star: HTMLElement | null): void {
  if (prefersReducedMotion()) return

  halo?.animate(
    [
      { opacity: 0, transform: 'scale(0.35)' },
      { opacity: 0.5, transform: 'scale(1.15)', offset: 0.28 },
      { opacity: 0, transform: 'scale(2.4)' },
    ],
    { duration: 620, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  )

  // `filter`, not `transform`: the star's scale is already driven by the
  // `--nearness` variable in its inline style, and animating the same property
  // would fight the cursor for it and then snap back.
  star?.animate(
    [
      { filter: 'brightness(1)' },
      { filter: 'brightness(2.2)', offset: 0.2 },
      { filter: 'brightness(1)' },
    ],
    { duration: 520, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
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
  const haloRef = useRef<HTMLSpanElement>(null)
  const starRef = useRef<HTMLSpanElement>(null)

  /*
   * One entry point for all three ways in — cursor, tap and keyboard — so the
   * discovery is identical however it is reached. Firing the same moment from
   * each is safe: `bias.spark` is throttled at 220 ms, which is what collapses
   * the tap→focus pair a touch produces into the single event it actually is.
   */
  const spark = useCallback(() => {
    signal('bias.spark')
    flash(haloRef.current, starRef.current)
  }, [])

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
        onClick={() => {
          spark()
          onToggle()
        }}
        onFocus={() => {
          spark()
          if (!isActive) onToggle()
        }}
        // Mouse only: on a touch device the tap above is the interaction, and a
        // synthesised enter would mark it twice.
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') spark()
        }}
        style={
          // Under reduced motion every point sits at full presence rather than
          // waiting for a cursor that will never light it.
          reduced ? ({ '--nearness': '1' } as CSSProperties) : undefined
        }
        type="button"
      >
        {/*
         * The halo. At rest it is invisible and inert — it exists only to carry
         * the one expansion `flash` plays through it, in the point's own hue.
         */}
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute size-6 rounded-full opacity-0',
            isLit ? 'bg-reward/30' : 'bg-brand/30'
          )}
          ref={haloRef}
        />

        {/* The star */}
        <span
          aria-hidden="true"
          className={cn(
            'block size-1.5 rounded-full transition-[background-color] duration-[var(--motion-base)]',
            isLit ? 'bg-reward' : 'bg-foreground'
          )}
          ref={starRef}
          style={{
            opacity: isLit || revealName ? 1 : 'calc(0.18 + var(--nearness, 0) * 0.82)',
            transform: 'scale(calc(1 + var(--nearness, 0) * 0.9))',
            /*
             * An unlit point's halo warms from brand purple toward the soft
             * error red as you close in — the only place red appears on this
             * page, and it means what red always means here: this one has a
             * cost. It is a hover-depth cue only; the point's name, not its
             * hue, is what actually tells you anything.
             */
            boxShadow: isLit
              ? '0 0 18px 2px color-mix(in oklab, var(--reward) 55%, transparent)'
              : '0 0 calc(var(--nearness, 0) * 20px) calc(var(--nearness, 0) * 3px) color-mix(in oklab, color-mix(in oklab, var(--destructive) calc(var(--nearness, 0) * 28%), var(--brand)) calc(var(--nearness, 0) * 60%), transparent)',
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
