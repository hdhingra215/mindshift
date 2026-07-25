/**
 * Particle Button — adapted from KokonutUI (MIT).
 * Source: https://kokonutui.com · @dorianbaffier
 *
 * ── Migration notes ──────────────────────────────────────────────────────────
 * The upstream component is a Next.js/Motion component. Three things changed:
 *
 *  1. Particles are drawn by Anime.js via `particleBurst`, not by Motion.
 *     Anime.js is MindShift's primary engine and owns particles; keeping the
 *     Motion implementation would have meant two particle systems.
 *  2. Colours come from design tokens instead of `bg-black dark:bg-white`, and
 *     the hardcoded trailing cursor icon is gone — the caller decides content.
 *  3. Upstream dropped the incoming `onClick` and typed against a `ButtonProps`
 *     export that no longer exists; both are fixed, and the burst is torn down
 *     on unmount so particles can't outlive the button.
 */

import { useCallback, useEffect, useRef, type ComponentProps, type MouseEvent } from 'react'

import { Button } from '@/components/ui/button'
import { particleBurst, type ParticleBurstOptions } from '@/lib/motion'
import { cn } from '@/lib/utils'

export type ParticleButtonProps = ComponentProps<typeof Button> &
  Pick<ParticleBurstOptions, 'count' | 'spread' | 'color'>

/**
 * A button that emits a short particle burst when pressed.
 *
 * The unstyled layer: it knows how to throw particles, not what they mean. For
 * product use prefer `ParticleButtonWrapper` from `@/components/motion`, which
 * adds the reward-tone semantics and press feedback on top of this.
 *
 * Silent under reduced motion — `particleBurst` returns a no-op there.
 */
export function ParticleButton({
  className,
  count,
  spread,
  color,
  onClick,
  ...props
}: ParticleButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const teardownRef = useRef<(() => void) | null>(null)

  useEffect(() => () => teardownRef.current?.(), [])

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const element = ref.current
      if (element) {
        // Replace any in-flight burst rather than stacking layers.
        teardownRef.current?.()
        teardownRef.current = particleBurst(element, {
          ...(count !== undefined ? { count } : {}),
          ...(spread !== undefined ? { spread } : {}),
          ...(color !== undefined ? { color } : {}),
        })
      }
      onClick?.(event)
    },
    [color, count, onClick, spread]
  )

  return (
    <Button className={cn('relative cursor-pointer', className)} onClick={handleClick} ref={ref} {...props} />
  )
}

export default ParticleButton
