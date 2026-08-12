import type { ReactNode } from 'react'

import { FloatingBackground, MouseFollower } from '@/components/motion'
import { WorldCanvas } from '@/components/world'

type AppLayoutProps = {
  children?: ReactNode
}

/**
 * Global layout shell.
 *
 * The outermost structural frame: sets the page canvas (background/foreground
 * tokens, full viewport height) and hosts the main content region.
 *
 * It also mounts the two ambient lighting layers exactly once, behind
 * everything. Mounting them here rather than per-page is what makes the product
 * feel like a continuous lit space you move around in, instead of a set of
 * pages that each stage their own atmosphere — and it means one instance of
 * each effect exists no matter how the router re-renders.
 *
 * Both are decorative by construction: `aria-hidden`, `pointer-events: none`,
 * and absent entirely under reduced motion or without a fine pointer. Removing
 * them changes nothing about what the product communicates.
 */
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="relative min-h-dvh bg-background text-foreground antialiased">
      {/*
       * Order is the depth order. The world's light, structure and camera sit
       * furthest back; the ambient drift layer sits inside it as slow weather;
       * the cursor light rides on top. Everything the player reads is above all
       * three.
       */}
      <WorldCanvas />
      <FloatingBackground intensity={0.32} />
      <MouseFollower />
      <main className="relative min-h-dvh">{children}</main>
    </div>
  )
}
