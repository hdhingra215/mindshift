import { AppProviders } from './providers/app-providers'
import { ErrorBoundary } from './errors/error-boundary'
import { AuthProvider } from '@/features/auth'
import { AppRouter } from './router/app-router'

/**
 * Application root.
 *
 * Composes global infrastructure: app-level error boundary → providers →
 * auth → router. AuthProvider sits above the router so route guards can read
 * session state; AppRouter gates the router on session restore.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </AppProviders>
    </ErrorBoundary>
  )
}
