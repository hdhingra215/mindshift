import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

import { signal } from '@/lib/feedback'
import { ANIME_EASE, DURATION, TRAVEL, animate, prefersReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { AchievementCard } from './achievement-card'
import type { AchievementUnlock } from '../types'

/** How long one unlock holds the corner before the next in the queue arrives. */
const HOLD_MS = 6000

type AchievementToastProps = {
  /**
   * Unlocks waiting to be shown, oldest first. Only the first is rendered —
   * two celebratory moments never fire at once (InteractionPrinciples §2), so
   * they queue and resolve in sequence.
   */
  queue: readonly AchievementUnlock[]
  /** Advance the queue: called on timeout, on dismiss, or on Escape. */
  onDismiss: () => void
  className?: string
}

/**
 * The unlock reveal.
 *
 * Deliberately *not* a modal. It settles into the corner while the player keeps
 * reading the explanation, never steals focus, never covers the content, and
 * never has to be acknowledged before play continues — blocking the player with
 * a celebration they cannot dismiss is explicitly forbidden
 * (InteractionPrinciples §13).
 *
 * Anime.js drives a single entrance: a short rise and fade, `motion-celebrate`
 * because a milestone has earned it, and nothing after that. No confetti, no
 * pulse, no bounce.
 *
 * Accessibility. The card is a polite live region, so a screen reader hears the
 * achievement and its meaning without focus moving mid-read. Escape dismisses
 * it, the close button is a real focusable control with a label, and the whole
 * thing is redundant — the same unlock is listed again in the session summary,
 * so nothing is lost by missing it.
 */
export function AchievementToast({ queue, onDismiss, className }: AchievementToastProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const current = queue[0] ?? null

  // Entrance, re-run per achievement so each one in the queue arrives.
  useEffect(() => {
    const node = cardRef.current
    if (!node || !current) return

    /*
     * The bell, once per unlock — announced by the reveal itself rather than by
     * the award, so a queued second achievement sounds when it actually
     * appears. It survives reduced motion: the sound is not the animation, and
     * a milestone the player earned should still be marked.
     */
    signal('reward.achievement')

    if (prefersReducedMotion()) {
      // Present, immediately, with no travel. The reveal never depended on it.
      node.style.opacity = '1'
      node.style.transform = 'none'
      return
    }

    const animation = animate(node, {
      opacity: [0, 1],
      translateY: [TRAVEL.lg, 0],
      duration: DURATION.celebrate,
      ease: ANIME_EASE.enter,
    })

    return () => {
      animation.revert()
    }
  }, [current])

  // Auto-advance. The queue moves on its own so the player never has to manage
  // a stack of notifications they did not ask for.
  useEffect(() => {
    if (!current) return
    const timer = window.setTimeout(onDismiss, HOLD_MS)
    return () => window.clearTimeout(timer)
  }, [current, onDismiss])

  useEffect(() => {
    if (!current) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [current, onDismiss])

  if (!current) return null

  return (
    <div
      aria-live="polite"
      className={cn(
        // Above the mobile bottom nav on small screens, out of the way on large.
        'pointer-events-none fixed inset-x-4 bottom-20 z-[var(--z-toast)] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[22rem]',
        className,
      )}
      role="status"
    >
      <div className="pointer-events-auto relative" ref={cardRef} style={{ opacity: 0 }}>
        <AchievementCard achievement={current} variant="reveal" />

        <button
          aria-label={`Dismiss ${current.name}`}
          className={cn(
            'absolute top-2 right-2 flex size-7 cursor-pointer items-center justify-center rounded-full',
            'text-muted-foreground transition-colors duration-[var(--motion-fast)]',
            'hover:bg-accent hover:text-foreground',
            'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
          )}
          onClick={onDismiss}
          type="button"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>

        {queue.length > 1 ? (
          <p className="absolute -top-6 right-0 text-[11px] text-muted-foreground">
            {queue.length - 1} more to come
          </p>
        ) : null}
      </div>
    </div>
  )
}
