import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@/features/auth'
import { PageSkeleton } from '@/components/layout/page-skeleton'
import { toUserIdentity } from '@/components/layout/user-identity'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

function ProfilePage() {
  const { user } = useAuth()
  const identity = toUserIdentity(user)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Avatar className="size-14">
          {identity.avatarUrl ? <AvatarImage src={identity.avatarUrl} alt="" /> : null}
          <AvatarFallback className="text-base">{identity.initials}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate font-heading text-2xl font-semibold tracking-tight text-foreground">
            {identity.displayName}
          </h1>
          <p className="truncate text-sm text-muted-foreground">{identity.email}</p>
        </div>
      </div>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        Your growth story — mastery, achievements, and stats — will live here.
        Coming in a later phase.
      </p>
    </div>
  )
}

export const Route = createFileRoute('/(app)/profile')({
  pendingComponent: PageSkeleton,
  component: ProfilePage,
})
