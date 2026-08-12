import { createFileRoute } from '@tanstack/react-router'

import { PageSkeleton } from '@/components/layout/page-skeleton'
import { DashboardScreen } from '@/features/dashboard'

export const Route = createFileRoute('/(app)/dashboard')({
  pendingComponent: PageSkeleton,
  component: DashboardScreen,
})
