import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Logo } from '@/components/shared/logo'

type AuthShellProps = {
  title: string
  description: string
  children: ReactNode
  /** Optional footer row (e.g. "New here? Create an account"). */
  footer?: ReactNode
}

/**
 * Shared layout for every auth screen: centered, calm, one focal card.
 * Mobile-first; the card sits full-bleed-comfortable on small screens and
 * centers on larger ones. Subtle entrance only (neutralized under
 * reduced-motion globally).
 */
export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-5">
        <Link
          to="/"
          className="group/logo rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="MindShift home"
        >
          <Logo />
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Home
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        <Card className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
          <CardHeader>
            <CardTitle className="text-xl tracking-tight">{title}</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {children}
            {footer ? (
              <p className="text-center text-sm text-muted-foreground">{footer}</p>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
