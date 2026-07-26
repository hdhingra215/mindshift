/**
 * Achievements feature — recognition for learning that actually happened.
 *
 * Owns presentation only. Which achievements exist is content (`achievements`
 * rows and their criteria DSL); whether one is earned is decided by
 * `evaluate_achievements` inside the award transaction. This module renders
 * unlocks it is handed and contains no criteria logic, no thresholds and no
 * eligibility checks — a client that could decide those would be a client that
 * could grant them.
 */

export { AchievementCard } from './components/achievement-card'
export { AchievementHistory } from './components/achievement-history'
export { AchievementToast } from './components/achievement-toast'
export { achievementUnlockSchema } from './lib/achievement-schema'
export { resolveAchievementIcon } from './lib/achievement-icons'
export type { AchievementUnlock } from './types'
