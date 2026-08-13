/**
 * Haptics — public API.
 *
 * Import from `@/lib/haptics`, and in practice do not import it at all:
 * components speak to `@/lib/feedback`, which decides what a moment is made of.
 * This module exists so that `navigator.vibrate` appears exactly once in the
 * codebase.
 *
 *   patterns.ts  the physical vocabulary — short, rare, structured
 *   engine.ts    support detection, the preference gates, the anti-buzz floor
 */

export {
  MAX_MOTOR_MS,
  MAX_PULSE_MS,
  MIN_PERCEPTIBLE_MS,
  PATTERNS,
  WEIGHT,
  isDecisive,
  motorTime,
  pulses,
  type HapticPattern,
} from './patterns'
export {
  hapticBackend,
  hapticsSupported,
  resetHapticThrottles,
  vibrate,
  type HapticBackend,
  type VibrateOptions,
} from './engine'
