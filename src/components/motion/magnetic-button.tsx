import { useRef, type ComponentProps } from 'react'

import { useMagnetic, type MagneticOptions } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { AnimatedButton } from './animated-button'

type MagneticButtonProps = ComponentProps<typeof AnimatedButton> & MagneticOptions

/**
 * A button that leans toward an approaching cursor.
 *
 * Reserved for the single most important action on a screen — a magnet on every
 * button is a fidgeting interface, and InteractionPrinciples §2 gives ambient
 * motion the lowest spending priority. Used sparingly it does real work: it
 * makes the primary action feel physically eager and slightly easier to hit.
 *
 * The pull is a composited transform written inside the shared pointer loop, so
 * it costs no re-render, and it is inert on touch devices and under reduced
 * motion — where the button is simply an ordinary, fully functional button.
 */
export function MagneticButton({
  className,
  strength,
  radius,
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  useMagnetic(ref, { strength, radius })

  return <AnimatedButton className={cn(className)} ref={ref} {...props} />
}
