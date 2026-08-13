import { useEffect, useRef, type ReactNode } from 'react'
import { useRouterState } from '@tanstack/react-router'

import { PageTransition as PageTransitionPrimitive } from '@/components/motion'
import { signal } from '@/lib/feedback'

/**
 * Route-aware page transition for the authenticated shell.
 *
 * Thin binding only: it reads the current pathname from the router and hands it
 * to the shared motion primitive, which owns the actual animation. Keeping the
 * behaviour in the primitive means the marketing pages, the auth shell and this
 * shell all transition identically.
 *
 * Navigation makes **no sound** of its own. It used to, and it was the clearest
 * example of marking traversal rather than consequence — every room already
 * declares a different bed, so moving between them retunes the environment,
 * and *that* is the feedback. A whoosh on top would be a second announcement
 * of something the player can already hear.
 *
 * It is, however, worth *feeling*. A room change is a real event, and a light
 * double on a device that can express it costs nothing in a quiet space. Bound
 * to the pathname rather than to the nav components, so a link, a redirect, a
 * menu item and the browser's back button all behave identically.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const previous = useRef(pathname)

  useEffect(() => {
    // Not on first paint: arriving somewhere is a move, opening the app is not.
    if (previous.current === pathname) return
    previous.current = pathname
    signal('route.change')
  }, [pathname])

  return <PageTransitionPrimitive transitionKey={pathname}>{children}</PageTransitionPrimitive>
}
