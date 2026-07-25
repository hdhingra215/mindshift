import type { ComponentProps, CSSProperties } from 'react'

import { ParticleButton } from '@/components/kokonutui/particle-button'
import { usePressFeedback } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { TONE_VARIABLE, type GlowTone } from './tones'

type ParticleButtonWrapperProps = Omit<ComponentProps<typeof ParticleButton>, 'color'> & {
  /** Semantic light for the burst. Defaults to reward orange. */
  tone?: GlowTone
  /** Also light the button itself while it is pressed. */
  lit?: boolean
  pressScale?: number
}

/**
 * The product-facing reward button.
 *
 * Adds MindShift semantics on top of the KokonutUI particle button: a tone
 * drawn from the accent role map, optional glow, and the physical press beat
 * that every interactive element in the product shares.
 *
 * Reserve it for genuine reward moments — earning XP, a correct catch, a pack
 * completed. Reward scales to significance (InteractionPrinciples §7), and
 * particles on an ordinary button spend attention that buys nothing.
 */
export function ParticleButtonWrapper({
  className,
  tone = 'reward',
  lit = false,
  pressScale = 0.97,
  style,
  onPointerDown,
  ...props
}: ParticleButtonWrapperProps) {
  const playPress = usePressFeedback(pressScale)

  return (
    <ParticleButton
      className={cn(lit && 'glow', className)}
      color={TONE_VARIABLE[tone]}
      onPointerDown={(event) => {
        playPress(event)
        onPointerDown?.(event)
      }}
      style={{ '--glow-color': TONE_VARIABLE[tone], ...style } as CSSProperties}
      {...props}
    />
  )
}
