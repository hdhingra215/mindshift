import { type ComponentProps } from 'react'

import { Button } from '@/components/ui/button'
import { usePressFeedback } from '@/lib/motion'
import { cn } from '@/lib/utils'

type AnimatedButtonProps = ComponentProps<typeof Button> & {
  /** How far the button compresses on press. Keep it subtle. */
  pressScale?: number
}

/**
 * The base interactive button: everything the design-system Button does, plus
 * the physical press beat.
 *
 * "Pressed" is the single most important game-feel micro-interaction in the
 * product (InteractionPrinciples §3) — the tap must land before anything else
 * happens, or the interface feels dead no matter how fast it actually is.
 *
 * The beat runs through the Web Animations API on the element itself, so it
 * costs no React render and cannot leak: the animation is owned by the node and
 * dies with it. Under reduced motion the press is silent — the focus ring and
 * the resulting state change already confirm it.
 */
export function AnimatedButton({
  className,
  pressScale = 0.97,
  onPointerDown,
  ...props
}: AnimatedButtonProps) {
  const playPress = usePressFeedback(pressScale)

  return (
    <Button
      className={cn('cursor-pointer', className)}
      onPointerDown={(event) => {
        playPress(event)
        onPointerDown?.(event)
      }}
      {...props}
    />
  )
}
