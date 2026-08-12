import type { ElementType, ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * How far from the camera this content sits.
 *
 * `far` lags behind the cursor, `near` leads it, `mid` sits between. Content the
 * player reads should almost always be `mid` or unplaced — text that swims is
 * text that is harder to read, and depth is here to build a space, not to prove
 * it can move.
 */
export type WorldDepth = 'far' | 'mid' | 'near'

const DEPTH_CLASS: Record<WorldDepth, string> = {
  far: 'world-plane-far',
  mid: 'world-plane-mid',
  near: 'world-plane-near',
}

type DepthPlaneProps = {
  children: ReactNode
  depth?: WorldDepth
  as?: ElementType
  className?: string
}

/**
 * Places its children at a distance in the world.
 *
 * Pure CSS: it reads the camera variables `WorldCanvas` publishes and applies
 * its own depth multiplier. No subscription, no hook, no render on movement —
 * which is why a screen can afford several of these.
 *
 * Structural only. It never changes what its children are or say, so removing
 * every plane in the product would flatten the space and lose nothing else.
 */
export function DepthPlane({
  children,
  depth = 'mid',
  as: Tag = 'div',
  className,
}: DepthPlaneProps) {
  return (
    <Tag className={cn('world-plane', DEPTH_CLASS[depth], className)}>{children}</Tag>
  )
}
