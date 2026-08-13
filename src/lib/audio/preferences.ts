import { z } from 'zod'

import { CEILING, DEFAULT_MIX } from './tokens'

/**
 * Audio preferences — owned by the player, remembered between sessions.
 *
 * A tiny external store rather than React context, for the same reason the
 * world's warmth is a CSS variable rather than a provider: the audio graph is
 * not a React tree, and re-rendering the app to change a gain would be paying
 * a render to move a number the audio thread reads directly. Components that
 * genuinely display the preference subscribe through `useSyncExternalStore`;
 * the engine subscribes without React at all.
 *
 * Persistence is best-effort by design. A blocked or full `localStorage` must
 * degrade to "sound works this session" — never to a crash on boot.
 */

const STORAGE_KEY = 'mindshift:audio'

export type AudioMix = {
  /** The one control that has to be obvious. Silences everything, instantly. */
  muted: boolean
  /** 0–1 scalars. Scaled by the bus ceilings; these are not raw gains. */
  master: number
  sfx: number
  ambient: number
  /**
   * Haptics live in the same store as the mix, not in one of their own.
   *
   * They are the same *kind* of thing — non-visual feedback the player may not
   * want — and one persisted record means a player who silences the product
   * cannot end up with half their preference remembered.
   */
  haptics: boolean
  /**
   * How strongly haptics are felt, 0–1.
   *
   * A separate control from `haptics` for the same reason the mix has both a
   * mute and three sliders: "off" and "quieter" are different intentions, and
   * collapsing them means a player who wants a lighter touch has to reach for
   * the switch that loses their level.
   */
  hapticIntensity: number
}

const unitInterval = z.number().min(0).max(1)

/**
 * Exported so the suite can prove that a preference written by an earlier
 * version still parses — a schema that silently rejects stored state resets
 * every player's mix on deploy, and nothing in the app would report it.
 */
export const audioMixSchema = z.object({
  muted: z.boolean(),
  master: unitInterval,
  sfx: unitInterval,
  ambient: unitInterval,
  // Defaulted rather than required: a preference written before haptics existed
  // must still parse, or an early player silently loses their whole mix.
  haptics: z.boolean().default(DEFAULT_MIX.haptics),
  hapticIntensity: unitInterval.default(DEFAULT_MIX.hapticIntensity),
})

const listeners = new Set<() => void>()

function read(): AudioMix {
  if (typeof localStorage === 'undefined') return DEFAULT_MIX
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_MIX
    const parsed = audioMixSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : DEFAULT_MIX
  } catch {
    // Unreadable, unparseable or unavailable storage all mean the same thing:
    // this player has no stated preference yet.
    return DEFAULT_MIX
  }
}

function write(mix: AudioMix): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mix))
  } catch {
    // Private mode, quota, or a locked-down browser. The preference still holds
    // for this session; only its memory is lost.
  }
}

/**
 * Hydrated at import, before the first render, so no surface ever paints a
 * speaker icon in the wrong state and then corrects itself.
 */
let current: AudioMix = read()

export function getAudioMix(): AudioMix {
  return current
}

export function subscribeAudioMix(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Change one or more values. Persists, then notifies — so a subscriber reading
 * the store during its own notification always sees the committed state.
 */
export function setAudioMix(patch: Partial<AudioMix>): AudioMix {
  const next = audioMixSchema.parse({ ...current, ...patch })
  current = next
  write(next)
  for (const listener of listeners) listener()
  return next
}

export function toggleMuted(): AudioMix {
  return setAudioMix({ muted: !current.muted })
}

export function toggleHaptics(): AudioMix {
  return setAudioMix({ haptics: !current.haptics })
}

export type ResolvedGains = {
  master: number
  sfx: number
  ambient: number
}

/**
 * Preferences → actual bus gains.
 *
 * Pure, and the only place preference scalars meet the ceilings. Mute is applied
 * here rather than by disconnecting the graph: a muted player who unmutes should
 * hear the room they were already in, not a cold start.
 */
export function resolveGains(mix: AudioMix): ResolvedGains {
  if (mix.muted) return { master: 0, sfx: 0, ambient: 0 }
  return {
    master: mix.master * CEILING.master,
    sfx: mix.sfx * CEILING.sfx,
    ambient: mix.ambient * CEILING.ambient,
  }
}

/** Whether anything would actually be heard. Lets callers skip work entirely. */
export function isAudible(mix: AudioMix): boolean {
  return !mix.muted && mix.master > 0
}

/**
 * Whether haptics may fire.
 *
 * Mute outranks the haptics switch on purpose: "silence this thing" is what a
 * player means by the mute button, and a device that keeps buzzing after it has
 * been silenced has ignored them.
 */
export function isHapticsEnabled(mix: AudioMix): boolean {
  return mix.haptics && !mix.muted && mix.hapticIntensity > 0
}

/** Reset every preference to the shipped defaults. */
export function resetAudioMix(): AudioMix {
  return setAudioMix(DEFAULT_MIX)
}
