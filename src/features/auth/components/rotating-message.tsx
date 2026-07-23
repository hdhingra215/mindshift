import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

type RotatingMessageProps = {
  messages: readonly string[]
  /** Milliseconds each message stays before rotating. */
  interval?: number
  className?: string
}

/**
 * Cycles through on-brand messages during a wait (InteractionPrinciples §5).
 * The crossfade is purely presentational and is neutralized under
 * prefers-reduced-motion by the global reduced-motion rule. Announced politely
 * so a screen reader hears the current message without being spammed.
 */
export function RotatingMessage({
  messages,
  interval = 2200,
  className,
}: RotatingMessageProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (messages.length <= 1) return
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % messages.length)
    }, interval)
    return () => window.clearInterval(id)
  }, [messages.length, interval])

  return (
    <p
      key={index}
      aria-live="polite"
      className={cn(
        'animate-in fade-in text-sm text-muted-foreground duration-500',
        className,
      )}
    >
      {messages[index]}
    </p>
  )
}
