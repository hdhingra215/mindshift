/**
 * Audio system — public API.
 *
 * Import from `@/lib/audio`, never from the files inside it — and in a
 * component, prefer `@/lib/feedback`, which names acts rather than materials.
 *
 *   tokens.ts       the physical palette: resonances, envelopes, ceilings
 *   preferences.ts  the player's mix and haptics switch, persisted
 *   engine.ts       the Web Audio graph, the room, the voices, the limiter
 *   cues.ts         the material catalogue — nine sounds, and no more
 *   ambience.ts     the recorded environment, filtered into rooms
 *   hooks.ts        React lifecycle bindings
 *
 * Full rationale in `docs/architecture/AudioSystem.md`.
 */

export { CEILING, DEFAULT_MIX, PHRASE, RESONANCE, type SampleName } from './tokens'
export {
  SAMPLE_NAMES,
  loadInteractionSamples,
  resetInteractionSampleLoading,
} from './samples'
export {
  getAudioMix,
  isAudible,
  isHapticsEnabled,
  resetAudioMix,
  resolveGains,
  setAudioMix,
  subscribeAudioMix,
  toggleHaptics,
  toggleMuted,
  type AudioMix,
  type ResolvedGains,
} from './preferences'
export {
  autoplayStance,
  isAudioReady,
  isAudioRunning,
  voiceCount,
  type AutoplayStance,
} from './engine'
export { CUES, playCue, resetCueThrottles, type CueName, type PlayOptions } from './cues'
export {
  bedCount,
  resolveBed,
  type BedSettings,
  type SoundEnvironment,
} from './ambience'
export { useAudioMix, useAudioRuntime, useSoundscape } from './hooks'
