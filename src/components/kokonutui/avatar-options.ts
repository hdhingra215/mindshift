import type { GlowTone } from '@/components/motion/tones'

/**
 * The avatar set.
 *
 * Each avatar is a palette tone plus a geometric "shift" mark — the brand's
 * pivot-of-insight concept, per the Brand Guidelines' abstract, non-cartoonish
 * illustration direction. Adding an avatar means adding a row here; the picker
 * needs no change.
 */
export type AvatarOption = {
  id: string
  label: string
  tone: GlowTone
  /** Rotation of the mark, in degrees. Cheap variety without extra art. */
  rotation: number
}

export const AVATAR_OPTIONS: readonly AvatarOption[] = [
  { id: 'pivot', label: 'Pivot', tone: 'brand', rotation: 0 },
  { id: 'spark', label: 'Spark', tone: 'reward', rotation: 45 },
  { id: 'signal', label: 'Signal', tone: 'success', rotation: 90 },
  { id: 'beacon', label: 'Beacon', tone: 'warning', rotation: 135 },
  { id: 'edge', label: 'Edge', tone: 'destructive', rotation: 180 },
]
