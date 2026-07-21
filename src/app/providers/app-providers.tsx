import type { ReactNode } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from './theme-provider'

type AppProvidersProps = {
  children: ReactNode
}

/**
 * Global provider composition.
 *
 * Single place where app-wide context providers are stacked. Order matters:
 * ThemeProvider is outermost so everything below (including toasts) reads the
 * active theme.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <TooltipProvider>
        {children}
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  )
}
