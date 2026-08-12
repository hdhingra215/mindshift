import { createFileRoute } from '@tanstack/react-router'

import { PageSkeleton } from '@/components/layout/page-skeleton'
import { MindArchiveScreen } from '@/features/profile'

export const Route = createFileRoute('/(app)/profile')({
  pendingComponent: PageSkeleton,
  component: MindArchiveScreen,
})
