import { createFileRoute } from '@tanstack/react-router'
import { PageSkeleton } from '@/components/layout/page-skeleton'
import { GameScreen } from '@/features/game'

export const Route = createFileRoute('/(app)/play')({
  // The route's own chunk has to arrive before the game's loading state can
  // render, and this was the only authenticated route without a stand-in for
  // that gap — so entering play flashed an empty shell.
  pendingComponent: PageSkeleton,
  component: GameScreen,
})
