import { createFileRoute } from '@tanstack/react-router'
import { PageSkeleton } from '@/components/layout/page-skeleton'

function SettingsPage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
        Settings
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        Preferences, theme, notifications, and data controls will live here.
        Coming in a later phase.
      </p>
    </div>
  )
}

export const Route = createFileRoute('/(app)/settings')({
  pendingComponent: PageSkeleton,
  component: SettingsPage,
})
