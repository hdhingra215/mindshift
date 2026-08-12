import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

import { formatMastery } from '@/features/mastery'
import { ANIME_EASE, DURATION, animate, useReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { coreIntensity, placeBiases } from '../lib/orbit'
import type { ObservatoryBias } from '../types'
import { BiasNode } from './bias-node'

/** Seconds for one full revolution of the shared orbit clock. */
const ORBIT_PERIOD_SECONDS = 150
/** Seconds for one core breath. Slow enough to be felt rather than watched. */
const BREATH_SECONDS = 7

type MindObservatoryProps = {
  biases: readonly ObservatoryBias[]
  /**
   * Momentum, 0–1. Changes how the core *breathes* rather than adding anything
   * to the scene: a player on a run finds the instrument working harder.
   */
  momentum?: number
  className?: string
}

/**
 * The hero object: the player's mind, as an instrument you can look into.
 *
 * A core with twelve biases in orbit around it. Distance from the core *is*
 * mastery (see `lib/orbit.ts`), so the scene is not a visualisation of the data —
 * it is the data, arranged. A new player opens a wide dark field with twelve
 * faint points at the rim; months later the same field is tight, warm and busy,
 * and nobody had to tell them they improved.
 *
 * ── Why one object instead of a grid of cards ────────────────────────────────
 * A dashboard of panels asks the player to assemble a picture of themselves from
 * fragments. One object hands them the picture and lets them interrogate it.
 * That is the whole difference between reading a report and standing at an
 * instrument, and it is why everything else on this screen orbits this.
 *
 * ── Cost ────────────────────────────────────────────────────────────────────
 * Two Anime.js animations total, forever: one drives `--orbit-turn`, from which
 * all twelve nodes derive their transforms in CSS; one drives the core's breath.
 * Hovering sets a single piece of React state — the only render in the scene,
 * and only on enter and leave.
 *
 * Rotation is linear, which UI motion normally never is. Orbits are the
 * exception: an eased orbit reads as a machine stuttering, because the thing
 * being modelled genuinely is constant angular motion.
 */
export function MindObservatory({ biases, momentum = 0, className }: MindObservatoryProps) {
  const fieldRef = useRef<HTMLDivElement>(null)
  const coreRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const [activeSlug, setActiveSlug] = useState<string | null>(null)

  const placements = useMemo(() => placeBiases(biases), [biases])
  const intensity = useMemo(() => coreIntensity(biases), [biases])
  const active = placements.find((placement) => placement.bias.slug === activeSlug) ?? null

  // The orbit clock. One animation, twelve dependents.
  useEffect(() => {
    const field = fieldRef.current
    if (!field || reduced) return

    const orbit = animate(field, {
      '--orbit-turn': [0, 360],
      duration: ORBIT_PERIOD_SECONDS * 1000,
      ease: 'linear',
      loop: true,
    })

    return () => {
      orbit.revert()
    }
  }, [reduced])

  /*
   * The core breathes. This is the one piece of idle motion in the product that
   * exists purely to say "this is alive" — and it earns that because the object
   * it animates is the player's own mind.
   *
   * Momentum makes the breath *deeper and slower*, not faster. A quickening pulse
   * would read as anxiety, which is the opposite of what consistent practice
   * should feel like; a fuller, calmer breath reads as an instrument running well.
   * The whole range is 2%–3.2% of scale, so it is felt rather than watched.
   */
  useEffect(() => {
    const core = coreRef.current
    if (!core || reduced) return

    const amplitude = 1.02 + momentum * 0.012
    const breath = animate(core, {
      scale: [1, amplitude, 1],
      duration: (BREATH_SECONDS + momentum * 2.5) * 1000,
      ease: ANIME_EASE.move,
      loop: true,
    })

    return () => {
      breath.revert()
    }
  }, [momentum, reduced])

  // The core leans away from whatever is being attended to, so light shifts
  // across the field as the player explores rather than staying nailed down.
  useEffect(() => {
    const core = coreRef.current
    if (!core || reduced) return

    const lean = animate(core, {
      opacity: active ? 0.55 : 1,
      duration: DURATION.slow,
      ease: ANIME_EASE.move,
    })

    return () => {
      lean.revert()
    }
  }, [active, reduced])

  return (
    <div
      className={cn(
        'relative isolate mx-auto aspect-square w-full max-w-[30rem]',
        // The field radius every node scales against. One value, so the whole
        // orbit is responsive without a resize listener.
        className,
      )}
      ref={fieldRef}
      style={{ '--orbit-radius': 'clamp(7.5rem, 34vw, 13rem)' } as CSSProperties}
    >
      {/* Orbit guides. Faint enough to imply structure, not draw a chart. */}
      {[0.44, 0.72, 1].map((ring) => (
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/25"
          key={ring}
          style={{
            width: `calc(var(--orbit-radius) * ${ring * 2})`,
            height: `calc(var(--orbit-radius) * ${ring * 2})`,
          }}
        />
      ))}

      {/* The core: the player's thinking, burning at the strength they've earned. */}
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 size-20 -translate-x-1/2 -translate-y-1/2 rounded-full"
        ref={coreRef}
      >
        <span
          className="absolute inset-0 rounded-full blur-xl"
          style={{
            background: `radial-gradient(circle, color-mix(in oklab, var(--brand) ${Math.round(
              28 + intensity * 52,
            )}%, transparent), transparent 70%)`,
          }}
        />
        <span
          className="absolute inset-[30%] rounded-full bg-brand"
          style={{ opacity: 0.35 + intensity * 0.5 }}
        />
      </div>

      {placements.map((placement) => (
        <BiasNode
          isActive={placement.bias.slug === activeSlug}
          isDimmed={activeSlug !== null && placement.bias.slug !== activeSlug}
          key={placement.bias.slug}
          onBlur={() => setActiveSlug(null)}
          onFocus={() => setActiveSlug(placement.bias.slug)}
          placement={placement}
        />
      ))}

      {/*
       * The readout sits under the core rather than in a tooltip: attention
       * stays in the middle of the object instead of chasing the cursor to the
       * rim. Polite live region, so a screen reader hears what focus landed on.
       */}
      <div
        aria-live="polite"
        className="pointer-events-none absolute inset-x-0 bottom-0 text-center"
      >
        {active ? (
          <>
            <p className={cn('font-mono text-[10px] tracking-[0.2em] uppercase', active.bias.tier.toneClass)}>
              {active.bias.tier.label} · {formatMastery(active.bias.masteryLevel)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {active.bias.totalAttempts === 0
                ? 'Not yet encountered.'
                : `${active.bias.distinctContexts} ${
                    active.bias.distinctContexts === 1 ? 'context' : 'contexts'
                  } recognised · ${active.bias.categoryName ?? 'Unfiled'}`}
            </p>
          </>
        ) : (
          <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
            Twelve biases · nearer means stronger
          </p>
        )}
      </div>
    </div>
  )
}
