import type { ReactNode } from 'react'

type AppLayoutProps = {
  children?: ReactNode
}

/**
 * Global layout shell.
 *
 * The outermost structural frame for the app: sets the page canvas
 * (background/foreground tokens, full viewport height) and hosts the main
 * content region. Header, navigation, and footer slots are added alongside
 * routing in a later step. No page content lives here.
 */
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-dvh bg-background text-foreground antialiased">
      <main className="min-h-dvh">{children}</main>
    </div>
  )
}
