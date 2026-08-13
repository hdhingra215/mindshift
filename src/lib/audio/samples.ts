import dropUrl from '@/assets/sounds/soundcn-drop-003.mp3?url'
import reelUrl from '@/assets/sounds/soundcn-fish-reel-in.mp3?url'
import switchUrl from '@/assets/sounds/soundcn-switch-001.mp3?url'

import { getSample, loadSample, onAudioReady, setSampleBuffer } from './engine'
import type { SampleName } from './tokens'

/**
 * The recorded interaction materials.
 *
 * ── Where they came from ────────────────────────────────────────────────────
 * Three Soundcn registry items (`@soundcn/switch-001`, `@soundcn/drop-003`,
 * `@soundcn/fish-reel-in`) — Kenney's CC0 UI library. Soundcn ships each sound
 * as a base64 data URI *plus its own `lib/sound-engine.ts` with its own
 * `AudioContext`*, and a `useSound` hook that plays straight to
 * `ctx.destination`. Installing that would have given the product a second
 * audio graph — outside the mixer, outside the room, outside mute, and outside
 * the limiter. Four regressions in one command.
 *
 * So the **asset** was taken and the **engine was not**: each data URI is
 * decoded into `assets/sounds/soundcn-*.mp3` (provenance in that directory's
 * LICENSE.md) and plays as a `sample` layer of an ordinary cue, through the
 * same sfx bus, room send and limiter as every synthesised material. Files
 * rather than inlined base64 so they stay out of the JS bundle, exactly as the
 * ambience recording does.
 *
 * ── Loading ─────────────────────────────────────────────────────────────────
 * All three are decoded as soon as the graph exists — 23 kB in total, once per
 * session. A cue whose sample has not finished decoding plays its synthesised
 * layers and skips the recording rather than arriving late: an interaction
 * sound that lands after the interaction is noise.
 */

const SOURCES: Record<SampleName, string> = {
  switch: switchUrl,
  drop: dropUrl,
  reel: reelUrl,
}

export const SAMPLE_NAMES = Object.keys(SOURCES) as SampleName[]

let loading = false

/**
 * Decode all three into the graph's context. Idempotent, and safe to lose: a
 * sample that fails to load leaves a product that still sounds like itself,
 * because every cue using one also has synthesised layers.
 */
export async function loadInteractionSamples(): Promise<void> {
  if (loading) return
  loading = true

  await Promise.all(
    SAMPLE_NAMES.map(async (name) => {
      if (getSample(name)) return
      const buffer = await loadSample(SOURCES[name])
      if (buffer) setSampleBuffer(name, buffer)
    }),
  )

  loading = false
}

/** Test seam: allow a suite to assert the load path more than once. */
export function resetInteractionSampleLoading(): void {
  loading = false
}

// Registered at import, so the recordings are ready before the first click that
// needs one. `onAudioReady` fires immediately if the graph already exists.
onAudioReady(() => {
  void loadInteractionSamples()
})
