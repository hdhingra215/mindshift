import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth'
import { PageSkeleton } from '@/components/layout/page-skeleton'
import { toUserIdentity } from '@/components/layout/user-identity'

function timeGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Morning'
  if (hour < 18) return 'Afternoon'
  return 'Evening'
}

function DashboardPage() {
  const { user } = useAuth()
  const { displayName } = toUserIdentity(user)

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-primary">{timeGreeting()}.</p>
      <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
        Welcome back, {displayName}.
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        Ready to catch your brain in the act? Play a scenario and train the reflex.
      </p>
      <div className="pt-2">
        <Button asChild size="lg">
          <Link to="/play">
            Start playing
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/(app)/dashboard')({
  pendingComponent: PageSkeleton,
  component: DashboardPage,
})
