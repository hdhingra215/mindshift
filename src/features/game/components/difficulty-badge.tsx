import { Badge } from '@/components/ui/badge'
import type { Difficulty } from '../types'

const CONFIG: Record<
  Difficulty,
  { label: string; variant: 'success' | 'info' | 'warning' | 'default' }
> = {
  easy: { label: 'Easy', variant: 'success' },
  medium: { label: 'Medium', variant: 'info' },
  hard: { label: 'Hard', variant: 'warning' },
  expert: { label: 'Expert', variant: 'default' },
}

/** Difficulty tag — color + text (never color alone), tuned gentle per tokens. */
export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const { label, variant } = CONFIG[difficulty]
  return <Badge variant={variant}>{label}</Badge>
}
