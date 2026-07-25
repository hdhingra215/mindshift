import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

import { AnimatedButton } from '@/components/motion'
import { Logo } from '@/components/shared/logo'
import { cn } from '@/lib/utils'

type LandingHeaderProps = {
  isAuthed: boolean
  className?: string
}

/**
 * Page chrome.
 *
 * Deliberately minimal and glass rather than solid: the ambient light field
 * behind it should keep showing through, so the header reads as part of the
 * world rather than a bar bolted on top of it. No nav links — there is one
 * story here and it runs downward.
 */
export function LandingHeader({ isAuthed, className }: LandingHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-[var(--z-sticky)] border-b border-border/60',
        'bg-background/70 backdrop-blur-md',
        className
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link className="group/logo rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" to="/">
          <Logo className="text-lg" />
        </Link>

        <nav aria-label="Account" className="flex items-center gap-1.5">
          {isAuthed ? (
            <AnimatedButton asChild size="lg">
              <Link to="/dashboard">
                Continue
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </AnimatedButton>
          ) : (
            <>
              <AnimatedButton asChild size="lg" variant="ghost">
                <Link to="/auth/login">Log in</Link>
              </AnimatedButton>
              <AnimatedButton asChild size="lg">
                <Link to="/auth/signup">Start training</Link>
              </AnimatedButton>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
