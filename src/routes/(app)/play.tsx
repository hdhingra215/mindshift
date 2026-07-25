import { createFileRoute } from '@tanstack/react-router'
import { GameScreen } from '@/features/game'

export const Route = createFileRoute('/(app)/play')({
  component: GameScreen,
})
