/**
 * Mastery feature — the game's primary progression signal.
 *
 * Owns the tier ladder, the presentation helpers and the meter. It deliberately
 * owns **no calculation**: mastery is computed server-side by the XP/mastery
 * pipeline and arrives with every award, so this module interprets values it is
 * given and never derives one.
 *
 * Depends on nothing but the design tokens and the motion system, so the
 * dashboard, the profile and a future bias codex can all consume it without
 * touching gameplay.
 */

export { MASTERY_MAX, MASTERY_TIERS } from './constants'
export { MasteryMeter } from './components/mastery-meter'
export { MasteryReveal } from './components/mastery-reveal'
export {
  describeNoGain,
  formatMastery,
  formatMasteryDelta,
  getMasteryProgress,
  getMasteryTier,
  hasTierChanged,
  type MasteryProgress,
} from './lib/mastery'
export { masteryAwardSchema } from './lib/mastery-schema'
export type { MasteryAward, MasteryTier, MasteryTierId } from './types'
