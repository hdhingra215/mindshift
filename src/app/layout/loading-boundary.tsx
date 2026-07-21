import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { RootLoading } from './root-loading'

type LoadingBoundaryProps = {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Suspense-based loading boundary. Wraps lazily-loaded / suspending subtrees
 * (routes, data) added in later steps. Defaults to the full-screen
 * RootLoading fallback.
 */
export function LoadingBoundary({ children, fallback }: LoadingBoundaryProps) {
  return <Suspense fallback={fallback ?? <RootLoading />}>{children}</Suspense>
}
