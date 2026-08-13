import { useEffect, useRef, useSyncExternalStore } from 'react'

import {
  bindAmbience,
  popSoundscape,
  pushSoundscape,
  updateSoundscape,
  type SoundEnvironment,
} from './ambience'
import { armAudio } from './engine'
import { getAudioMix, subscribeAudioMix, type AudioMix } from './preferences'
import { DEFAULT_MIX } from './tokens'

/**
 * React bindings for the audio system.
 *
 * Same division of labour as the motion hooks: React owns structure and
 * lifecycle, the engine owns everything that makes a sound. Nothing in this
 * file re-renders on anything an audio thread does.
 */

/**
 * Start the audio system. Mounted **once**, in the app shell, next to the
 * ambient motion layers — for the same reason (§12.19): one instance of the
 * world, however the router re-renders.
 *
 * Nothing is constructed here. This only arms the listeners that will build the
 * graph on the player's first interaction.
 */
export function useAudioRuntime(): void {
  useEffect(() => {
    const disarm = armAudio()
    const unbind = bindAmbience()
    return () => {
      unbind()
      disarm()
    }
  }, [])
}

/** The player's audio preferences, as state. */
export function useAudioMix(): AudioMix {
  return useSyncExternalStore(subscribeAudioMix, getAudioMix, () => DEFAULT_MIX)
}

/**
 * Declare the room this screen is in, for as long as it is mounted.
 *
 * The audio counterpart to `useWorldWarmth`, and deliberately the same shape: a
 * screen states what is true about the environment and the system reflects it.
 * The most recent declaration wins, so a transient surface can take the room
 * and hand it back on unmount.
 *
 * `momentum` is the same 0–1 scalar the world's light already reads. Pass null
 * when it is not yet known — the room simply stays at its resting tuning rather
 * than resolving and then un-resolving as data arrives.
 */
export function useSoundscape(
  environment: SoundEnvironment | null,
  momentum: number | null = null,
): void {
  const idRef = useRef<number | null>(null)

  /*
   * `null` means *make no claim on the room* — distinct from `'silent'`, which
   * claims it and asks for quiet. A surface that is mounted but not currently
   * relevant (the Twin chamber scrolled off screen) must withdraw rather than
   * silence the room the page underneath it declared.
   */
  useEffect(() => {
    if (environment === null) {
      if (idRef.current !== null) {
        popSoundscape(idRef.current)
        idRef.current = null
      }
      return
    }

    if (idRef.current === null) {
      idRef.current = pushSoundscape(environment, momentum)
      return
    }

    // Retunes rather than rebuilding, so moving from momentum 0.2 to 0.3 does
    // not restart the bed.
    updateSoundscape(idRef.current, environment, momentum)
  }, [environment, momentum])

  // Withdraw on unmount, whatever the last declaration was.
  useEffect(() => {
    return () => {
      if (idRef.current !== null) {
        popSoundscape(idRef.current)
        idRef.current = null
      }
    }
  }, [])
}
