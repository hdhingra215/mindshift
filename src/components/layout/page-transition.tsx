import type { ReactNode } from 'react'
import { useRouterState } from '@tanstack/react-router'

import { PageTransition as PageTransitionPrimitive } from '@/components/motion'

/**
 * Route-aware page transition for the authenticated shell.
 *
 * Thin binding only: it reads the current pathname from the router and hands it
 * to the shared motion primitive, which owns the actual animation. Keeping the
 * behaviour in the primitive means the marketing pages, the auth shell and this
 * shell all transition identically.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return <PageTransitionPrimitive transitionKey={pathname}>{children}</PageTransitionPrimitive>
}
