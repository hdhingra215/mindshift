/**
 * Feedback — the semantic layer, and the only feedback API components use.
 *
 * Three layers, each with one job:
 *
 *   `@/lib/audio`     materials — what things are made of
 *   `@/lib/haptics`   patterns  — what things feel like
 *   `@/lib/feedback`  moments   — which acts in MindShift are worth marking
 *
 * A component imports **this** and nothing below it. It names an act
 * (`signal('answer.commit')`) and never a sound, a vibration, a gain or a
 * throttle. That is what keeps the design changeable: the last redesign
 * replaced every sound in the product and every call site stayed as it was.
 *
 *   moments.ts  the table — act → material + pattern
 *   signal.ts   firing them, including the scroll-scrub detents
 *
 * Rationale in `docs/architecture/AudioSystem.md`.
 */

export { MOMENTS, type Moment, type MomentName } from './moments'
export {
  createScrubber,
  resetSignalThrottles,
  signal,
  useSignalOnMount,
  type SignalOptions,
} from './signal'

// Re-exported so a surface needs one import to declare its room and mark its
// moments — the two things a screen actually does with this system.
export { PHRASE, useAudioMix, useAudioRuntime, useSoundscape } from '@/lib/audio'
