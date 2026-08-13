import { createFileRoute } from '@tanstack/react-router'
import { FeedbackSettings } from '@/components/feedback'
import { PageSkeleton } from '@/components/layout/page-skeleton'

function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Sound is here now. Theme, notifications and data controls follow in a
          later phase.
        </p>
      </div>

      <FeedbackSettings />
    </div>
  )
}

export const Route = createFileRoute('/(app)/settings')({
  pendingComponent: PageSkeleton,
  component: SettingsPage,
})
