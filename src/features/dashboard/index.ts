/**
 * Dashboard feature — the observatory.
 *
 * Not an analytics surface. It is the place the player arrives in: one instrument
 * showing their own mind, with twelve biases in orbit whose distance from the
 * core *is* their mastery. Progress reshapes the scene geometrically, so a
 * returning player sees a different world rather than a bigger number.
 *
 * Read-only with respect to progression. Every value comes from the tables the
 * server owns; this feature computes geometry and nothing else.
 */

export { DashboardScreen } from './components/dashboard-screen'
export { MindObservatory } from './components/mind-observatory'
/*
 * The scene read and its geometry are exported because the Mind Archive
 * (`features/profile`) is the *same instrument seen up close* — it embeds the
 * observatory rather than assembling a second, subtly-different picture of the
 * player's mastery. One read, one geometry, two vantage points.
 */
export { fetchObservatoryScene } from './api/observatory-service'
export { coreIntensity, unlitCount, weakestKnown } from './lib/orbit'
export type {
  ObservatoryAchievement,
  ObservatoryBias,
  ObservatoryLoad,
  ObservatoryScene,
} from './types'
