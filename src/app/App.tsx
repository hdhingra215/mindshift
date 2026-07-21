import { RouterProvider } from '@tanstack/react-router'
import { AppProviders } from './providers/app-providers'
import { ErrorBoundary } from './errors/error-boundary'
import { router } from './router/router'

/**
 * Application root.
 *
 * Composes global infrastructure only: app-level error boundary → providers →
 * router. Routing (layout, pages, pending/error/not-found boundaries) is
 * driven by TanStack Router. No business logic yet.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </ErrorBoundary>
  )
}
