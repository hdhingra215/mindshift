import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { RootErrorFallback } from './root-error-fallback'

type ErrorBoundaryProps = {
  children: ReactNode
  fallback?: (reset: () => void) => ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

/**
 * Root error boundary.
 *
 * Catches render/runtime errors in the React tree and shows a recoverable
 * fallback instead of a blank screen. A custom `fallback` render prop may be
 * supplied; otherwise the token-driven RootErrorFallback is used.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Reporting/telemetry is wired in a later step. Log for now so failures
    // are never silent in development.
    console.error('Uncaught error in React tree:', error, info)
  }

  reset = (): void => {
    this.setState({ hasError: false })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback
        ? this.props.fallback(this.reset)
        : <RootErrorFallback onReset={this.reset} />
    }

    return this.props.children
  }
}
